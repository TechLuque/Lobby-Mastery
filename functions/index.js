import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import fetch from "node-fetch";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/* =========================
   CONFIGURACIÓN ZOOM
   Variables cargadas desde functions/.env
========================= */

const ZOOM = {
  ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
  CLIENT_ID: process.env.ZOOM_CLIENT_ID,
  CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
};

/* =========================
   MEETING IDs
   Se leen dinámicamente desde Firestore (config/zoom)
   para que el admin pueda cambiarlos desde el dashboard.
========================= */

const VALID_SALAS = ["codigo", "maquina", "maestria"];

async function getMeetingId(sala) {
  const configSnap = await db.collection("config").doc("zoom").get();
  if (!configSnap.exists) {
    throw new Error("No existe configuración de Zoom en Firestore (config/zoom)");
  }
  const config = configSnap.data();
  const fieldMap = {
    codigo: "ZOOM_CODIGO_ID",
    maquina: "ZOOM_MAQUINA_ID",
    maestria: "ZOOM_MAESTRIA_ID",
  };
  const meetingId = config[fieldMap[sala]];
  if (!meetingId) {
    throw new Error(`Meeting ID no configurado para sala "${sala}". Configúralo en el panel de admin.`);
  }
  return meetingId;
}

/* =========================
   TOKEN ZOOM (Server-to-Server OAuth)
========================= */

