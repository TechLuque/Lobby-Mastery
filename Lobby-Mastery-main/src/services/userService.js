import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const USERS_COLLECTION = "usuarios";
const CONFIG_COLLECTION = "config";

// ============================================================
// GESTIÓN DE USUARIOS
// ============================================================

/**
 * Buscar un usuario por email en Firestore
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export const getUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const q = query(
    collection(db, USERS_COLLECTION),
    where("email", "==", normalizedEmail)
  );

  let snapshot;
  try {
    snapshot = await getDocs(q);
  } catch (error) {
    console.error("Error al buscar usuario en Firestore:", error);
    // Propagar el error para que el caller muestre el mensaje real
    if (error.code === "permission-denied" || error.message?.includes("permission")) {
      throw new Error(
        "FIRESTORE_PERMISSION: Las reglas de Firestore bloquean la lectura. " +
        "Ve a Firebase Console > Firestore > Rules y configura reglas de prueba."
      );
    }
    throw new Error("FIRESTORE_ERROR: " + (error.code || error.message));
  }

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Obtener todos los usuarios de Firestore
 * @returns {Promise<Array>}
 */
export const getAllUsers = async () => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy("numero", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return [];
  }
};

/**
 * Obtener el siguiente número disponible para asignar
 * @returns {Promise<number>}
 */
export const getNextUserNumber = async () => {
  try {
    const users = await getAllUsers();
    if (users.length === 0) return 1;
    const maxNumber = Math.max(...users.map((u) => u.numero || 0));
    return maxNumber + 1;
  } catch (error) {
    console.error("Error al obtener siguiente número:", error);
    return 1;
  }
};

/**
 * Crear un usuario en Firestore
 * @param {object} userData - { nombre, email, curso }
 * @returns {Promise<object>}
 */
export const createUser = async (userData) => {
  try {
    const normalizedEmail = userData.email.toLowerCase().trim();

    // Verificar si el usuario ya existe
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return { success: false, error: "Este email ya está registrado" };
    }

    const nextNumber = await getNextUserNumber();
    const curso = (userData.curso || "").toLowerCase().trim();

    const newUser = {
      nombre: userData.nombre || "",
      email: normalizedEmail,
      numero: nextNumber,
      curso: curso,
      acceso_codigo: curso === "codigo" || curso === "maestria" || curso === "maquina",
      acceso_maquina: curso === "maquina" || curso === "maestria",
      acceso_maestria: curso === "maestria",
      createdAt: serverTimestamp(),
      lastLogin: null,
    };

    const docRef = doc(collection(db, USERS_COLLECTION));
    await setDoc(docRef, newUser);

    return { success: true, user: { id: docRef.id, ...newUser } };
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar acceso de un usuario a una sala específica
 * @param {string} userId - ID del documento en Firestore
 * @param {string} sala - "codigo" | "maquina" | "maestria"
 * @param {boolean} acceso - true/false
 * @returns {Promise<object>}
 */
export const updateUserAccess = async (userId, sala, acceso) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const updateData = { [`acceso_${sala}`]: acceso };
    
    // Si se activa maestría, también activar máquina y códigos
    if (sala === "maestria" && acceso === true) {
      updateData.acceso_maquina = true;
      updateData.acceso_codigo = true;
    }
    
    // Si se activa máquina, también activar códigos
    if (sala === "maquina" && acceso === true) {
      updateData.acceso_codigo = true;
    }
    
    await updateDoc(docRef, updateData);
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar acceso:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar datos de un usuario
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateUser = async (userId, data) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Eliminar un usuario de Firestore
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const deleteUser = async (userId) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Registrar último login de un usuario
 * @param {string} userId
 */
export const updateLastLogin = async (userId) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(docRef, { lastLogin: serverTimestamp() });
  } catch (error) {
    console.error("Error al actualizar último login:", error);
  }
};

// ============================================================
// IMPORTACIÓN MASIVA CSV
// ============================================================

