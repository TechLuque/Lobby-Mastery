import { useEffect, useRef, useState } from 'react';
import { getZoomMeetingLink, joinZoomMeeting } from '../services/zoomService';

// Precarga el join_url de Zoom en segundo plano apenas se confirma acceso a
// la sala (no al hacer clic). Los navegadores solo permiten el handoff
// automatico al protocolo zoommtg:// (abrir la app de Zoom sin pantallas
// intermedias) cuando la navegacion ocurre de forma SINCRONA dentro de un
// gesto de click reciente. Si en cambio se espera un fetch (auth + Firestore
// + Zoom) antes de abrir la URL, ese gesto expira y el navegador degrada a
// mostrar la pagina "Haz clic aqui para abrir Zoom" de Zoom. Con la URL ya
// lista de antemano, el click puede abrirla al instante.
export function useZoomJoin(sala, salaName, hasAccess) {
  const [joining, setJoining] = useState(false);
  const [prefetchedUrl, setPrefetchedUrl] = useState(null);
  const prefetchStarted = useRef(false);

  useEffect(() => {
    if (!hasAccess || prefetchStarted.current) return;
    prefetchStarted.current = true;
    getZoomMeetingLink(sala).then((result) => {
      if (result.success) setPrefetchedUrl(result.joinUrl);
    });
  }, [hasAccess, sala]);

  const openMeeting = async () => {
    setJoining(true);

    if (prefetchedUrl) {
      window.open(prefetchedUrl, `zoom_${sala}`, 'width=1200,height=800');
      setJoining(false);
      return { success: true };
    }

    // Aun no llego la URL precargada (usuario hizo clic muy rapido):
    // se recurre al flujo original, que igual funciona pero puede requerir
    // el clic extra de Zoom si el fetch tarda.
    const meetingWindow = window.open('about:blank', `zoom_${sala}`, 'width=1200,height=800');
    const result = await joinZoomMeeting(sala, salaName, meetingWindow);
    setJoining(false);
    return result;
  };

  return { joining, openMeeting };
}
