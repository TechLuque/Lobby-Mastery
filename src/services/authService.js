import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { getUserByEmail, updateLastLogin, isAdmin } from "./userService";

// Configurar persistencia de sesion
setPersistence(auth, browserLocalPersistence);

// ============================================================
// HELPERS
// ============================================================

/**
 * Generar una contrasena deterministica basada en el email
 * (El usuario nunca la ve, solo se usa internamente)
 */
const generatePasswordFromEmail = (email) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `Lq_${Math.abs(hash).toString(36).padEnd(8, "x")}_24!Ac`;
};

// ============================================================
// AUTENTICACION DE USUARIOS (solo email)
// ============================================================

/**
 * Login de usuario con solo email.
 * 1. Valida que el email exista en la coleccion "usuarios" de Firestore
 * 2. Si existe, hace login/register en Firebase Auth con password autogenerada
 * 3. Retorna los datos del usuario desde Firestore
 */
export const loginWithEmail = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // PASO 1: Verificar que el email este registrado en Firestore
    const userData = await getUserByEmail(normalizedEmail);

    if (!userData) {
      return {
        success: false,
        error:
          "Este email no esta registrado en la plataforma. Contacta al administrador.",
      };
    }

    // PASO 2: Autenticar con Firebase Auth
    const password = generatePasswordFromEmail(normalizedEmail);

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
    } catch (authError) {
      // Si no existe en Auth, crearlo
      if (
        authError.code === "auth/user-not-found" ||
        authError.code === "auth/invalid-credential"
      ) {
        try {
          userCredential = await createUserWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
          );
        } catch (registerError) {
          if (registerError.code === "auth/email-already-in-use") {
            return {
              success: false,
              error: "Error de autenticacion. Contacta al administrador.",
            };
          }
          throw registerError;
        }
      } else {
        throw authError;
      }
    }

    // PASO 3: Actualizar ultimo login
    await updateLastLogin(userData.id);

    console.log("Usuario autenticado:", normalizedEmail);
    return {
      success: true,
      user: userCredential.user,
      userData: userData,
    };
  } catch (error) {
    console.error("Error en login:", error.message);

    // Errores de Firestore (permisos, configuracion)
    if (error.message?.startsWith("FIRESTORE_PERMISSION")) {
      return {
        success: false,
        error:
          "Error de configuracion: Las reglas de Firestore no permiten lectura. " +
          "El administrador debe configurar las reglas en Firebase Console.",
      };
    }

    if (error.message?.startsWith("FIRESTORE_ERROR")) {
      return {
        success: false,
        error:
          "Error al conectar con la base de datos. Verifica la configuracion de Firebase. " +
          "Detalle: " + error.message,
      };
    }

    const errorMessages = {
      "auth/too-many-requests": "Demasiados intentos. Intenta mas tarde.",
      "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
      "auth/invalid-email": "El formato del email no es valido.",
      "auth/operation-not-allowed":
        "Autenticacion por email no habilitada. El administrador debe activar Email/Password en Firebase Console > Authentication > Sign-in method.",
    };

    return {
      success: false,
      error:
        errorMessages[error.code] ||
        "Error: " + (error.code || error.message),
    };
  }
};

// ============================================================
// AUTENTICACION DE ADMINISTRADOR (email + contrasena)
// ============================================================

/**
 * Login de administrador con email y contrasena
 * Valida contra Firebase Auth Y verifica rol de admin en Firestore
 */
export const loginAdmin = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // PASO 1: Verificar que es administrador en Firestore ANTES de autenticar
    const adminCheck = await isAdmin(normalizedEmail);

    if (!adminCheck) {
      return {
        success: false,
        error: "No tienes permisos de administrador.",
      };
    }

    // PASO 2: Autenticar con Firebase Auth
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
    } catch (authError) {
      // Si la cuenta no existe en Auth, crearla
      if (
        authError.code === "auth/user-not-found" ||
        authError.code === "auth/invalid-credential"
      ) {
        try {
          userCredential = await createUserWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
          );
        } catch (createError) {
          if (createError.code === "auth/email-already-in-use") {
            return {
              success: false,
              error:
                "La cuenta existe con otra contrasena. Usa la contrasena correcta o contacta soporte.",
            };
          }
          throw createError;
        }
      } else {
        throw authError;
      }
    }

    console.log("Administrador autenticado:", normalizedEmail);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Error en login admin:", error.message);

    const errorMessages = {
      "auth/invalid-email": "Email invalido",
      "auth/user-disabled": "Esta cuenta ha sido deshabilitada",
      "auth/user-not-found": "Credenciales de administrador no validas",
      "auth/wrong-password": "Credenciales de administrador no validas",
      "auth/invalid-credential": "Email o contrasena incorrectos",
      "auth/too-many-requests":
        "Demasiados intentos fallidos. Intenta mas tarde",
      "auth/operation-not-allowed":
        "Autenticacion por email no habilitada en Firebase. Activala en Firebase Console > Authentication > Sign-in method.",
    };

    return {
      success: false,
      error:
        errorMessages[error.code] ||
        "Error: " + (error.code || error.message),
    };
  }
};

/**
 * Login demo de administrador
 * Email: nolsan.223@gmail.com
 * Contrasena fija: LuqueAdmin2026!
 */
export const loginAdminDemo = async () => {
  const demoEmail = "nolsan.223@gmail.com";
  const demoPassword = "LuqueAdmin2026!";

  // Lista de contrasenas a intentar (actual + anteriores)
  const passwords = [
    demoPassword,
    "Admin123456!",
    generatePasswordFromEmail(demoEmail),
  ];

  try {
    let userCredential = null;

    // Intentar iniciar sesion con cada contrasena conocida
    for (const pwd of passwords) {
      try {
        userCredential = await signInWithEmailAndPassword(auth, demoEmail, pwd);
        console.log("Admin demo autenticado con contrasena existente");
        break;
      } catch (e) {
        // Continuar al siguiente intento
        continue;
      }
    }

    // Si ninguna contrasena funciono, intentar crear la cuenta
    if (!userCredential) {
      try {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          demoEmail,
          demoPassword
        );
        console.log("Cuenta admin demo creada exitosamente");
      } catch (createError) {
        if (createError.code === "auth/email-already-in-use") {
          return {
            success: false,
            error:
              "La cuenta existe con una contrasena desconocida. " +
              "Ve a Firebase Console > Authentication > Users, " +
              "elimina nolsan.223@gmail.com y vuelve a intentar.",
          };
        }
        if (createError.code === "auth/operation-not-allowed") {
          return {
            success: false,
            error:
              "Email/Password no esta habilitado. Ve a Firebase Console > " +
              "Authentication > Sign-in method y activa Email/Password.",
          };
        }
        throw createError;
      }
    }

    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Error en login demo:", error);
    return {
      success: false,
      error: "Error al ingresar: " + (error.code || error.message),
    };
  }
};

// ============================================================
// SESION
// ============================================================

/**
 * Cerrar sesion
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log("Sesion cerrada");
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesion:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener usuario actualmente autenticado
 */
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      resolve(user);
      unsubscribe();
    });
  });
};

/**
 * Escuchar cambios en el estado de autenticacion
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