/**
 * Parsear contenido CSV a array de objetos
 * @param {string} csvContent
 * @returns {Array<{nombre: string, email: string, curso: string}>}
 */
export const parseCSV = (csvContent) => {
  const lines = csvContent
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("El CSV debe tener al menos una fila de encabezado y una de datos");
  }

  // Detectar separador (, o ;)
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase());

  // Buscar columnas por nombre
  const nameIdx = headers.findIndex(
    (h) => h === "nombre" || h === "name" || h === "nombres"
  );
  const emailIdx = headers.findIndex(
    (h) => h === "email" || h === "correo" || h === "mail"
  );
  const cursoIdx = headers.findIndex(
    (h) => h === "curso" || h === "course" || h === "sala" || h === "programa"
  );

  if (emailIdx === -1) {
    throw new Error(
      'No se encontró la columna de email. Usa encabezados: "nombre", "email", "curso"'
    );
  }

  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map((v) => v.trim());

    if (values.length < Math.max(nameIdx, emailIdx, cursoIdx) + 1) continue;

    const email = values[emailIdx];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

    // Normalizar el nombre del curso
    let curso = cursoIdx !== -1 ? values[cursoIdx].toLowerCase().trim() : "";
    // Mapear variantes del nombre de curso
    if (curso.includes("codigo") || curso.includes("código")) curso = "codigo";
    else if (curso.includes("maquina") || curso.includes("máquina")) curso = "maquina";
    else if (curso.includes("maestria") || curso.includes("maestría")) curso = "maestria";

    results.push({
      nombre: nameIdx !== -1 ? values[nameIdx] : "",
      email: email.toLowerCase(),
      curso: curso,
    });
  }

  return results;
};

/**
 * Importar usuarios desde un array parseado del CSV
 * @param {Array} usersData - Array de { nombre, email, curso }
 * @returns {Promise<object>} - { success, imported, skipped, errors }
 */
