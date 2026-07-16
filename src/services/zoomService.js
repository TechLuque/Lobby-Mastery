import { auth } from "../config/firebase";

const ZOOM_API_URL = '/api/zoom';

export const getZoomMeetingLink = async (sala) => {
  try {
    const salasValidas = ["codigo", "maquina", "maestria"];
    if (!sala || !salasValidas.includes(sala)) {
      return {
        success: false,
        error: `Sala inválida. Debe ser: ${salasValidas.join(", ")}`,
      };
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: "No hay sesión activa. Inicia sesión nuevamente.",
      };
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(ZOOM_API_URL, {
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
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (!data.joinUrl) {
      return { success: false, error: "No se recibió URL de reunión" };
    }

    return { success: true, joinUrl: data.joinUrl };
  } catch (error) {
    console.error("Error en getZoomMeetingLink:", error);
    return { success: false, error: `Error al conectar: ${error.message}` };
  }
};

export const joinZoomMeeting = async (sala, salaName, meetingWindow) => {
  try {
    console.log(`Iniciando unión a Zoom: ${salaName}`);

    const result = await getZoomMeetingLink(sala);

    if (!result.success) {
      console.error("Error al obtener URL:", result.error);
      if (meetingWindow && !meetingWindow.closed) {
        meetingWindow.close();
      }
      return {
        success: false,
        error: result.error || "No se pudo generar la URL de reunión",
      };
    }

    // Reutiliza la ventana abierta de forma síncrona en el click (evita el
    // bloqueo de pop-ups de navegadores móviles ante window.open tras un await)
    if (meetingWindow && !meetingWindow.closed) {
      meetingWindow.location.href = result.joinUrl;
    } else {
      window.open(result.joinUrl, `zoom_${sala}`, "width=1200,height=800");
    }

    return { success: true };
  } catch (error) {
    console.error("Error en joinZoomMeeting:", error);
    if (meetingWindow && !meetingWindow.closed) {
      meetingWindow.close();
    }
    return {
      success: false,
      error: error.message || "Error al abrir la reunión",
    };
  }
};
