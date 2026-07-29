import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../services/authService';
import { getUserByEmail } from '../services/userService';

const UserContext = createContext(null);

// Carga el documento de Firestore del usuario UNA sola vez por sesion (aqui,
// al nivel de la app) en vez de que cada pagina (Lobby, Codigo, Maquina,
// Maestria) repita su propia consulta a Firebase Auth + Firestore al montar.
// Eso eliminaba un round-trip de red completo en cada transicion Lobby -> Sala.
export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const refreshUserData = useCallback(async (email) => {
    if (!email) return null;
    const data = await getUserByEmail(email);
    setUserData(data);
    return data;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser?.email) {
        try {
          const data = await getUserByEmail(authUser.email);
          setUserData(data);
        } catch (err) {
          console.error('Error al cargar datos del usuario:', err);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setUserLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ userData, userLoading, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserData = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserData debe usarse dentro de <UserProvider>');
  return ctx;
};
