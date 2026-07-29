import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthChange } from './services/authService';
import { UserProvider } from './context/UserContext';
import Login from './pages/Login/login';
import Lobby from './pages/Lobby/lobby';
import Codigo from './pages/Codigo/codigo';
import Maquina from './pages/Maquina/maquina';
import Maestria from './pages/Maestria/maestria';
import './App.css';

// El panel de administrador solo lo usan administradores, no todos los
// estudiantes que pasan por Lobby -> Codigo/Maquina/Maestria. Se separa en
// su propio chunk para no engordar el bundle principal que sí cargan todos.
const AdminLogin = lazy(() => import('./pages/Administrador/admin'));
const AdminDashboard = lazy(() => import('./pages/Administrador/admin-dashboard'));

const routeLoadingFallback = (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#0a0a0a',
    color: '#69E4FF',
  }}>
    Cargando...
  </div>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  // Escuchar cambios en la autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    // Cleanup: desuscribirse cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  // Mientras se verifica la autenticación, mostrar un loading
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: '#69E4FF',
        fontSize: '18px',
        fontFamily: 'Montserrat'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '2px solid #69E4FF',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Cargando Luque Academy...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <Suspense fallback={routeLoadingFallback}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" /> : <Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/admin" />} />
            <Route path="/lobby" element={isAuthenticated ? <Lobby /> : <Navigate to="/login" />} />
            <Route path="/codigo" element={isAuthenticated ? <Codigo /> : <Navigate to="/login" />} />
            <Route path="/maquina" element={isAuthenticated ? <Maquina /> : <Navigate to="/login" />} />
            <Route path="/maestria" element={isAuthenticated ? <Maestria /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/lobby" : "/login"} />} />
          </Routes>
        </Suspense>
      </UserProvider>
    </BrowserRouter>
  );
};

export default App;