export const importUsersFromCSV = async (usersData) => {
  let imported = 0;
  let skipped = 0;
  const errors = [];

  // Obtener siguiente número
  let nextNumber = await getNextUserNumber();

  // Procesar en lotes de 500 (límite de Firestore batch)
  const batchSize = 450;
  for (let i = 0; i < usersData.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = usersData.slice(i, i + batchSize);

    for (const userData of chunk) {
      try {
        // Verificar si el usuario ya existe
        const existing = await getUserByEmail(userData.email);
        if (existing) {
          skipped++;
          continue;
        }

        const curso = userData.curso || "";
        const newUser = {
          nombre: userData.nombre || "",
          email: userData.email.toLowerCase().trim(),
          numero: nextNumber++,
          curso: curso,
          acceso_codigo: curso === "codigo",
          acceso_maquina: curso === "maquina",
          acceso_maestria: curso === "maestria",
          createdAt: serverTimestamp(),
          lastLogin: null,
        };

        const docRef = doc(collection(db, USERS_COLLECTION));
        batch.set(docRef, newUser);
        imported++;
      } catch (err) {
        errors.push(`Error con ${userData.email}: ${err.message}`);
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      errors.push(`Error en batch: ${err.message}`);
    }
  }

  return { success: true, imported, skipped, errors };
};

// ============================================================
// ESTADÍSTICAS
// ============================================================

/**
 * Obtener estadísticas de la plataforma
 * @returns {Promise<object>}
 */
export const getStats = async () => {
  try {
    const users = await getAllUsers();
    const total = users.length;
    const codigoCount = users.filter((u) => u.acceso_codigo).length;
    const maquinaCount = users.filter((u) => u.acceso_maquina).length;
    const maestriaCount = users.filter((u) => u.acceso_maestria).length;
    const activeCount = users.filter((u) => u.lastLogin !== null).length;

    return {
      total,
      codigo: codigoCount,
      maquina: maquinaCount,
      maestria: maestriaCount,
      active: activeCount,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return { total: 0, codigo: 0, maquina: 0, maestria: 0, active: 0 };
  }
};

// ============================================================
// CONFIGURACIÓN ADMIN
// ============================================================

/**
 * Verificar si un email es administrador
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export const isAdmin = async (email) => {
  const configRef = doc(db, CONFIG_COLLECTION, "admin");

  try {
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      const adminEmails = (data.adminEmails || []).map((e) =>
        e.toLowerCase().trim()
      );
      return adminEmails.includes(email.toLowerCase().trim());
    }

    // Si no existe el documento de config, crear uno con el admin por defecto
    console.log("Creando documento config/admin con admin por defecto...");
    await setDoc(configRef, {
      adminEmails: ["nolsan.223@gmail.com"],
    });
    return email.toLowerCase().trim() === "nolsan.223@gmail.com";
  } catch (error) {
    console.error("Error al verificar admin:", error);

    if (error.code === "permission-denied" || error.message?.includes("permission")) {
      console.warn(
        "FIRESTORE PERMISSION ERROR: No se puede leer/escribir config/admin. " +
        "Configura reglas de Firestore en modo prueba."
      );
    }

    // Fallback: verificar contra el email de admin por defecto
    // Esto permite que el admin demo funcione incluso sin Firestore configurado
    return email.toLowerCase().trim() === "nolsan.223@gmail.com";
  }
};

// ============================================================
// GESTIÓN DE ZOOM
// ============================================================

/**
 * Obtener configuración actual de Zoom
 * @returns {Promise<object|null>}
 */
export const getZoomConfig = async () => {
  try {
    const configRef = doc(db, CONFIG_COLLECTION, "zoom");
    const configSnap = await getDoc(configRef);
    return configSnap.exists() ? configSnap.data() : null;
  } catch (error) {
    console.error("Error al obtener config Zoom:", error);
    return null;
  }
};

/**
 * Guardar configuración de Zoom (IDs de reuniones)
 * @param {object} config - { ZOOM_CODIGO_ID, ZOOM_MAQUINA_ID, ZOOM_MAESTRIA_ID }
 * @returns {Promise<object>}
 */
export const saveZoomConfig = async (config) => {
  try {
    // 1. Leer config anterior para detectar cambios
    const configRef = doc(db, CONFIG_COLLECTION, "zoom");
    const prevSnap = await getDoc(configRef);
    const prevConfig = prevSnap.exists() ? prevSnap.data() : {};

    // 2. Guardar nueva config
    await setDoc(
      configRef,
      {
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Detectar qué salas cambiaron de Meeting ID
    const salaFields = {
      ZOOM_CODIGO_ID: "codigo",
      ZOOM_MAQUINA_ID: "maquina",
      ZOOM_MAESTRIA_ID: "maestria",
    };
    const changedSalas = [];
    for (const [field, sala] of Object.entries(salaFields)) {
      if (config[field] && config[field] !== prevConfig[field]) {
        changedSalas.push(sala);
      }
    }

    // 4. Si hubo cambios, limpiar zoom_links cacheados de TODOS los usuarios
    if (changedSalas.length > 0) {
      console.log("Meeting IDs cambiados para:", changedSalas, "→ Limpiando links cacheados...");
      const usersRef = collection(db, USERS_COLLECTION);
      const usersSnap = await getDocs(usersRef);

      const batch = writeBatch(db);
      let batchCount = 0;

      usersSnap.forEach((userDoc) => {
        const userData = userDoc.data();
        const updates = {};
        let needsUpdate = false;

        for (const sala of changedSalas) {
          if (userData.zoom_links && userData.zoom_links[sala]) {
            updates[`zoom_links.${sala}`] = deleteField();
            updates[`zoom_meeting_ids.${sala}`] = deleteField();
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          batch.update(userDoc.ref, updates);
          batchCount++;
        }
      });

      if (batchCount > 0) {
        await batch.commit();
        console.log(`✓ Links cacheados limpiados para ${batchCount} usuarios en salas: ${changedSalas.join(", ")}`);
      }
    }

    return { success: true, changedSalas };
  } catch (error) {
    console.error("Error al guardar config Zoom:", error);
    return { success: false, error: error.message };
  }
};
