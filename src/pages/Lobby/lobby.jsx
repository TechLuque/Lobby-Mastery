import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/authService';
import { useUserData } from '../../context/UserContext';
import logoCDD from '../../assets/images/LOGO CDD C.svg';
import logoMDD from '../../assets/images/LOGO MDD A.svg';
import logoMST from '../../assets/images/LOGO_MST GRIS.svg';
import logoLuque from '../../assets/images/LOGO LUQUE B.svg';
import '../whatsapp.css';
import './lobby.css';

const Lobby = () => {
  const navigate = useNavigate();
  const { userData, userLoading: loading } = useUserData();
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const handleNavigate = (sala, ruta) => {
    if (!userData) return;
    const field = `acceso_${sala}`;
    if (userData[field]) {
      navigate(ruta);
    } else {
      setAccessDeniedMsg('No tienes acceso a este módulo en este momento.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000000', color: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
        <p>Cargando tu perfil...</p>
      </div>
    );
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/lobby')} style={{ cursor: 'pointer' }}>
          <img src={logoLuque} alt="Luque Academy" className="logo-img" />
        </div>
        <ul className="nav-links">
          <li>
            <a
              href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20entrar%20a%20una%20sesi%C3%B3n"
              target="_blank"
              rel="noopener noreferrer"
            >
              Soporte
            </a>
          </li>
          <li>
            <button onClick={handleLogout} className="btn-gold-outline logout-nav-btn">
              <i className="fas fa-sign-out-alt"></i> Salir
            </button>
          </li>
        </ul>
      </nav>

      {/* BACKGROUND ORBS */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* ACCESS DENIED MODAL */}
      {accessDeniedMsg && (
        <div className="modal show" onClick={() => setAccessDeniedMsg('')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAccessDeniedMsg('')}>&times;</button>
            <h2>Acceso Denegado</h2>
            <p>{accessDeniedMsg}</p>
            <p className="modal-info">Si crees que es un error, contáctanos por WhatsApp para resolver tu acceso.</p>
            <div className="modal-buttons">
              <a
                href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20entrar%20a%20una%20sesi%C3%B3n"
                className="btn-whatsapp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-whatsapp"></i> Contactar por WhatsApp
              </a>
              <button onClick={() => setAccessDeniedMsg('')} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="container">
        <div className="content">
          <h1 className="main-title">
            <span className="title-word">Bienvenido a Luque Academy</span>
          </h1>
          {userData?.nombre && (
            <p className="user-greeting">{userData.nombre}</p>
          )}

          <div className="rooms-grid">
            {/* Sala 1: Código del Dinero */}
            <div className={`room-card ${!userData?.acceso_codigo ? 'room-locked' : ''}`} data-room="1">
              <div className="card-glow"></div>
              {!userData?.acceso_codigo && (
                <div className="lock-badge"><i className="fas fa-lock"></i></div>
              )}
              <div className="card-content">
                <div className="icon-box">
                  <img src={logoCDD} alt="Logo Código del Dinero" />
                </div>
                <h2> </h2>
                <p>Membresía para emprendedores y empresarios que buscan crecer, salir de la operación y lograr libertad empresarial.</p>
              </div>
              <button
                type="button"
                className={`enter-btn ${!userData?.acceso_codigo ? 'btn-locked' : ''}`}
                onClick={() => handleNavigate('codigo', '/codigo')}
              >
                {userData?.acceso_codigo ? (
                  <>Entrar <i className="fas fa-arrow-right"></i></>
                ) : (
                  <><i className="fas fa-lock"></i> Sin acceso</>
                )}
              </button>
            </div>

            {/* Sala 2: Máquina del Dinero */}
            <div className={`room-card ${!userData?.acceso_maquina ? 'room-locked' : ''}`} data-room="2">
              <div className="card-glow"></div>
              {!userData?.acceso_maquina && (
                <div className="lock-badge"><i className="fas fa-lock"></i></div>
              )}
              <div className="card-content">
                <div className="icon-box">
                  <img src={logoMDD} alt="Logo Máquina del Dinero" />
                </div>
                <h2> </h2>
                <p>Diseñado para ordenar, escalar y multiplicar tu empresa con sistemas que aseguran crecimiento, rentabilidad y libertad.</p>
              </div>
              <button
                type="button"
                className={`enter-btn ${!userData?.acceso_maquina ? 'btn-locked' : ''}`}
                onClick={() => handleNavigate('maquina', '/maquina')}
              >
                {userData?.acceso_maquina ? (
                  <>Entrar <i className="fas fa-arrow-right"></i></>
                ) : (
                  <><i className="fas fa-lock"></i> Sin acceso</>
                )}
              </button>
            </div>

            {/* Sala 3: Maestría del Dinero */}
            <div className={`room-card ${!userData?.acceso_maestria ? 'room-locked' : ''}`} data-room="3">
              <div className="card-glow"></div>
              {!userData?.acceso_maestria && (
                <div className="lock-badge"><i className="fas fa-lock"></i></div>
              )}
              <div className="card-content">
                <div className="icon-box">
                  <img src={logoMST} alt="Logo Maestría del Dinero" />
                </div>
                <p>Acompañamiento personal y presencial para empresarios que quieren crecer entre un 40% y un 120% anual.</p>
              </div>
              <button
                type="button"
                className={`enter-btn ${!userData?.acceso_maestria ? 'btn-locked' : ''}`}
                onClick={() => handleNavigate('maestria', '/maestria')}
              >
                {userData?.acceso_maestria ? (
                  <>Entrar <i className="fas fa-arrow-right"></i></>
                ) : (
                  <><i className="fas fa-lock"></i> Sin acceso</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
};

export default Lobby;
