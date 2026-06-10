import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../../services/authService';
import './admin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar que los campos estén completos
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
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
      const result = await loginAdmin(email, password);

      if (result.success) {
        // Guardar información del administrador
        localStorage.setItem('adminUser', JSON.stringify({ email: result.user.email }));
        // Firebase maneja la sesión automáticamente
        // Redirigir al dashboard del administrador
        setTimeout(() => {
          navigate('/admin-dashboard');
        }, 1000);
        setEmail('');
        setPassword('');
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
    <div className="admin-wrapper">
      {/* BACKGROUND ELEMENTS */}
      <div className="admin-background">
        <div className="admin-orb admin-orb-1"></div>
        <div className="admin-orb admin-orb-2"></div>
        <div className="admin-orb admin-orb-3"></div>
      </div>

      <div className="admin-container">
        <div className="admin-card">
          {/* HEADER */}
          <div className="admin-header">
            <div className="admin-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h1>Panel Administrador</h1>
            <p className="admin-subtitle">Luque Academy - Gestión</p>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
              Ingresa tus credenciales de administrador
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="admin-form">
            {/* EMAIL */}
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error && !email ? 'input-error' : ''}
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error && !password ? 'input-error' : ''}
                disabled={loading}
              />
            </div>

            {/* ERROR MESSAGE */}
            {error && <div className="error-message">{error}</div>}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="btn-admin"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Validando acceso...
                </>
              ) : (
                <>
                  Ingresar al Panel
                  <i className="fas fa-sign-in-alt"></i>
                </>
              )}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="admin-divider">
            <span>Acceso Restringido</span>
          </div>

          {/* BACK BUTTON */}
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            <i className="fas fa-arrow-left"></i>
            Volver al login de usuario
          </button>

          {/* FOOTER */}
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
      </div>
    </div>
  );
};

export default AdminLogin;

