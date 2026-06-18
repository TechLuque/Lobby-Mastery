export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const VALID_SALAS = ['codigo', 'maquina', 'maestria'];
  const { meetingKey } = req.body;

  if (!meetingKey || !VALID_SALAS.includes(meetingKey)) {
    return res.status(400).json({ error: 'meetingKey inválido' });
  }

  // Validar token de Firebase
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  const PROJECT_ID = 'lobby-master-690ed';
  const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  // Verificar token con Firebase Identity Toolkit
  let email;
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const d = await r.json();
    if (!d.users?.[0]?.email) return res.status(401).json({ error: 'Token inválido' });
    email = d.users[0].email;
  } catch {
    return res.status(401).json({ error: 'Error verificando autenticación' });
  }

  // Obtener Meeting ID desde Firestore (config/zoom)
  const FIELD_MAP = {
    codigo: 'ZOOM_CODIGO_ID',
    maquina: 'ZOOM_MAQUINA_ID',
    maestria: 'ZOOM_MAESTRIA_ID',
  };
  let meetingId;
  try {
    const r = await fetch(`${FIRESTORE}/config/zoom`);
    const d = await r.json();
    meetingId = d.fields?.[FIELD_MAP[meetingKey]]?.stringValue;
    if (!meetingId) throw new Error('Meeting ID no configurado');
  } catch {
    return res.status(500).json({
      error: `Meeting ID no configurado para "${meetingKey}". Configúralo en el panel de admin.`,
    });
  }

  // Obtener datos del usuario desde Firestore
  let userName = 'Usuario';
  let userCurso = meetingKey;
  try {
    const r = await fetch(`${FIRESTORE}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'usuarios' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'email' },
              op: 'EQUAL',
              value: { stringValue: email },
            },
          },
          limit: 1,
        },
      }),
    });
    const d = await r.json();
    if (d[0]?.document?.fields) {
      userName = d[0].document.fields.nombre?.stringValue || 'Usuario';
      userCurso = d[0].document.fields.curso?.stringValue || meetingKey;
    }
  } catch {
    // No fatal: se usan valores por defecto
  }

  // Obtener token de Zoom (Server-to-Server OAuth)
  const zoomAuth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  let zoomToken;
  try {
    const r = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      { method: 'POST', headers: { Authorization: `Basic ${zoomAuth}` } }
    );
    const d = await r.json();
    if (!d.access_token) throw new Error('Sin token');
    zoomToken = d.access_token;
  } catch {
    return res.status(500).json({
      error: 'No se pudo conectar con Zoom. Verifica las credenciales en Vercel.',
    });
  }

  // Registrar usuario en Zoom
  const partes = userName.trim().split(/\s+/);
  const firstName = partes[0];
  const lastName =
    partes.length > 1 ? partes.slice(1).join(' ') : userCurso.toUpperCase();

  try {
    const regRes = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${zoomToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: `${lastName} | ${userCurso.toUpperCase()}`,
        }),
      }
    );
    const regData = await regRes.json();

    if (regData.join_url) {
      return res.json({ joinUrl: regData.join_url });
    }

    // Fallback: reunión sin registro habilitado → usar join_url + uname
    if (
      regData.code === 3000 ||
      regData.code === 300 ||
      regData.message?.toLowerCase().includes('registration')
    ) {
      const meetRes = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        { headers: { Authorization: `Bearer ${zoomToken}` } }
      );
      const meetData = await meetRes.json();
      if (!meetData.join_url) {
        return res.status(500).json({
          error: 'No se pudo obtener la reunión. Verifica el Meeting ID.',
        });
      }
      const displayName = `${userName} | ${userCurso.toUpperCase()}`;
      const joinUrl = `${meetData.join_url}${meetData.join_url.includes('?') ? '&' : '?'}uname=${encodeURIComponent(displayName)}`;
      return res.json({ joinUrl });
    }

    return res.status(500).json({
      error: `Error de Zoom: ${regData.message || 'Error al registrar en la reunión'}`,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Error al conectar con Zoom: ' + err.message,
    });
  }
}
