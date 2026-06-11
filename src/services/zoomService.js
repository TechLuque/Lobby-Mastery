import { auth } from "../config/firebase";

/**
 * URL de la Cloud Function v2
 * Configurada mediante variable de entorno VITE_CLOUD_FUNCTION_URL
 * En desarrollo local usa http://localhost:3001/getZoomMeetingLink
 */
const isDev = import.meta.env.DEV;
const CLOUD_FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL || 
  (isDev ? "http://localhost:3001/getZoomMeetingLink" : "https://us-central1-lobby-master-690ed.cloudfunctions.net/getZoomMeetingLink");

if (!import.meta.env.VITE_CLOUD_FUNCTION_URL) {
  console.log(`[Zoom Service] Usando URL: ${CLOUD_FUNCTION_URL}`);
}

/**
 * Obtener URL de reunión Zoom desde Cloud Function v2
 *
 * Flujo:
 * 1. Obtiene token de Firebase Auth del usuario actual
 * 2. Envía request autenticado a la Cloud Function
 * 3. La CF verifica si el usuario ya tiene link guardado en Firestore
 * 4. Si no → registra al usuario en Zoom y guarda el join_url
 * 5. Devuelve join_url personalizado para el botón
 *
 * @param {string} sala - "codigo" | "maquina" | "maestria"
 * @returns {Promise<{success: boolean, joinUrl?: string, error?: string}>}
 */
export const getZoomMeetingLink = async (sala) => {
  try {
    // Validar sala
    const salasValidas = ["codigo", "maquina", "maestria"];
    if (!sala || !salasValidas.includes(sala)) {
      return {
        success: false,
        error: `Sala inválida. Debe ser: ${salasValidas.join(", ")}`,
      };
    }

    // PASO 13: Obtener token de Firebase Auth
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: "No hay sesión activa. Inicia sesión nuevamente.",
      };
    }

    const token = await currentUser.getIdToken();

    // Llamar a la Cloud Function CON header Authorization
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        meetingKey: sala,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Response no es JSON
      }
      console.error("Error en Cloud Function:", errorMessage);
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (!data.joinUrl) {
      return {
        success: false,
        error: "No se recibió URL de reunión",
      };
    }

    console.log(`✓ URL de Zoom generada para sala: ${sala}`);
    return {
      success: true,
      joinUrl: data.joinUrl,
    };
  } catch (error) {
    console.error("Error en getZoomMeetingLink:", error);
    return {
      success: false,
      error: `Error al conectar: ${error.message}`,
    };
  }
};

/**
 * Unirse a reunión Zoom — abre URL en nueva ventana
 *
 * @param {string} sala - "codigo" | "maquina" | "maestria"
 * @param {string} salaName - Nombre descriptivo de la sala (para logs)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const joinZoomMeeting = async (sala, salaName) => {
  try {
    console.log(`Iniciando unión a Zoom: ${salaName}`);

    const result = await getZoomMeetingLink(sala);

    if (!result.success) {
      console.error("Error al obtener URL:", result.error);
      return {
        success: false,
        error: result.error || "No se pudo generar la URL de reunión",
      };
    }

    // Abrir en nueva ventana con el link único personalizado
    window.open(result.joinUrl, `zoom_${sala}`, "width=1200,height=800");

    return { success: true };
  } catch (error) {
    console.error("Error en joinZoomMeeting:", error);
    return {
      success: false,
      error: error.message || "Error al abrir la reunión",
    };
  }
};
