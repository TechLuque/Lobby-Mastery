/**
 * Funciones utilitarias para la página Lobby
 */

/**
 * Accede a una sala/módulo específico
 * @param {number} roomNumber - Número de la sala (1, 2, 3)
 */
export const accessLobby = (roomNumber) => {
  // Simular verificación de acceso
  const hasAccess = localStorage.getItem(`room_${roomNumber}_access`);
  
  if (hasAccess) {
    // Aquí irías a la sala específica
    console.log(`Accediendo a sala ${roomNumber}`);
    // window.location.href = `/room/${roomNumber}`;
  } else {
    // Mostrar modal de acceso denegado
    showNoAccessModal();
  }
};

/**
 * Muestra el modal de acceso denegado
 */
export const showNoAccessModal = () => {
  const modal = document.getElementById('noAccessModal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    
    // Prevenir scroll cuando modal está abierto
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Cierra el modal de acceso denegado
 */
export const closeNoAccessModal = () => {
  const modal = document.getElementById('noAccessModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    
    // Restaurar scroll
    document.body.style.overflow = 'auto';
  }
};

/**
 * Simula otorgar acceso a una sala
 * @param {number} roomNumber - Número de la sala
 */
export const grantRoomAccess = (roomNumber) => {
  localStorage.setItem(`room_${roomNumber}_access`, 'true');
};

/**
 * Verifica si el usuario tiene acceso a una sala
 * @param {number} roomNumber - Número de la sala
 * @returns {boolean} - True si tiene acceso
 */
export const checkRoomAccess = (roomNumber) => {
  return !!localStorage.getItem(`room_${roomNumber}_access`);
};

/**
 * Obtiene información de la sala
 * @param {number} roomNumber - Número de la sala
 * @returns {object} - Información de la sala
 */
export const getRoomInfo = (roomNumber) => {
  const rooms = {
    1: {
      id: 1,
      name: 'Código del Dinero',
      description: 'La membresía para empresarios que no quieren avanzar solos',
      color: '#69E4FF',
      members: '2.5k'
    },
    2: {
      id: 2,
      name: 'Máquina del Dinero',
      description: 'Duplica el crecimiento de tu empresa en 12 meses',
      color: '#69E4FF',
      members: '1.8k'
    },
    3: {
      id: 3,
      name: 'Maestría',
      description: 'Únete al círculo privado de empresarios que acompaño personalmente',
      color: '#69E4FF',
      members: '1.2k'
    }
  };
  
  return rooms[roomNumber] || null;
};
