import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../services/authService';
import { getUserByEmail } from '../../services/userService';
import { joinZoomMeeting } from '../../services/zoomService';
import '../buttons.css';
import '../navbar.css';
import '../whatsapp.css';
import logoLuque from '../../assets/images/LOGO LUQUE B.svg';
import './codigo.css';

const Codigo = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(null);
  const [, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joiningZoom, setJoiningZoom] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const authUser = await getCurrentUser();
        if (!authUser?.email) {
          navigate('/login');
          return;
        }
        const data = await getUserByEmail(authUser.email);
        setUserData(data);
        setHasAccess(data?.acceso_codigo === true);
      } catch (err) {
        console.error('Error verificando acceso:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, [navigate]);

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleJoinZoom = async () => {
    setJoiningZoom(true);
    const meetingWindow = window.open('about:blank', 'zoom_codigo', 'width=1200,height=800');
    const result = await joinZoomMeeting('codigo', 'Código del Dinero', meetingWindow);
    setJoiningZoom(false);
    
    if (!result.success) {
      alert('Error: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <>
        {/* NAVBAR */}
        <nav className="navbar">
          <div className="logo" onClick={() => navigate('/lobby')} style={{ cursor: 'pointer' }}><img src={logoLuque} alt="Luque Academy" className="logo-img" /></div>
          <ul className="nav-links">
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleBackToLobby(); }}>Inicio</a>
            </li>
            <li>
              <a href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20entrar%20a%20una%20sesi%C3%B3n" target="_blank" rel="noopener noreferrer">Soporte</a>
            </li>
            <li>
              <button onClick={handleLogout} className="btn-gold-outline"><i className="fas fa-sign-out-alt"></i> Salir</button>
            </li>
          </ul>
        </nav>

        {/* MODAL ACCESO DENEGADO */}
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="modal-close" onClick={handleBackToLobby}>&times;</button>
            <h2>Tu acceso está limitado</h2>
            <p>No tienes acceso a este módulo en este momento.</p>
            <p className="modal-info">
              🔓 Desbloquea el acceso y lleva tu productividad al siguiente nivel.
            </p>
            <div className="modal-buttons">
              <a
                href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20entrar%20a%20una%20sesi%C3%B3n"
                className="btn-whatsapp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-whatsapp"></i> WhatsApp
              </a>
              <button onClick={handleBackToLobby} className="btn-secondary">
                Volver al Lobby
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="product-page sala-codigo">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/lobby')} style={{ cursor: 'pointer' }}><img src={logoLuque} alt="Luque Academy" className="logo-img" /></div>
        <ul className="nav-links">
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); handleBackToLobby(); }}>Inicio</a>
          </li>
          <li>
            <a href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20entrar%20a%20una%20sesi%C3%B3n" target="_blank" rel="noopener noreferrer">Soporte</a>
          </li>
          <li>
            <button onClick={handleLogout} className="btn-gold-outline"><i className="fas fa-sign-out-alt"></i> Salir</button>
          </li>
        </ul>
      </nav>

      {/* VIDEO DE FONDO */}
      <video className="video-background" autoPlay muted loop playsInline preload="auto">
        <source src="/videos/LOGO_CDD_AZUL.mp4" type="video/mp4" />
      </video>

      {/* CONTENEDOR ACCESO CONCEDIDO */}
      <section className="hero-product">
        <div className="hero-overlay">
          <header className="product-header">
            <div className="product-logo-section">
              <div className="product-logo-container"></div>
            </div>

            <div className="product-img-section">
              <p className="product-description"></p>
            </div>

            <div className="product-buttons">
              <button 
                onClick={handleJoinZoom}
                disabled={joiningZoom}
                className="btn-primary btn-lg"
                title="Unirse a reunión Zoom"
              >
                {joiningZoom ? 'Abriendo reunión...' : 'ENTRAR A LA SALA'}
              </button>
              <button onClick={handleBackToLobby} className="btn-secondary">
                Volver al Lobby
              </button>
            </div>
          </header>
        </div>
      </section>

      {/* WHATSAPP FLOTANTE */}
      <a
        href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20entrar%20a%20una%20sesi%C3%B3n"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i className="fab fa-whatsapp"></i>
        <span className="tooltip">¿Necesitas soporte?</span>
      </a>
    </div>
  );
};

export default Codigo;