async function getZoomToken() {
  const auth = Buffer.from(
    `${ZOOM.CLIENT_ID}:${ZOOM.CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM.ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  const data = await res.json();

  if (!data.access_token) {
    console.error("Zoom token error:", data);
    throw new Error("No se pudo obtener token de Zoom");
  }

  return data.access_token;
}

/* =========================
   CLOUD FUNCTION v2
   
   Flujo:
   1. Valida Firebase Auth token
   2. Busca al usuario en Firestore "usuarios"
   3. Revisa si ya tiene un join_url guardado para esa sala
   4. Si NO → Registra al usuario en Zoom (POST /registrants)
      → Zoom devuelve un join_url personalizado
      → Se guarda en Firestore campo "zoom_links.{sala}"
   5. Devuelve el join_url al frontend para el botón
========================= */

export const getZoomMeetingLink = onRequest({ cors: ["localhost", "http://localhost:5173", "http://localhost:3000"] }, async (req, res) => {
  // Manejar preflight requests (OPTIONS)
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST, PUT");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  try {
    // Agregar headers CORS a la respuesta
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST, PUT");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    /* -------- VALIDAR AUTH -------- */
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;

    /* -------- VALIDAR REQUEST -------- */
    const { meetingKey } = req.body;

    if (!meetingKey || !VALID_SALAS.includes(meetingKey)) {
      return res.status(400).json({ error: "meetingKey inválido" });
    }

    /* -------- OBTENER MEETING ID DESDE FIRESTORE -------- */
    let meetingId;
    try {
      meetingId = await getMeetingId(meetingKey);
    } catch (configErr) {
      return res.status(500).json({ error: configErr.message });
    }

    /* -------- OBTENER USUARIO desde "usuarios" -------- */
    const snapshot = await db
      .collection("usuarios")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Usuario no encontrado en la base de datos" });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    /* -------- VERIFICAR SI YA TIENE LINK GUARDADO -------- */
    const zoomLinks = user.zoom_links || {};
    const zoomMeetingIds = user.zoom_meeting_ids || {};

    // Solo usar link cacheado si el Meeting ID NO ha cambiado
    if (zoomLinks[meetingKey] && zoomMeetingIds[meetingKey] === meetingId) {
      console.log(`Link existente (mismo Meeting ID) para ${email} en sala ${meetingKey}`);
      return res.json({ joinUrl: zoomLinks[meetingKey] });
    }

    // Si el Meeting ID cambió, limpiar link viejo
    if (zoomLinks[meetingKey] && zoomMeetingIds[meetingKey] !== meetingId) {
      console.log(`Meeting ID cambió para ${meetingKey}: ${zoomMeetingIds[meetingKey]} → ${meetingId}. Regenerando link...`);
    }

    /* -------- REGISTRAR AL USUARIO EN ZOOM -------- */
    const token = await getZoomToken();

    // Separar nombre y apellido. Si solo tiene un nombre, apellido = curso
    const nombreCompleto = user.nombre || "Usuario";
    const partes = nombreCompleto.trim().split(/\s+/);
    const firstName = partes[0];
    const lastName = partes.length > 1
      ? partes.slice(1).join(" ")
      : (user.curso || meetingKey).toUpperCase();

    console.log(`Registrando en Zoom: ${firstName} ${lastName} (${email}) → Meeting ${meetingId}`);

    const regRes = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          first_name: firstName,
          last_name: `${lastName} | ${(user.curso || meetingKey).toUpperCase()}`,
        }),
      }
    );

    const regData = await regRes.json();

    if (!regRes.ok || !regData.join_url) {
      console.error("Zoom registration error:", regData);
      const zoomError = regData.message || "Error al registrar";

      // Si el error es que la reunión no tiene registration habilitado,
      // caemos al plan B: join_url + uname
      if (regData.code === 3000 || regData.code === 300 ||
          (regData.message && regData.message.toLowerCase().includes("registration"))) {
        console.log("Registration no habilitada, usando join_url + uname como fallback");
        return await fallbackWithUname(meetingId, token, user, meetingKey, userDoc, res);
      }

      return res.status(500).json({
        error: `Error de Zoom: ${zoomError}`,
      });
    }

    /* -------- GUARDAR LINK EN FIRESTORE -------- */
    const joinUrl = regData.join_url;

    await userDoc.ref.update({
      [`zoom_links.${meetingKey}`]: joinUrl,
      [`zoom_meeting_ids.${meetingKey}`]: meetingId,
    });

    console.log(`✓ Registrado y link guardado para ${email} en ${meetingKey} (Meeting ID: ${meetingId})`);
    return res.json({ joinUrl });

  } catch (error) {
    console.error("Error en getZoomMeetingLink:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* =========================
   FALLBACK: Si la reunión no tiene Registration habilitada,
   usa el join_url general + parámetro ?uname=
========================= */

async function fallbackWithUname(meetingId, token, user, meetingKey, userDoc, res) {
  const meetingRes = await fetch(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const meetingData = await meetingRes.json();

  if (!meetingData.join_url) {
    return res.status(500).json({
      error: `No se pudo obtener la reunión. Verifica el Meeting ID.`,
    });
  }

  const displayName = `${user.nombre || "Usuario"} | ${(user.curso || meetingKey).toUpperCase()}`;
  const joinUrl = `${meetingData.join_url}${meetingData.join_url.includes("?") ? "&" : "?"}uname=${encodeURIComponent(displayName)}`;

  // Guardar también el fallback link y el Meeting ID usado
  await userDoc.ref.update({
    [`zoom_links.${meetingKey}`]: joinUrl,
    [`zoom_meeting_ids.${meetingKey}`]: meetingId,
  });

  console.log(`✓ Fallback uname link guardado para ${user.nombre} en ${meetingKey} (Meeting ID: ${meetingId})`);
  return res.json({ joinUrl });
}

/* =========================
   FUNCIÓN: Agregar Administradores
   POST /addAdmin
   Body: { adminEmails: ["email1@example.com", "email2@example.com"] }
========================= */
export const addAdmin = onRequest(async (req, res) => {
  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { adminEmails } = req.body;

    if (!adminEmails || !Array.isArray(adminEmails) || adminEmails.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de adminEmails" });
    }

    // Normalizar emails
    const normalizedEmails = adminEmails.map(e => e.toLowerCase().trim());

    // Obtener emails actuales
    const configRef = db.collection("config").doc("admin");
    const configSnap = await configRef.get();
    
    let existingEmails = [];
    if (configSnap.exists) {
      existingEmails = (configSnap.data().adminEmails || []).map(e => e.toLowerCase().trim());
    }

    // Combinar (sin duplicados)
    const allEmails = [...new Set([...existingEmails, ...normalizedEmails])];

    // Actualizar en Firestore
    await configRef.set({ adminEmails: allEmails }, { merge: true });

    console.log("✓ Admins agregados:", normalizedEmails);
    return res.json({ 
      success: true, 
      message: "Admins agregados exitosamente",
      totalAdmins: allEmails.length,
      admins: allEmails
    });
  } catch (error) {
    console.error("Error en addAdmin:", error);
    return res.status(500).json({ error: error.message });
  }
});
