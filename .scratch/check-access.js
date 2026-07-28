const PROJECT_ID = 'lobby-master-690ed';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fetchAllUsers() {
  let docs = [];
  let pageToken = '';
  do {
    const url = `${BASE}/usuarios?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const r = await fetch(url);
    const d = await r.json();
    docs = docs.concat(d.documents || []);
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  return docs;
}

function expectedAccess(curso) {
  const c = (curso || '').toLowerCase().trim();
  if (c === 'maestria') return { acceso_codigo: true, acceso_maquina: true, acceso_maestria: true };
  if (c === 'maquina') return { acceso_codigo: true, acceso_maquina: true, acceso_maestria: false };
  if (c === 'codigo') return { acceso_codigo: true, acceso_maquina: false, acceso_maestria: false };
  return { acceso_codigo: false, acceso_maquina: false, acceso_maestria: false };
}

(async () => {
  const docs = await fetchAllUsers();
  console.log(`Total usuarios: ${docs.length}\n`);

  let missingFieldCount = 0;
  let mismatchCount = 0;
  let noCursoWithAccessCount = 0;
  const problems = [];

  for (const doc of docs) {
    const f = doc.fields || {};
    const email = f.email?.stringValue || '(sin email)';
    const nombre = f.nombre?.stringValue || '(sin nombre)';
    const curso = f.curso?.stringValue || '';

    const hasFieldCodigo = f.acceso_codigo !== undefined;
    const hasFieldMaquina = f.acceso_maquina !== undefined;
    const hasFieldMaestria = f.acceso_maestria !== undefined;

    const acceso_codigo = f.acceso_codigo?.booleanValue === true;
    const acceso_maquina = f.acceso_maquina?.booleanValue === true;
    const acceso_maestria = f.acceso_maestria?.booleanValue === true;

    if (!hasFieldCodigo || !hasFieldMaquina || !hasFieldMaestria) {
      missingFieldCount++;
      problems.push(`FALTA CAMPO -> ${email} (${nombre}) curso="${curso}" | tiene: codigo=${hasFieldCodigo} maquina=${hasFieldMaquina} maestria=${hasFieldMaestria}`);
      continue;
    }

    const exp = expectedAccess(curso);
    const mismatch =
      exp.acceso_codigo !== acceso_codigo ||
      exp.acceso_maquina !== acceso_maquina ||
      exp.acceso_maestria !== acceso_maestria;

    if (mismatch) {
      mismatchCount++;
      problems.push(
        `INCONSISTENTE -> ${email} (${nombre}) curso="${curso}" | actual: codigo=${acceso_codigo} maquina=${acceso_maquina} maestria=${acceso_maestria} | esperado segun curso: codigo=${exp.acceso_codigo} maquina=${exp.acceso_maquina} maestria=${exp.acceso_maestria}`
      );
    }

    if (!curso && (acceso_codigo || acceso_maquina || acceso_maestria)) {
      noCursoWithAccessCount++;
    }
  }

  console.log(`Usuarios con campos acceso_* faltantes: ${missingFieldCount}`);
  console.log(`Usuarios con acceso_* inconsistente respecto a su curso: ${mismatchCount}`);
  console.log(`Usuarios sin curso pero con algun acceso en true: ${noCursoWithAccessCount}`);
  console.log('');
  if (problems.length) {
    console.log('--- Detalle (primeros 50) ---');
    problems.slice(0, 50).forEach((p) => console.log(p));
    if (problems.length > 50) console.log(`... y ${problems.length - 50} mas`);
  } else {
    console.log('Todo consistente, no se encontraron problemas.');
  }
})();
