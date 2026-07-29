import { Buffer } from 'buffer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });

  // Red de seguridad: cualquier excepción no prevista dentro de zoomHandler
  // se convierte en una respuesta JSON 500 en vez de tumbar la función
  // serverless entera (lo que Vercel reporta como FUNCTION_INVOCATION_FAILED,
  // un texto plano que el frontend no puede parsear como error legible).
  try {
    return await zoomHandler(req, res);
  } catch (err) {
    return res.status(500).json({
      error: 'Error inesperado del servidor: ' + (err?.message || String(err)),
    });
  }
}

async function zoomHandler(req, res) {
  const VALID_SALAS = ['codigo', 'maquina', 'maestria'];
  const { meetingKey } = req.body || {};

  if (!meetingKey || !VALID_SALAS.includes(meetingKey)) {
    return res.status(400).json({ error: 'meetingKey invalido' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  const FIREBASE_API_KEY = 'AIzaSyCT9DNf71aplxi5rQaUynCT49WyK2Qt3U0';
  const PROJECT_ID = 'lobby-master-690ed';
  const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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
    if (!d.users?.[0]?.email) return res.status(401).json({ error: 'Token invalido' });
    email = d.users[0].email;
  } catch {
    return res.status(401).json({ error: 'Error verificando autenticacion' });
  }

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
      error: `Meeting ID no configurado para "${meetingKey}". Configuralo en el panel de admin.`,
    });
  }

  let userName = 'Usuario';
  let userCurso = meetingKey;
  let cachedJoinUrl = null;
  let userDocName = null;
  let hasAccess = false;
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
      const fields = d[0].document.fields;
      userDocName = d[0].document.name;
      userName = fields.nombre?.stringValue || 'Usuario';
      userCurso = fields.curso?.stringValue || meetingKey;
      hasAccess = fields[`acceso_${meetingKey}`]?.booleanValue === true;
      const cachedLink = fields.zoom_links?.mapValue?.fields?.[meetingKey]?.stringValue;
      const cachedId = fields.zoom_meeting_ids?.mapValue?.fields?.[meetingKey]?.stringValue;
      if (cachedLink && cachedId === meetingId) {
        cachedJoinUrl = cachedLink;
      }
    }
  } catch {
    // No fatal para nombre/curso, pero hasAccess queda en false (fail-closed)
  }

  // Filtro de seguridad: solo usuarios con acceso otorgado a esta sala
  // pueden registrarse/entrar. Sin esto, cualquier usuario autenticado en la
  // app (aunque no haya comprado esta sala) podría llegar a auto-aprobarse
  // en la reunión, anulando el propósito de la aprobación manual en Zoom.
  if (!hasAccess) {
    return res.status(403).json({ error: 'No tienes acceso a esta sala.' });
  }

  async function cacheJoinUrl(joinUrl) {
    if (!userDocName) return;
    try {
      const patchUrl =
        `https://firestore.googleapis.com/v1/${userDocName}` +
        `?updateMask.fieldPaths=zoom_links.${meetingKey}` +
        `&updateMask.fieldPaths=zoom_meeting_ids.${meetingKey}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            zoom_links: { mapValue: { fields: { [meetingKey]: { stringValue: joinUrl } } } },
            zoom_meeting_ids: { mapValue: { fields: { [meetingKey]: { stringValue: meetingId } } } },
          },
        }),
      });
    } catch {
      // No fatal: si falla el cacheo, el proximo intento volvera a registrar en Zoom
    }
  }

  // El token de Zoom debe obtenerse ANTES de usar findExistingRegistrant()
  // (incluido el chequeo de cachedJoinUrl más abajo, que depende de él).
  // findExistingRegistrant() lee `zoomToken` de este closure; si se llamara
  // antes de que esta asignación se ejecutara, `zoomToken` seguiría en la
  // zona muerta temporal de `let` y lanzaría un ReferenceError no controlado,
  // tumbando toda la función serverless (FUNCTION_INVOCATION_FAILED) — esto
  // pasaba justo para usuarios ya registrados con un joinUrl cacheado.
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
    if (!d.access_token) {
      return res.status(500).json({
        error: `Zoom: ${d.reason || d.message || JSON.stringify(d)}`,
      });
    }
    zoomToken = d.access_token;
  } catch (e) {
    return res.status(500).json({
      error: 'No se pudo conectar con Zoom: ' + e.message,
    });
  }

  if (cachedJoinUrl) {
    const existing = await findExistingRegistrant();
    if (existing?.joinUrl) {
      if (existing.joinUrl !== cachedJoinUrl) {
        await cacheJoinUrl(existing.joinUrl);
      }
      return res.json({ joinUrl: existing.joinUrl });
    }
    // Si la URL cacheada no coincide con el registrant actual, ignorarla
    // y continuar para obtener la URL correcta de Zoom.
  }

  const partes = userName.trim().split(/\s+/);
  const firstName = partes[0];
  const lastName = partes.length > 1 ? partes.slice(1).join(' ') : userCurso.toUpperCase();

  async function findExistingRegistrant() {
    let firstMatch = null;
    for (const status of ['approved', 'pending']) {
      let nextPageToken = '';
      do {
        const url =
          `https://api.zoom.us/v2/meetings/${meetingId}/registrants` +
          `?status=${status}&page_size=300` +
          (nextPageToken ? `&next_page_token=${nextPageToken}` : '');
        const r = await fetch(url, { headers: { Authorization: `Bearer ${zoomToken}` } });
        const d = await r.json();
        if (!r.ok) {
          console.error('[zoom] listado de registrantes fallo', {
            status: r.status,
            body: d,
            meetingId,
            statusFiltro: status,
          });
          break;
        }
        const match = d.registrants?.find(
          (reg) => reg.email?.toLowerCase() === email.toLowerCase()
        );
        if (match) {
          if (match.join_url) return { joinUrl: match.join_url, id: match.id, status };
          if (!firstMatch) firstMatch = { joinUrl: match.join_url, id: match.id, status };
        }
        nextPageToken = d.next_page_token || '';
      } while (nextPageToken);
    }
    return firstMatch;
  }

  // Aprueba automáticamente solo al registrant que nuestra propia app acaba
  // de crear/encontrar para un usuario YA validado (hasAccess === true).
  // Quien se autoregistre directamente en el link público de Zoom sigue
  // quedando "pending" y requiere tu aprobación manual como host.
  async function approveRegistrant(registrantId) {
    try {
      const approveRes = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/registrants/status`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${zoomToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'approve',
            registrants: [{ id: registrantId, email }],
          }),
        }
      );
      if (!approveRes.ok) {
        const body = await approveRes.text().catch(() => '');
        console.error('[zoom] approveRegistrant fallo', {
          status: approveRes.status,
          body,
          meetingId,
          registrantId,
        });
        return false;
      }
      return true;
    } catch (e) {
      console.error('[zoom] approveRegistrant excepcion', e?.message);
      return false;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function ensureRegistrantApprovedJoinUrl(registrantId) {
    await approveRegistrant(registrantId);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const existing = await findExistingRegistrant();
      if (existing?.joinUrl) return existing;
      await delay(500);
    }
    return await findExistingRegistrant();
  }

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

    // Si la reunión no exige aprobación manual, Zoom ya devuelve el
    // join_url en la propia respuesta de registro. Usarlo de inmediato
    // evita depender del sondeo de la lista de registrantes, que puede
    // tardar en reflejar un registro recién creado y provocar el error
    // "No se pudo obtener el join_url... tras aprobar el registrante".
    if (regData.join_url) {
      await cacheJoinUrl(regData.join_url);
      return res.json({ joinUrl: regData.join_url });
    }

    if (regData.registrant_id) {
      const existing = await ensureRegistrantApprovedJoinUrl(regData.registrant_id);
      if (existing?.joinUrl) {
        await cacheJoinUrl(existing.joinUrl);
        return res.json({ joinUrl: existing.joinUrl });
      }
      console.error('[zoom] no se obtuvo joinUrl tras aprobar', {
        meetingId,
        meetingKey,
        email,
        regData,
        existing,
      });
      return res.status(500).json({
        error: 'No se pudo obtener el join_url de Zoom tras aprobar el registrante. Intenta nuevamente en unos segundos.',
        debug: { regData, existing },
      });
    }

    if (
      regData.code === 3000 ||
      regData.code === 300 ||
      regData.message?.toLowerCase().includes('registration') ||
      regData.message?.toLowerCase().includes('registrant') ||
      regData.message?.toLowerCase().includes('rate limit')
    ) {
      // El usuario ya está inscrito (o hubo rate limit): buscar su join_url
      // real de registrant en vez de caer al link genérico, que Zoom rechaza
      // pidiendo inscripción cuando la reunión la exige.
      const existing = await findExistingRegistrant();
      if (existing?.status === 'pending') {
        const approved = await ensureRegistrantApprovedJoinUrl(existing.id);
        if (approved?.joinUrl) {
          await cacheJoinUrl(approved.joinUrl);
          return res.json({ joinUrl: approved.joinUrl });
        }
      }
      if (existing?.joinUrl) {
        await cacheJoinUrl(existing.joinUrl);
        return res.json({ joinUrl: existing.joinUrl });
      }
      return res.status(500).json({
        error: 'No se encontró el join_url de Zoom para este usuario. Intenta de nuevo o contacta soporte.',
        debug: { regData, existing },
      });
    }

    return res.status(500).json({
      error: `Error de Zoom (DEBUG): ${JSON.stringify(regData)}`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Zoom: ' + err.message });
  }
}
