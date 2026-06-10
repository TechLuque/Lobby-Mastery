import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/authService';
import logoLuque from '../../assets/images/LOGO LUQUE B.svg';
import {
  getAllUsers,
  createUser,
  updateUserAccess,
  deleteUser,
  parseCSV,
  importUsersFromCSV,
  getStats,
  getZoomConfig,
  saveZoomConfig,
} from '../../services/userService';
import './admin-dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, codigo: 0, maquina: 0, maestria: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurso, setFilterCurso] = useState('todos');

  // New user form
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', email: '', curso: 'codigo' });
  const [savingUser, setSavingUser] = useState(false);

  // CSV import
  const [csvResult, setCsvResult] = useState(null);
  const [importingCSV, setImportingCSV] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Zoom config
  const [zoomConfig, setZoomConfig] = useState({
    ZOOM_CODIGO_ID: '',
    ZOOM_MAQUINA_ID: '',
    ZOOM_MAESTRIA_ID: '',
  });
  const [savingZoom, setSavingZoom] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
    loadZoomConfig();
  }, []);

  const loadZoomConfig = async () => {
    try {
      const config = await getZoomConfig();
      if (config) {
        setZoomConfig(config);
      }
    } catch (err) {
      console.error('Error loading Zoom config:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([getAllUsers(), getStats()]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/admin');
  };

  const handleZoomConfigChange = (field, value) => {
    setZoomConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveZoomConfig = async (e) => {
    e.preventDefault();
    if (!zoomConfig.ZOOM_CODIGO_ID.trim() || !zoomConfig.ZOOM_MAQUINA_ID.trim() || !zoomConfig.ZOOM_MAESTRIA_ID.trim()) {
      setError('Todos los Meeting IDs son requeridos');
      return;
    }
    setSavingZoom(true);
    try {
      const result = await saveZoomConfig(zoomConfig);
      if (result.success) {
        if (result.changedSalas && result.changedSalas.length > 0) {
          setSuccess(`Configuración de Zoom guardada. Meeting IDs actualizados para: ${result.changedSalas.join(', ')}. Links de usuarios regenerados.`);
        } else {
          setSuccess('Configuración de Zoom guardada exitosamente');
        }
      } else {
        setError('Error al guardar: ' + result.error);
      }
    } catch (err) {
      setError('Error al guardar Zoom config: ' + err.message);
    } finally {
      setSavingZoom(false);
    }
  };

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ==================== USERS ====================

  const handleToggleAccess = async (userId, sala, currentValue) => {
    const result = await updateUserAccess(userId, sala, !currentValue);
    if (result.success) {
      setUsers(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, [`acceso_${sala}`]: !currentValue } : u
        )
      );
      setStats(prev => ({
        ...prev,
        [sala]: !currentValue ? prev[sala] + 1 : prev[sala] - 1,
      }));
    } else {
      setError('Error al actualizar acceso: ' + result.error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.nombre.trim() || !newUser.email.trim()) {
      setError('Nombre y email son obligatorios');
      return;
    }
    setSavingUser(true);
    const result = await createUser(newUser);
    setSavingUser(false);

    if (result.success) {
      setSuccess(`Usuario "${newUser.nombre}" creado correctamente (#${String(result.user.numero).padStart(3, '0')})`);
      setNewUser({ nombre: '', email: '', curso: 'codigo' });
      setShowNewUserForm(false);
      await loadData();
    } else {
      setError(result.error);
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await deleteUser(userId);
    if (result.success) {
      setSuccess('Usuario eliminado correctamente');
      setDeleteConfirm(null);
      await loadData();
    } else {
      setError('Error al eliminar: ' + result.error);
    }
  };

  // ==================== CSV ====================

  const handleDownloadTemplate = () => {
    const templateData = [
      ['nombre', 'email', 'curso'],
      ['Juan Perez', 'juan.perez@email.com', 'codigo'],
      ['Maria Lopez', 'maria.lopez@email.com', 'maquina'],
      ['Carlos Ruiz', 'carlos.ruiz@email.com', 'maestria'],
      ['Ana Garcia', 'ana.garcia@email.com', 'codigo'],
      ['Roberto Silva', 'roberto.silva@email.com', 'maquina'],
    ];
    
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'usuarios_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportingCSV(true);
    setCsvResult(null);
    setError('');

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        setError('No se encontraron registros validos en el CSV');
        setImportingCSV(false);
        return;
      }

      const result = await importUsersFromCSV(parsed);
      setCsvResult(result);
      setSuccess(`Importacion completa: ${result.imported} importados, ${result.skipped} omitidos`);
      await loadData();
    } catch (err) {
      setError('Error al procesar CSV: ' + err.message);
    } finally {
      setImportingCSV(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ==================== FILTERS ====================

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.numero).includes(searchTerm);
    const matchesCurso = filterCurso === 'todos' || u.curso === filterCurso;
    return matchesSearch && matchesCurso;
  });

  // ==================== RENDER ====================

  return (
    <div className="admin-dashboard-wrapper">
      {/* HEADER */}
      <header className="admin-dashboard-header">
        <div className="admin-header-content">
          <div className="admin-logo-section" onClick={() => navigate('/lobby')} style={{ cursor: 'pointer' }}>
            <div className="admin-logo-icon">
              <img src={logoLuque} alt="Logo Luque" className="admin-logo-img" />
            </div>
            <div>
              <h1>Panel Administrador</h1>
            </div>
          </div>
          <div className="admin-user-info">
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      {success && (
        <div className="admin-toast admin-toast-success">
          <i className="fas fa-check-circle"></i> {success}
        </div>
      )}
      {error && (
        <div className="admin-toast admin-toast-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="admin-dashboard-container">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <button
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <i className="fas fa-users"></i>
              <span>Usuarios</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'csv' ? 'active' : ''}`}
              onClick={() => setActiveTab('csv')}
            >
              <i className="fas fa-file-csv"></i>
              <span>Importar CSV</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'zoom' ? 'active' : ''}`}
              onClick={() => setActiveTab('zoom')}
            >
              <i className="fab fa-zoom"></i>
              <span>Configurar Zoom</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <i className="fas fa-chart-bar"></i>
              <span>Estadisticas</span>
            </button>
          </nav>
        </aside>

        {/* CONTENT */}
        <main className="admin-content">
          {loading ? (
            <div className="admin-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Cargando datos...</p>
            </div>
          ) : (
            <>
              {/* ========== USERS TAB ========== */}
              {activeTab === 'users' && (
                <div className="admin-tab">
                  <div className="tab-header">
                    <div>
                      <h2>Gestionar Usuarios</h2>
                      <p>{users.length} usuarios registrados</p>
                    </div>
                    <button
                      className="btn-add-user"
                      onClick={() => setShowNewUserForm(!showNewUserForm)}
                    >
                      <i className={`fas fa-${showNewUserForm ? 'times' : 'plus'}`}></i>
                      {showNewUserForm ? 'Cancelar' : 'Nuevo Usuario'}
                    </button>
                  </div>

                  {/* NEW USER FORM */}
                  {showNewUserForm && (
                    <form className="new-user-form" onSubmit={handleCreateUser}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Nombre</label>
                          <input
                            type="text"
                            placeholder="Nombre completo"
                            value={newUser.nombre}
                            onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Curso</label>
                          <select
                            value={newUser.curso}
                            onChange={e => setNewUser({ ...newUser, curso: e.target.value })}
                          >
                            <option value="codigo">Codigo del Dinero</option>
                            <option value="maquina">Maquina del Dinero</option>
                            <option value="maestria">Maestria</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn-save" disabled={savingUser}>
                        <i className={`fas fa-${savingUser ? 'spinner fa-spin' : 'save'}`}></i>
                        {savingUser ? 'Guardando...' : 'Crear Usuario'}
                      </button>
                    </form>
                  )}

                  {/* SEARCH & FILTER */}
                  <div className="table-toolbar">
                    <div className="search-box">
                      <i className="fas fa-search"></i>
                      <input
                        type="text"
                        placeholder="Buscar por nombre, email o numero..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="filter-select"
                      value={filterCurso}
                      onChange={e => setFilterCurso(e.target.value)}
                    >
                      <option value="todos">Todos los cursos</option>
                      <option value="codigo">Codigo</option>
                      <option value="maquina">Maquina</option>
                      <option value="maestria">Maestria</option>
                    </select>
                  </div>

                  {/* USERS TABLE */}
                  <div className="users-table-wrapper">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Curso</th>
                          <th>Codigo</th>
                          <th>Maquina</th>
                          <th>Maestria</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="empty-row">
                              <i className="fas fa-inbox"></i>
                              <span>No se encontraron usuarios</span>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(user => (
                            <tr key={user.id}>
                              <td className="col-num">{String(user.numero).padStart(3, '0')}</td>
                              <td className="col-name">{user.nombre}</td>
                              <td className="col-email">{user.email}</td>
                              <td className="col-curso">
                                <span className={`badge badge-${user.curso}`}>
                                  {user.curso || 'N/A'}
                                </span>
                              </td>
                              <td className="col-toggle">
                                <button
                                  className={`toggle-btn ${user.acceso_codigo ? 'on' : 'off'}`}
                                  onClick={() => handleToggleAccess(user.id, 'codigo', user.acceso_codigo)}
                                  title={user.acceso_codigo ? 'Desactivar acceso' : 'Activar acceso'}
                                >
                                  <span className="toggle-slider"></span>
                                </button>
                              </td>
                              <td className="col-toggle">
                                <button
                                  className={`toggle-btn ${user.acceso_maquina ? 'on' : 'off'}`}
                                  onClick={() => handleToggleAccess(user.id, 'maquina', user.acceso_maquina)}
                                  title={user.acceso_maquina ? 'Desactivar acceso' : 'Activar acceso'}
                                >
                                  <span className="toggle-slider"></span>
                                </button>
                              </td>
                              <td className="col-toggle">
                                <button
                                  className={`toggle-btn ${user.acceso_maestria ? 'on' : 'off'}`}
                                  onClick={() => handleToggleAccess(user.id, 'maestria', user.acceso_maestria)}
                                  title={user.acceso_maestria ? 'Desactivar acceso' : 'Activar acceso'}
                                >
                                  <span className="toggle-slider"></span>
                                </button>
                              </td>
                              <td className="col-actions">
                                {deleteConfirm === user.id ? (
                                  <div className="delete-confirm">
                                    <button
                                      className="btn-confirm-yes"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      <i className="fas fa-check"></i>
                                    </button>
                                    <button
                                      className="btn-confirm-no"
                                      onClick={() => setDeleteConfirm(null)}
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="btn-delete"
                                    onClick={() => setDeleteConfirm(user.id)}
                                    title="Eliminar usuario"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========== CSV TAB ========== */}
              {activeTab === 'csv' && (
                <div className="admin-tab">
                  <div className="tab-header">
                    <div>
                      <h2>Importar Usuarios desde CSV</h2>
                      <p>Sube un archivo CSV con las columnas: nombre, email, curso</p>
                    </div>
                  </div>

                  <div className="csv-section">
                    <div className="csv-instructions">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                        <h3><i className="fas fa-file-csv"></i> Formato del archivo CSV</h3>
                        <button 
                          onClick={handleDownloadTemplate}
                          style={{
                            padding: '10px 20px',
                            background: '#ffffff',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <i className="fas fa-download"></i>
                          Descargar Template
                        </button>
                      </div>
                      <p>El CSV debe contener exactamente estas 3 columnas:</p>
                      <div className="csv-example">
                        <code><strong>nombre,email,curso</strong></code>
                        <code>Juan Perez,juan.perez@email.com,codigo</code>
                        <code>Maria Lopez,maria.lopez@email.com,maquina</code>
                        <code>Carlos Ruiz,carlos.ruiz@email.com,maestria</code>
                        <code>Ana Garcia,ana.garcia@email.com,codigo</code>
                      </div>
                      <ul className="csv-notes">
                        <li><strong>nombre:</strong> Nombre completo del usuario (requerido)</li>
                        <li><strong>email:</strong> Email único del usuario - debe ser válido y único (requerido)</li>
                        <li><strong>curso:</strong> Uno de estos valores EXACTOS:
                          <ul>
                            <li><code>codigo</code> - Código del Dinero</li>
                            <li><code>maquina</code> - La Máquina</li>
                            <li><code>maestria</code> - Maestría del Dinero</li>
                          </ul>
                        </li>
                        <li>Se acepta separador por coma (,) o punto y coma (;)</li>
                        <li>El orden de columnas es flexible (nombre, email, curso pueden estar en cualquier orden)</li>
                        <li>Emails duplicados serán omitidos automáticamente</li>
                        <li>El número de usuario se asigna automáticamente en secuencia</li>
                        <li>El acceso se activa automáticamente según el curso seleccionado</li>
                      </ul>
                    </div>

                    <div className="csv-upload-area">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv,.txt"
                        onChange={handleCSVUpload}
                        className="csv-input"
                        id="csvFileInput"
                      />
                      <label htmlFor="csvFileInput" className="csv-upload-label">
                        {importingCSV ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            <span>Importando usuarios...</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span>Haz clic para seleccionar archivo CSV</span>
                            <small>o arrastra el archivo aqui</small>
                          </>
                        )}
                      </label>
                    </div>

                    {/* CSV RESULTS */}
                    {csvResult && (
                      <div className="csv-results">
                        <h3>Resultado de la importacion</h3>
                        <div className="csv-stats-grid">
                          <div className="csv-stat csv-stat-success">
                            <i className="fas fa-check-circle"></i>
                            <span className="csv-stat-num">{csvResult.imported}</span>
                            <span>Importados</span>
                          </div>
                          <div className="csv-stat csv-stat-warning">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span className="csv-stat-num">{csvResult.skipped}</span>
                            <span>Omitidos</span>
                          </div>
                          <div className="csv-stat csv-stat-error">
                            <i className="fas fa-times-circle"></i>
                            <span className="csv-stat-num">{csvResult.errors?.length || 0}</span>
                            <span>Errores</span>
                          </div>
                        </div>
                        {csvResult.errors?.length > 0 && (
                          <div className="csv-errors">
                            <h4>Detalle de errores:</h4>
                            {csvResult.errors.map((err, i) => (
                              <p key={i} className="csv-error-item">{err}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========== ZOOM TAB ========== */}
              {activeTab === 'zoom' && (
                <div className="admin-tab">
                  <div className="tab-header">
                    <div>
                      <h2><i className="fas fa-video"></i> Configurar Zoom</h2>
                      <p>Administra los Meeting IDs para cada sala</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveZoomConfig} className="zoom-form">
                    <div className="form-group">
                      <label htmlFor="zoom-codigo">
                        Meeting ID - Código del Dinero
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="zoom-codigo"
                        placeholder="Ingresa el Meeting ID para Código"
                        value={zoomConfig.ZOOM_CODIGO_ID}
                        onChange={(e) => handleZoomConfigChange('ZOOM_CODIGO_ID', e.target.value)}
                        disabled={savingZoom}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="zoom-maquina">
                        Meeting ID - La Máquina
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="zoom-maquina"
                        placeholder="Ingresa el Meeting ID para Máquina"
                        value={zoomConfig.ZOOM_MAQUINA_ID}
                        onChange={(e) => handleZoomConfigChange('ZOOM_MAQUINA_ID', e.target.value)}
                        disabled={savingZoom}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="zoom-maestria">
                        Meeting ID - Maestría del Dinero
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="zoom-maestria"
                        placeholder="Ingresa el Meeting ID para Maestría"
                        value={zoomConfig.ZOOM_MAESTRIA_ID}
                        onChange={(e) => handleZoomConfigChange('ZOOM_MAESTRIA_ID', e.target.value)}
                        disabled={savingZoom}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={savingZoom}
                      >
                        {savingZoom ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save"></i>
                            <span>Guardar Configuración</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="zoom-info">
                      <h4><i className="fas fa-info-circle"></i> ¿Cómo obtener los Meeting IDs?</h4>
                      <ol>
                        <li>Ve a tu cuenta Zoom: <strong>https://zoom.us</strong></li>
                        <li>Crea 3 reuniones diferentes (una para cada sala)</li>
                        <li>Copia el ID de cada reunión (es el número que aparece en la URL)</li>
                        <li>Pégalos en los campos anteriores</li>
                        <li>Haz clic en "Guardar Configuración"</li>
                      </ol>
                    </div>
                  </form>
                </div>
              )}

              {/* ========== STATS TAB ========== */}
              {activeTab === 'stats' && (
                <div className="admin-tab">
                  <div className="tab-header">
                    <div>
                      <h2>Estadisticas</h2>
                      <p>Resumen general de la plataforma</p>
                    </div>
                    <button className="btn-refresh" onClick={loadData}>
                      <i className="fas fa-sync-alt"></i> Actualizar
                    </button>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card stat-active">
                      <div className="stat-icon"><i className="fas fa-signal"></i></div>
                      <div className="stat-number">{stats.active}</div>
                      <div className="stat-label">Usuarios Activos</div>
                    </div>
                    <div className="stat-card stat-codigo">
                      <div className="stat-icon"><i className="fas fa-code"></i></div>
                      <div className="stat-number">{stats.codigo}</div>
                      <div className="stat-label">Acceso Codigo</div>
                    </div>
                    <div className="stat-card stat-maquina">
                      <div className="stat-icon"><i className="fas fa-cogs"></i></div>
                      <div className="stat-number">{stats.maquina}</div>
                      <div className="stat-label">Acceso Maquina</div>
                    </div>
                    <div className="stat-card stat-maestria">
                      <div className="stat-icon"><i className="fas fa-brain"></i></div>
                      <div className="stat-number">{stats.maestria}</div>
                      <div className="stat-label">Acceso Maestria</div>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
