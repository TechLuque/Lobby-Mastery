import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail } from '../../services/authService';
import loginBg from '../../assets/images/LA_Home_01.png';
import logoLuque from '../../assets/images/LOGO LUQUE B.svg';
import '../buttons.css';
import '../whatsapp.css';
import './login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar que el email esté presente
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      setLoading(false);
      return;
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido');
      setLoading(false);
      return;
    }

    try {
      const result = await loginWithEmail(email);

      if (result.success) {
        setEmail('');
        // Redirigir explícitamente al Lobby después de login exitoso
        setTimeout(() => {
          navigate('/lobby');
        }, 300);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo"><img src={logoLuque} alt="Luque Academy" className="logo-img" /></div>
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
        </ul>
      </nav>

      <main className="split-screen">
        {/* LEFT PANE — Imagen de fondo */}
        <section
          className="left-pane"
          style={{ backgroundImage: `url(${loginBg})` }}
        >
          <div className="overlay">
            <h1>
              Lobby <span className="text-gold">Mastery</span>
            </h1>
            <p>
              Accede a tu panel personalizado y comienza tu transformación hoy.
            </p>
          </div>
        </section>

        {/* RIGHT PANE — Formulario */}
        <section className="right-pane">
          <div className="login-box">
            <h2>Bienvenido de Nuevo</h2>
            <p className="subtitle">
              Ingresa tu email para acceder a tu cuenta.
            </p>

            <form id="loginForm" onSubmit={handleSubmit}>
              <div className="input-group">
                <input
                  type="email"
                  id="email"
                  required
                  placeholder=" "
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <label htmlFor="email">Correo Electrónico</label>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <div className="error-message">{error}</div>
              )}

              <button
                type="submit"
                className="btn-primary btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Validando...
                  </>
                ) : (
                  <>
                    INGRESAR
                    <span className="arrow">→</span>
                  </>
                )}
              </button>
            </form>

          <div className="admin-footer">
            <p>¿Problemas de acceso?</p>
            <a
              href="https://wa.me/573176484451?text=Necesito%20ayuda%20para%20acceder%20al%20panel%20administrador"
              target="_blank"
              rel="noopener noreferrer"
              className="link-whatsapp"
            >
              <i className="fab fa-whatsapp"></i>
              Contactar soporte
            </a>
          </div>
          </div>
        </section>
      </main>

      {/* WHATSAPP FLOAT */}
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

export default Login;
