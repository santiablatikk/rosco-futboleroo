// Variables globales
let currentUsername = null;
let isAutoRefreshEnabled = true;

// profile.js - Funcionalidad para la página de perfil
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando perfil de usuario...');
  
  // Inicializar perfil
  initializeUserProfile();
  
  // Agregar botón para ver todos los perfiles
  addViewAllProfilesButton();
  
  // Configurar botón de restablecimiento de perfil
  setupResetProfileButton();
  
  // Iniciar actualización automática si estamos viendo el perfil actual
  const urlParams = new URLSearchParams(window.location.search);
  const usernameParam = urlParams.get('username');
  
  if (!usernameParam) {
    startAutoRefresh();
  }
});

// Función para iniciar la actualización automática del perfil
function startAutoRefresh() {
  // Verificar si hay una actualización pendiente (si el usuario viene de completar una partida)
  const hasRecentGame = isComingFromGameCompletion();
  
  // Si hay una partida reciente, hacer una actualización inmediata
  if (hasRecentGame) {
    refreshProfileData(true);
    showProfileUpdatedNotification();
  }
  
  // Configurar actualización periódica
  setInterval(() => {
    refreshProfileData();
  }, 20000); // Actualizar cada 20 segundos
}

// Función para actualizar datos del perfil desde el servidor
async function refreshProfileData(forceRefresh = false) {
  const username = localStorage.getItem('username');
  if (!username) return;
  
  try {
    // Si no se fuerza la actualización, mostrar indicador discreto
    let loadingIndicator = null;
    if (forceRefresh) {
      loadingIndicator = showEnhancedLoadingIndicator();
    }
    
    // Obtener datos actualizados directamente del servidor
    const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      throw new Error(`Error al actualizar perfil: ${response.status} ${response.statusText}`);
    }
    
    const profile = await response.json();
    
    // Verificar que los datos sean válidos
    if (!profile || typeof profile !== 'object' || !profile.name) {
      throw new Error('Datos de perfil inválidos recibidos del servidor');
    }
    
    // Actualizar la interfaz con los nuevos datos
    updateProfileDisplay(profile);
    
    // Si se forzó la actualización, mostrar mensaje de éxito
    if (forceRefresh) {
      showToast('Perfil actualizado correctamente', 'success');
    }
    
    return profile;
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    
    if (forceRefresh) {
      showToast('Error al actualizar perfil: ' + error.message, 'error');
    }
    
    return null;
  } finally {
    // Eliminar indicador de carga si existe
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }
}

// Función para mostrar notificación de perfil actualizado
function showProfileUpdatedNotification() {
  // Solo mostrar si viene de completar una partida
  if (!isComingFromGameCompletion()) return;
  
  const lastGameStats = JSON.parse(localStorage.getItem('lastGameStats'));
  
  // Crear notificación
  const notification = document.createElement('div');
  notification.className = 'update-notification success';
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="fas fa-user-check"></i>
    </div>
    <div class="notification-content">
      <h3 class="notification-title">¡Perfil Actualizado!</h3>
      <p class="notification-message">
        Tu perfil ha sido actualizado con los datos de tu última partida.
        Puntuación: <strong>${lastGameStats.score}</strong>
      </p>
    </div>
    <button class="notification-close"><i class="fas fa-times"></i></button>
  `;
  
  // Añadir a la página
  document.body.appendChild(notification);
  
  // Mostrar con animación
  setTimeout(() => {
    notification.classList.add('show');
  }, 500);
  
  // Configurar botón de cierre
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
  }
  
  // Cerrar automáticamente después de 10 segundos
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 10000);
}

// Función para verificar si el usuario viene de completar una partida
function isComingFromGameCompletion() {
  const lastGameStats = localStorage.getItem('lastGameStats');
  if (!lastGameStats) return false;
  
  try {
    const stats = JSON.parse(lastGameStats);
    const gameDate = new Date(stats.date);
    const now = new Date();
    
    // Comprobar si la partida se completó hace menos de 5 minutos
    const minutesSinceGame = (now - gameDate) / (1000 * 60);
    return minutesSinceGame < 5;
  } catch (error) {
    console.error('Error al parsear lastGameStats:', error);
    return false;
  }
}

// Agregar botón para ver todos los perfiles
function addViewAllProfilesButton() {
  const container = document.querySelector('.action-button.primary').parentNode;
  
  const allProfilesButton = document.createElement('a');
  allProfilesButton.href = 'all-profiles.html';
  allProfilesButton.className = 'action-button';
  allProfilesButton.innerHTML = '<i class="fas fa-users"></i> Ver Todos los Perfiles';
  
  container.appendChild(allProfilesButton);
}

// Cargar perfil específico
async function loadUserProfile(username) {
  if (!username) {
    showProfileError(new Error('Nombre de usuario no especificado'));
    return null;
  }

  // Mostrar indicador de carga
  const loadingIndicator = showEnhancedLoadingIndicator();
  
  try {
    console.log(`Cargando perfil para usuario: ${username}`);
    
    // Obtener datos solo desde el servidor
    const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener perfil del servidor: ${response.status} ${response.statusText}`);
    }
    
    const profile = await response.json();
    
    // Verificar que los datos sean válidos
    if (!profile || typeof profile !== 'object' || !profile.name) {
      throw new Error(`No se encontró el perfil para "${username}"`);
    }
    
    console.log('Perfil cargado correctamente:', profile);
    
    // Actualizar interfaz con los datos obtenidos
    updateProfileDisplay(profile);
    
    // Mostrar botón de edición solo si es el perfil del usuario actual
    const currentUser = localStorage.getItem('username');
    const editButtons = document.querySelectorAll('.edit-profile-button');
    
    editButtons.forEach(button => {
      if (currentUser && username === currentUser) {
        button.style.display = 'block';
      } else {
        button.style.display = 'none';
      }
    });
    
    return profile;
  } catch (error) {
    console.error('Error cargando perfil:', error);
    showProfileError(error);
    return null;
  } finally {
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }
}

// Mostrar error de carga de perfil
function showProfileError(error) {
  const container = document.querySelector('.content-container');
  
  if (!container) return;
  
  const errorMsg = document.createElement('div');
  errorMsg.className = 'notification error';
  errorMsg.innerHTML = `
    <div class="notification-icon">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <div class="notification-content">
      <h3 class="notification-title">Error al cargar perfil</h3>
      <p class="notification-message">${error.message || 'No se pudo cargar el perfil solicitado.'}</p>
    </div>
  `;
  
  // Insertar antes del primer card
  const firstCard = container.querySelector('.card');
  if (firstCard) {
    container.insertBefore(errorMsg, firstCard);
  } else {
    container.appendChild(errorMsg);
  }
}

// Función para mostrar indicador de carga mejorado
function showEnhancedLoadingIndicator() {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-overlay';
  loadingIndicator.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-circle-notch fa-spin"></i>
      <p>Cargando perfil...</p>
    </div>
  `;
  
  loadingIndicator.style.position = 'fixed';
  loadingIndicator.style.top = '0';
  loadingIndicator.style.left = '0';
  loadingIndicator.style.width = '100%';
  loadingIndicator.style.height = '100%';
  loadingIndicator.style.background = 'rgba(15, 23, 42, 0.8)';
  loadingIndicator.style.display = 'flex';
  loadingIndicator.style.alignItems = 'center';
  loadingIndicator.style.justifyContent = 'center';
  loadingIndicator.style.zIndex = '9999';
  
  document.body.appendChild(loadingIndicator);
  
  return loadingIndicator;
}

// Inicializa el perfil de usuario
async function initializeUserProfile() {
  try {
    // Verificar si hay un usuario especificado en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get('username');
    
    // Obtener nombre de usuario del localStorage si no hay parámetro
    currentUsername = usernameParam || localStorage.getItem('username') || 'Jugador';
    
    // Actualizar título de la página con el nombre de usuario
    if (usernameParam) {
      document.querySelector('.page-title').textContent = `Perfil de ${usernameParam}`;
      document.querySelector('.page-subtitle').textContent = `Estadísticas, logros y progreso de ${usernameParam}`;
      
      // Ocultar botón de reset si no es el propio perfil
      const resetBtn = document.getElementById('reset-profile-btn');
      if (resetBtn && localStorage.getItem('username') !== usernameParam) {
        resetBtn.style.display = 'none';
      }
    }
    
    // Cargar perfil del usuario especificado
    await loadUserProfile(currentUsername);
    
  } catch (error) {
    console.error('Error inicializando perfil de usuario:', error);
    displayProfileError('No se pudo inicializar el perfil. Por favor, intenta nuevamente más tarde.');
  }
}

// Modificar la función detectUserIP para ser más robusta
async function detectUserIP() {
  try {
    // Verificar si ya tenemos la IP guardada
    const savedIP = localStorage.getItem('userIP');
    if (savedIP) {
      console.log('IP del usuario ya almacenada:', savedIP);
      return savedIP;
    }
    
    // Obtener IP usando servicio externo
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      throw new Error('No se pudo obtener la IP');
    }
    
    const data = await response.json();
    const userIP = data.ip;
    
    // Guardar IP en localStorage para uso futuro
    localStorage.setItem('userIP', userIP);
    console.log('IP del usuario detectada y guardada:', userIP);
    
    return userIP;
  } catch (error) {
    console.error('Error al detectar IP del usuario:', error);
    // Usar un valor por defecto si falla
    const defaultIP = 'unknown-ip';
    localStorage.setItem('userIP', defaultIP);
    return defaultIP;
  }
}

// Cargar perfil del usuario desde localStorage y/o servidor
async function loadUserProfile(userIP, forceReload = false) {
  const loadingIndicator = showEnhancedLoadingIndicator();
  
  try {
    console.log('Cargando perfil para IP:', userIP);
    
    // Intentar cargar desde localStorage primero
    let profile = null;
    
    if (!forceReload) {
      profile = loadProfileFromLocalStorage(userIP);
      
      if (profile) {
        console.log('Perfil cargado desde localStorage');
        
        // Actualizar UI con los datos del perfil
        updateProfileDisplay(profile);
        
        // Cargar logros
        const achievements = loadAchievementsFromLocalStorage(userIP);
        if (achievements) {
          updateAchievementsDisplay(achievements);
        }
        
        // Buscar posición en el ranking
        const playerName = profile.name || Utils.getUsernameFromStorage();
        if (playerName) {
          await fetchPlayerRankingPosition(playerName);
        }
        
        return;
      }
    }
    
    // Si no hay perfil en localStorage o se fuerza recarga, intentar desde el servidor
    console.log('Intentando cargar perfil desde el servidor...');
    
    // Obtener nombre de usuario
    const playerName = Utils.getUsernameFromStorage();
    
    if (!playerName) {
      throw new Error('No se ha encontrado un nombre de usuario');
    }
    
    // Hacer solicitud al servidor
    const response = await fetch(`/api/profile?name=${encodeURIComponent(playerName)}`);
    
    if (!response.ok) {
      throw new Error('No se pudo obtener el perfil desde el servidor');
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error(data.error || 'Datos de perfil inválidos');
    }
    
    // Guardar perfil en localStorage
    const profileKey = `profile_${userIP}`;
    localStorage.setItem(profileKey, JSON.stringify(data));
    
    // Actualizar UI con los datos del perfil
    updateProfileDisplay(data);
    
    // Actualizar logros si existen
    if (data.achievements) {
      saveAchievementsForIP(data.achievements, userIP);
      updateAchievementsDisplay(data.achievements);
    }
    
    // Buscar posición en el ranking
    await fetchPlayerRankingPosition(playerName);
    
    console.log('Perfil cargado exitosamente desde el servidor');
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    
    // Si falla la carga desde el servidor, intentar cargar desde localStorage
    if (forceReload) {
      const profile = loadProfileFromLocalStorage(userIP);
      
      if (profile) {
        console.log('Usando perfil de respaldo desde localStorage');
        updateProfileDisplay(profile);
        
        const achievements = loadAchievementsFromLocalStorage(userIP);
        if (achievements) {
          updateAchievementsDisplay(achievements);
        }
        
        return;
      }
    }
    
    // Si todo falla, mostrar error
    displayProfileError('No se pudo cargar el perfil. Verifica tu conexión a internet.');
  } finally {
    // Ocultar indicador de carga
    document.getElementById('loading-container')?.classList.add('hidden');
  }
}

// Cargar perfil desde localStorage basado en IP
function loadProfileFromLocalStorage(userIP) {
  try {
    const profileKey = `profile_${userIP}`;
    const profileData = localStorage.getItem(profileKey);
    
    if (!profileData) {
      return null;
    }
    
    const profile = JSON.parse(profileData);
    
    // Verificar que el perfil tiene los campos necesarios
    if (!profile || !profile.name) {
      return null;
    }
    
    return profile;
  } catch (error) {
    console.error('Error al cargar perfil desde localStorage:', error);
    return null;
  }
}

// Cargar logros desde localStorage basado en IP
function loadAchievementsFromLocalStorage(userIP) {
  try {
    const achievementsKey = `achievements_${userIP}`;
    const achievementsData = localStorage.getItem(achievementsKey);
    
    if (!achievementsData) {
      return null;
    }
    
    return JSON.parse(achievementsData);
  } catch (error) {
    console.error('Error al cargar logros desde localStorage:', error);
    return null;
  }
}

// Guardar logros para una IP específica
function saveAchievementsForIP(achievements, userIP) {
  try {
    if (!achievements) return;
    
    // Procesar datos de logros si es necesario
    const processedAchievements = typeof achievements === 'string' 
      ? processAchievementsJson(achievements) 
      : achievements;
    
    // Guardar en localStorage
    const achievementsKey = `achievements_${userIP}`;
    localStorage.setItem(achievementsKey, JSON.stringify(processedAchievements));
    
    console.log('Logros guardados para IP:', userIP);
  } catch (error) {
    console.error('Error al guardar logros:', error);
  }
}

// Procesar el JSON de logros
function processAchievementsJson(achievementsJson) {
  try {
    // Si ya es un objeto, devolverlo directamente
    if (typeof achievementsJson === 'object') {
      return achievementsJson;
    }
    
    // Intentar hacer parse del JSON
    const parsed = JSON.parse(achievementsJson);
    
    // Verificar estructura
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Formato de logros inválido');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error al procesar JSON de logros:', error);
    return {};
  }
}

// Actualizar la interfaz con los datos del perfil
function updateProfileDisplay(profile) {
  if (!profile || typeof profile !== 'object' || !profile.name) {
    displayProfileError('No se pudo cargar el perfil o los datos no son válidos');
    return;
  }
  
  try {
    // Actualizar nombre del jugador
    document.getElementById('player-name').textContent = profile.name || 'Jugador';
    
    // Actualizar estadísticas básicas solo con datos reales
    document.getElementById('games-played').textContent = profile.gamesPlayed || profile.games_played || 0;
    document.getElementById('total-score').textContent = profile.bestScore || profile.best_score || 0;
    
    // Actualizar porcentaje de éxito
    const totalQuestions = (profile.totalQuestions || profile.total_questions || 0);
    const correctAnswers = (profile.totalCorrect || profile.total_correct || 0);
    let successRate = 0;
    
    if (totalQuestions > 0) {
      successRate = Math.round((correctAnswers / totalQuestions) * 100);
    }
    
    document.getElementById('success-rate').textContent = successRate;
    
    // Estadísticas detalladas
    document.getElementById('correct-answers').textContent = correctAnswers;
    document.getElementById('wrong-answers').textContent = 
      (profile.totalWrong || profile.total_wrong || 0);
    
    // Mejor racha - usar solo datos reales
    document.getElementById('best-streak').textContent = 
      (profile.bestStreak || profile.best_streak || 0);
    
    // Tiempo promedio
    let avgTime = 0;
    const totalTime = (profile.totalTime || profile.total_time || 0);
    const gamesPlayed = (profile.gamesPlayed || profile.games_played || 0);
    
    if (gamesPlayed > 0) {
      avgTime = Math.round(totalTime / gamesPlayed);
    }
    
    document.getElementById('avg-time').textContent = 
      avgTime > 0 ? `${avgTime}s` : '0s';
    
    // Actualizar info de nivel y XP si existe
    const playerLevel = Math.max(1, Math.floor((profile.bestScore || 0) / 1000) + 1);
    const currentXP = (profile.bestScore || 0) % 1000;
    const nextLevelXP = 1000;
    
    document.getElementById('current-level').textContent = playerLevel;
    document.getElementById('current-xp').textContent = currentXP;
    document.getElementById('level-up-xp').textContent = nextLevelXP;
    document.getElementById('next-level').textContent = playerLevel + 1;
    document.getElementById('xp-needed').textContent = nextLevelXP - currentXP;
    
    // Actualizar barra de progreso
    const progressPercentage = (currentXP / nextLevelXP) * 100;
    document.getElementById('level-progress').style.width = `${progressPercentage}%`;
    
    // Actualizar posición en el ranking global
    let globalRank = 'N/A';
    
    if (profile.global_ranking && typeof profile.global_ranking === 'object') {
      globalRank = profile.global_ranking.current_position || 'N/A';
    }
    
    document.getElementById('global-rank').textContent = globalRank;
    
    // Actualizar historial si existe
    if (Array.isArray(profile.history) && profile.history.length > 0) {
      updateGameHistory(profile.history);
    } else {
      // Si no hay historial, mostrar mensaje
      const historyBody = document.getElementById('history-body');
      if (historyBody) {
        historyBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 30px;">
              <i class="fas fa-history" style="font-size: 1.5rem; margin-bottom: 10px; display: block; color: var(--gray);"></i>
              <p style="margin: 0; color: var(--text-secondary);">Aún no hay partidas registradas</p>
            </td>
          </tr>
        `;
      }
    }
    
    // Actualizar logros si existen
    if (profile.achievements && typeof profile.achievements === 'object') {
      updateAchievementsDisplay(profile.achievements);
    }
    
    // Mostrar botón de restablecimiento solo si es el propio perfil
    const resetBtn = document.getElementById('reset-profile-btn');
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get('username');
    const currentUser = localStorage.getItem('username');
    
    if (resetBtn) {
      if (!usernameParam || usernameParam === currentUser) {
        resetBtn.style.display = 'inline-flex';
      } else {
        resetBtn.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error al actualizar interfaz del perfil:', error);
    displayProfileError('Error al mostrar el perfil. Los datos pueden estar incompletos.');
  }
}

// Obtener la posición del jugador en el ranking
async function fetchPlayerRankingPosition(playerName) {
  if (!playerName) return;
  
  try {
    console.log('Buscando posición en ranking para:', playerName);
    
    // Intentar obtener datos del ranking desde /api/rankings primero
    let response = await fetch('/api/rankings');
    let data = await response.json();
    let rankings = [];
    
    // Comprobar el formato de la respuesta - puede ser un array o un objeto con .rankings
    if (data && data.rankings && Array.isArray(data.rankings)) {
      rankings = data.rankings;
    } else if (Array.isArray(data)) {
      rankings = data;
    } else {
      // Si la respuesta de /api/rankings no es válida, intentar con /api/ranking
      response = await fetch('/api/ranking');
      
      if (!response.ok) {
        throw new Error('No se pudo obtener datos del ranking');
      }
      
      data = await response.json();
      
      if (Array.isArray(data)) {
        rankings = data;
      } else {
        throw new Error('Formato de datos de ranking inválido');
      }
    }
    
    // Ordenar por puntuación (mayor a menor)
    rankings.sort((a, b) => b.score - a.score);
    
    // Buscar la posición del jugador en el ranking
    const playerIndex = rankings.findIndex(entry => 
      entry.name && entry.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (playerIndex >= 0) {
      // Posición del jugador (índice + 1)
      const position = playerIndex + 1;
      
      // Actualizar la UI con la posición
      const rankingElement = document.getElementById('ranking-position');
      if (rankingElement) {
        rankingElement.textContent = position;
      }
      
      // Actualizar badge visual según posición
      updateRankingBadge(position, rankings.length);
      
      // Actualizar "Players Beaten" stat
      updatePlayersBeatStat(playerName, rankings);
      
      return position;
    } else {
      // Jugador no encontrado en el ranking
      const rankingElement = document.getElementById('ranking-position');
      if (rankingElement) {
        rankingElement.textContent = '-';
      }
      
      // Actualizar badge visual para "Sin clasificar"
      updateRankingBadge(0, rankings.length);
      
      return null;
    }
  } catch (error) {
    console.error('Error al obtener posición en el ranking:', error);
    
    // Actualizar UI para mostrar error
    const rankingElement = document.getElementById('ranking-position');
    if (rankingElement) {
      rankingElement.textContent = '-';
    }
    
    return null;
  }
}

// Actualizar el indicador visual según la posición en el ranking
function updateRankingBadge(position, totalPlayers) {
  const badgeElement = document.getElementById('ranking-badge');
  if (!badgeElement) return;
  
  // Limpiar clases anteriores
  badgeElement.className = 'ranking-badge';
  
  // Si no tiene posición
  if (!position || position <= 0) {
    badgeElement.classList.add('unranked');
    badgeElement.innerHTML = '<i class="fas fa-question"></i>';
    return;
  }
  
  // Determinar clase según posición
  let badgeClass = '';
  let icon = '';
  
  if (position === 1) {
    badgeClass = 'gold';
    icon = '<i class="fas fa-crown"></i>';
  } else if (position === 2) {
    badgeClass = 'silver';
    icon = '<i class="fas fa-medal"></i>';
  } else if (position === 3) {
    badgeClass = 'bronze';
    icon = '<i class="fas fa-award"></i>';
  } else if (position <= 10) {
    badgeClass = 'top-10';
    icon = '<i class="fas fa-star"></i>';
  } else if (position <= 50) {
    badgeClass = 'top-50';
    icon = '<i class="fas fa-thumbs-up"></i>';
  } else {
    badgeClass = 'normal';
    icon = '<i class="fas fa-user"></i>';
  }
  
  badgeElement.classList.add(badgeClass);
  badgeElement.innerHTML = icon;
  
  // Añadir tooltip con información
  badgeElement.setAttribute('title', `Posición #${position} de ${totalPlayers} jugadores`);
}

// Mostrar mensaje de error en perfil
function displayProfileError(message = 'No se pudo cargar el perfil') {
  // Ocultar indicador de carga
  document.getElementById('loading-container')?.classList.add('hidden');
  
  // Crear elemento de error
  const errorContainer = document.createElement('div');
  errorContainer.className = 'profile-error';
  errorContainer.innerHTML = `
    <div class="error-icon">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <div class="error-content">
      <h3>Error</h3>
      <p>${message}</p>
    </div>
    <button class="retry-button">
      <i class="fas fa-redo"></i> Intentar nuevamente
    </button>
  `;
  
  // Estilos para el contenedor de error
  errorContainer.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
  errorContainer.style.color = 'white';
  errorContainer.style.padding = '20px';
  errorContainer.style.borderRadius = '10px';
  errorContainer.style.maxWidth = '500px';
  errorContainer.style.margin = '40px auto';
  errorContainer.style.textAlign = 'center';
  errorContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  
  // Estilos para componentes internos
  const style = document.createElement('style');
  style.textContent = `
    .profile-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: errorShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    
    @keyframes errorShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-10px); }
      40%, 80% { transform: translateX(10px); }
    }
    
    .error-icon {
      font-size: 48px;
      margin-bottom: 15px;
      animation: pulse 2s infinite;
    }
    
    .error-content h3 {
      margin: 0 0 10px 0;
      font-size: 22px;
    }
    
    .error-content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      opacity: 0.9;
    }
    
    .retry-button {
      background-color: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .retry-button:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
  `;
  
  document.head.appendChild(style);
  
  // Mostrar error
  const contentContainer = document.querySelector('.profile-content') || document.querySelector('.container');
  contentContainer.innerHTML = '';
  contentContainer.appendChild(errorContainer);
  
  // Manejar clic en botón de reintento
  const retryButton = errorContainer.querySelector('.retry-button');
  retryButton.addEventListener('click', async () => {
    // Eliminar error
    errorContainer.remove();
    
    // Mostrar indicador de carga nuevamente
    showEnhancedLoadingIndicator();
    
    // Reintentar carga de perfil
    const userIP = localStorage.getItem('userIP') || await detectUserIP();
    await loadUserProfile(userIP, true);
  });
}

// Actualizar la visualización de logros
function updateAchievementsDisplay(achievements) {
  const container = document.querySelector('.achievements-container');
  if (!container) return;
  
  // Limpiar contenedor
  container.innerHTML = '';
  
  // Si no hay logros, mostrar mensaje
  if (!achievements || Object.keys(achievements).length === 0) {
    container.innerHTML = `
      <div class="no-achievements">
        <i class="fas fa-trophy"></i>
        <p>Aún no has desbloqueado ningún logro. ¡Juega para conseguirlos!</p>
      </div>
    `;
    return;
  }
  
  // Obtener definiciones de todos los logros disponibles
  const allAchievements = getAvailableAchievements();
  
  // Crear cards para cada logro desbloqueado
  Object.keys(achievements).forEach(id => {
    const achievementData = achievements[id];
    const achievementDefinition = allAchievements.find(a => a.id === id);
    
    if (!achievementDefinition) return; // Ignorar si no se encuentra la definición
    
    const achievementElement = createAchievementCard(
      achievementDefinition, 
      achievementData.count,
      achievementData.date,
      achievementData.category || achievementDefinition.category
    );
    
    container.appendChild(achievementElement);
  });
  
  // Agregar botón para ver todos los logros
  const footerDiv = document.createElement('div');
  footerDiv.className = 'achievements-footer';
  footerDiv.innerHTML = `
    <a href="logros.html" class="view-all-achievements">
      <i class="fas fa-trophy"></i> Ver todos los logros
    </a>
  `;
  container.insertAdjacentElement('afterend', footerDiv);
}

// Crear tarjeta de logro
function createAchievementCard(achievement, count, date, category) {
  const card = document.createElement('div');
  card.className = 'achievement-item';
  card.setAttribute('data-category', category);
  
  // Calcular progreso
  const progress = achievement.maxCount > 1 
    ? Math.min(100, (count / achievement.maxCount) * 100) 
    : 100;
  
  // Formatear fecha
  const achievementDate = formatAchievementDate(date);
  
  // Obtener texto para la categoría
  const categoryText = getCategoryText(category);
  
  card.innerHTML = `
    <div class="achievement-header">
      <div class="achievement-icon">
        <i class="${achievement.icon}"></i>
      </div>
      <div class="achievement-title-wrapper">
        <h4 class="achievement-title">${achievement.title}</h4>
        <span class="achievement-category ${category}">${categoryText}</span>
      </div>
    </div>
    <div class="achievement-body">
      <div class="achievement-description">${achievement.description}</div>
      <div class="achievement-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${achievement.maxCount > 1 ? `${count}/${achievement.maxCount}` : 'Completado'}</span>
          <span class="progress-date">${progress}%</span>
        </div>
      </div>
    </div>
    <div class="achievement-footer">
      <div class="achievement-date">
        <i class="fas fa-calendar-check"></i>
        <span>Desbloqueado: ${achievementDate}</span>
      </div>
    </div>
  `;
  
  // Animar la barra de progreso
  setTimeout(() => {
    const progressBar = card.querySelector('.progress-fill');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }, 100);
  
  return card;
}

// Formatear fecha para logros
function formatAchievementDate(dateString) {
  if (!dateString) return 'Desconocido';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return 'Fecha inválida';
  }
}

// Obtener texto descriptivo de categoría
function getCategoryText(category) {
  switch (category) {
    case 'beginner': return 'Principiante';
    case 'intermediate': return 'Intermedio';
    case 'expert': return 'Experto';
    case 'special': return 'Especial';
    default: return 'Desconocido';
  }
}

// Función para actualizar el historial de juego
function updateGameHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    // Mostrar un mensaje cuando no hay historial
    const historyBody = document.getElementById('history-body');
    if (historyBody) {
      historyBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px;">
            <i class="fas fa-history" style="font-size: 1.5rem; margin-bottom: 10px; display: block; color: var(--gray);"></i>
            <p style="margin: 0; color: var(--text-secondary);">Aún no hay partidas registradas</p>
          </td>
        </tr>
      `;
    }
    return;
  }
  
  const historyBody = document.getElementById('history-body');
  if (!historyBody) return;
  
  // Limpiar contenido anterior
  historyBody.innerHTML = '';
  
  // Filtrar entradas inválidas
  const validHistory = history.filter(entry => 
    entry && typeof entry === 'object' && typeof entry.date === 'string'
  );
  
  // Ordenar por fecha (más reciente primero)
  validHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Crear filas para cada entrada del historial
  validHistory.forEach(entry => {
    const row = document.createElement('tr');
    
    // Convertir fecha
    const gameDate = new Date(entry.date);
    const formattedDate = gameDate.toLocaleDateString();
    
    // Crear contenido de la fila
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${formatDifficulty(entry.difficulty)}</td>
      <td>${entry.score || 0}</td>
      <td>${entry.correct || 0}</td>
      <td>${entry.wrong || entry.errors || 0}</td>
      <td>${formatTime(entry.timeUsed || entry.time_used || 0)}</td>
      <td>
        ${entry.victory 
          ? '<span class="badge success"><i class="fas fa-check"></i> Victoria</span>' 
          : '<span class="badge danger"><i class="fas fa-times"></i> Derrota</span>'}
        ${entry.global_position 
          ? `<span class="badge primary"><i class="fas fa-trophy"></i> Posición #${entry.global_position}</span>` 
          : ''}
      </td>
    `;
    
    historyBody.appendChild(row);
  });
}

// Formatear tiempo en segundos a formato MM:SS (usando la función desde utils.js)
function formatTime(seconds) {
  return Utils.formatTime(seconds);
}

// Formatear nivel de dificultad
function formatDifficulty(difficulty) {
  switch (difficulty) {
    case 'facil': return 'Fácil';
    case 'normal': return 'Normal';
    case 'dificil': return 'Difícil';
    default: return difficulty;
  }
}

// Actualizar estado del jugador
function updatePlayerStatus(profile) {
  const statusElement = document.getElementById('profile-status');
  if (!statusElement) return;
  
  // Determinar estado basado en estadísticas y logros
  let status = 'Jugador Novato';
  let statusIcon = 'fa-user';
  
  const gamesPlayed = profile.gamesPlayed || 0;
  const correctAnswers = profile.totalCorrect || 0;
  const achievements = profile.achievements || {};
  const achievementCount = Object.keys(achievements).length;
  
  // Verificar si tiene logros de dificultad experto
  const expertAchievements = getAvailableAchievements()
    .filter(a => a.category === 'expert' && achievements[a.id]);
  
  if (expertAchievements.length >= 3) {
    status = 'Maestro del Rosco';
    statusIcon = 'fa-crown';
  } else if (gamesPlayed >= 20 || correctAnswers >= 200) {
    status = 'Jugador Veterano';
    statusIcon = 'fa-user-graduate';
  } else if (achievementCount >= 5 || correctAnswers >= 100) {
    status = 'Jugador Experto';
    statusIcon = 'fa-star';
  } else if (gamesPlayed >= 10 || correctAnswers >= 50) {
    status = 'Jugador Regular';
    statusIcon = 'fa-user-check';
  }
  
  statusElement.innerHTML = `<i class="fas ${statusIcon}"></i> ${status}`;
}

// Obtener lista de logros disponibles
function getAvailableAchievements() {
  // Lista completa de logros disponibles en el juego
  return [
    {
      id: 'first_game',
      title: 'Primer Juego',
      description: 'Completa tu primer rosco de PASALA CHÉ',
      icon: 'fas fa-gamepad',
      category: 'beginner',
      maxCount: 1
    },
    {
      id: 'perfect_game',
      title: 'Partida Perfecta',
      description: 'Completa un rosco sin cometer ningún error',
      icon: 'fas fa-award',
      category: 'expert',
      maxCount: 1
    },
    {
      id: 'speed_demon',
      title: 'Velocista',
      description: 'Completa un rosco en menos de 2 minutos',
      icon: 'fas fa-bolt',
      category: 'expert',
      maxCount: 1
    },
    {
      id: 'five_wins',
      title: 'Experto del Rosco',
      description: 'Gana 5 partidas',
      icon: 'fas fa-medal',
      category: 'intermediate',
      maxCount: 5
    },
    {
      id: 'hard_mode',
      title: 'Nivel Experto',
      description: 'Gana una partida en dificultad difícil',
      icon: 'fas fa-fire',
      category: 'expert',
      maxCount: 1
    },
    {
      id: 'no_help',
      title: 'Sin Ayuda',
      description: 'Completa el rosco sin usar ninguna pista',
      icon: 'fas fa-brain',
      category: 'intermediate',
      maxCount: 1
    },
    {
      id: 'no_pass',
      title: 'Directo al Grano',
      description: 'Completa el rosco sin saltar ninguna pregunta',
      icon: 'fas fa-check-double',
      category: 'expert',
      maxCount: 1
    },
    {
      id: 'comeback_king',
      title: 'Rey de la Remontada',
      description: 'Gana después de tener 5 respuestas incorrectas',
      icon: 'fas fa-crown',
      category: 'special',
      maxCount: 1
    },
    {
      id: 'night_owl',
      title: 'Búho Nocturno',
      description: 'Juega una partida después de medianoche',
      icon: 'fas fa-moon',
      category: 'special',
      maxCount: 1
    },
    {
      id: 'challenge_accepted',
      title: 'Desafío Aceptado',
      description: 'Completa un desafío diario',
      icon: 'fas fa-flag',
      category: 'special',
      maxCount: 1
    }
  ];
}

// Función de ayuda para guardar historial de juego basado en IP
// Esta función debe ser llamada desde el archivo principal del juego cuando termina una partida
function saveGameToHistory(gameData, userIP) {
  if (!gameData || !userIP) return;
  
  try {
    // Clave específica para el historial de esta IP
    const historyKey = `gameHistory_${userIP}`;
    
    // Obtener historial existente o crear uno nuevo
    let history = [];
    const existingHistory = localStorage.getItem(historyKey);
    
    if (existingHistory) {
      history = JSON.parse(existingHistory);
    }
    
    // Añadir esta partida al historial
    history.unshift({
      ...gameData,
      date: new Date().toISOString() // Asegurar que tiene timestamp
    });
    
    // Limitar el tamaño del historial (opcional)
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    // Guardar historial actualizado
    localStorage.setItem(historyKey, JSON.stringify(history));
    
    console.log('Partida guardada en el historial para IP:', userIP);
    return true;
  } catch (error) {
    console.error('Error guardando partida en historial:', error);
    return false;
  }
}

// Función para guardar un logro desbloqueado, asociado a la IP
function unlockAchievement(achievementId, userIP, count = 1) {
  if (!achievementId || !userIP) return false;
  
  try {
    // Clave de almacenamiento específica para esta IP
    const storageKey = `userAchievements_${userIP}`;
    
    // Cargar logros existentes
    let achievements = [];
    const existingAchievements = localStorage.getItem(storageKey);
    
    if (existingAchievements) {
      achievements = JSON.parse(existingAchievements);
    }
    
    // Buscar si este logro ya existe
    const existingIndex = achievements.findIndex(a => a.id === achievementId);
    
    if (existingIndex >= 0) {
      // Si ya existe, actualizar el contador
      achievements[existingIndex].count = (achievements[existingIndex].count || 1) + count;
      achievements[existingIndex].date = new Date().toISOString(); // Actualizar fecha
    } else {
      // Si es nuevo, añadirlo
      const availableAchievement = getAvailableAchievements().find(a => a.id === achievementId);
      
      if (!availableAchievement) {
        console.error('Logro no encontrado en la lista de logros disponibles:', achievementId);
        return false;
      }
      
      achievements.push({
        id: achievementId,
        unlocked: true,
        count: count,
        category: availableAchievement.category,
        date: new Date().toISOString()
      });
      
      // Mostrar notificación de logro desbloqueado
      showAchievementNotification(availableAchievement);
    }
    
    // Guardar logros actualizados
    localStorage.setItem(storageKey, JSON.stringify(achievements));
    
    console.log('Logro desbloqueado:', achievementId, 'para IP:', userIP);
    return true;
  } catch (error) {
    console.error('Error desbloqueando logro:', error);
    return false;
  }
}

// Mostrar notificación de logro desbloqueado
function showAchievementNotification(achievement) {
  if (!achievement) return;
  
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="${achievement.icon}"></i>
    </div>
    <div class="notification-content">
      <h4>¡Logro Desbloqueado!</h4>
      <p>${achievement.title}</p>
      <span>${achievement.description}</span>
    </div>
    <button class="notification-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Añadir al DOM
  document.body.appendChild(notification);
  
  // Mostrar con animación
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Evento para cerrar
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  });
  
  // Auto-cerrar después de 5 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Función principal para procesar fin de partida y actualizar todos los datos para esta IP
function processGameCompletion(gameData) {
  if (!gameData) return false;
  
  // Obtener IP del usuario
  const userIP = localStorage.getItem('userIP') || 'unknown-ip';
  
  // Guardar datos de la partida en el historial
  saveGameToHistory(gameData, userIP);
  
  // Comprobar y desbloquear logros basados en esta partida
  checkAchievements(gameData, userIP);
  
  return true;
}

// Verificar logros basados en los resultados de una partida
function checkAchievements(gameData, userIP) {
  if (!gameData || !userIP) return;
  
  // Logro: Primer juego
  unlockAchievement('first_game', userIP);
  
  // Logro: Partida perfecta (sin errores)
  if (gameData.wrong === 0 && gameData.correct > 0) {
    unlockAchievement('perfect_game', userIP);
  }
  
  // Logro: Velocista (menos de 2 minutos)
  if (gameData.timeUsed < 120 && gameData.correct > 0) {
    unlockAchievement('speed_demon', userIP);
  }
  
  // Logro: Ganar partidas (contador)
  if (gameData.victory) {
    unlockAchievement('five_wins', userIP);
  }
  
  // Logro: Ganar en dificultad difícil
  if (gameData.victory && gameData.difficulty === 'dificil') {
    unlockAchievement('hard_mode', userIP);
  }
  
  // Logro: Sin usar pistas
  if (gameData.hintsUsed === 0 && gameData.correct > 0) {
    unlockAchievement('no_help', userIP);
  }
  
  // Logro: Sin pasar preguntas
  if (gameData.skipped === 0 && gameData.correct > 0) {
    unlockAchievement('no_pass', userIP);
  }
  
  // Logro: Rey de la remontada
  if (gameData.victory && gameData.wrong >= 5) {
    unlockAchievement('comeback_king', userIP);
  }
  
  // Logro: Búho nocturno (jugar después de medianoche)
  const currentHour = new Date().getHours();
  if (currentHour >= 0 && currentHour < 5) {
    unlockAchievement('night_owl', userIP);
  }
  
  // Otros logros específicos pueden verificarse aquí...
}

// Agregar CSS para notificación de logro
(function addAchievementStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .achievement-notification {
      position: fixed;
      bottom: -100px;
      right: 20px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      border-radius: 12px;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      width: 300px;
      border-left: 4px solid #3b82f6;
      transition: transform 0.3s ease, opacity 0.3s ease;
      transform: translateY(0);
      opacity: 0;
    }
    
    .achievement-notification.show {
      transform: translateY(-120px);
      opacity: 1;
    }
    
    .notification-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #3b82f6;
      flex-shrink: 0;
    }
    
    .notification-content {
      flex: 1;
    }
    
    .notification-content h4 {
      margin: 0 0 5px;
      color: #fff;
      font-size: 16px;
    }
    
    .notification-content p {
      margin: 0 0 3px;
      color: #e11d48;
      font-weight: bold;
      font-size: 14px;
    }
    
    .notification-content span {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      display: block;
    }
    
    .notification-close {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 5px;
      font-size: 14px;
      transition: color 0.3s ease;
    }
    
    .notification-close:hover {
      color: #fff;
    }
  `;
  document.head.appendChild(styleEl);
})();

function showEnhancedLoadingIndicator() {
  // Create a nicer loading indicator
  const profileContent = document.querySelector('.profile-content');
  if (!profileContent) return;
  
  // Remove existing content temporarily
  const originalContent = profileContent.innerHTML;
  profileContent.innerHTML = `
    <div class="enhanced-loading">
      <div class="loading-animation">
        <div class="football-spinner">
          <i class="fas fa-futbol"></i>
        </div>
        <div class="loading-particles">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div class="loading-text">
        <h3>Cargando tu perfil</h3>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <span class="loading-percentage">0%</span>
        </div>
        <p class="loading-message">Obteniendo tus estadísticas y logros...</p>
      </div>
    </div>
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    .enhanced-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      text-align: center;
      padding: 2rem;
      background: rgba(15, 23, 42, 0.7);
      border-radius: 15px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(59, 130, 246, 0.2);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      position: relative;
    }
    
    .enhanced-loading::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #e11d48, #fb7185);
      z-index: 1;
    }
    
    .loading-animation {
      position: relative;
      margin-bottom: 2rem;
      width: 100px;
      height: 100px;
    }
    
    .football-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 3.5rem;
      color: #e11d48;
      animation: spin-bounce 2s infinite;
      z-index: 2;
      filter: drop-shadow(0 0 10px rgba(225, 29, 72, 0.5));
    }
    
    .loading-particles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .loading-particles span {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #e11d48;
      opacity: 0.7;
      animation: particle-orbit 1.5s linear infinite;
    }
    
    .loading-particles span:nth-child(1) {
      animation-delay: 0s;
    }
    
    .loading-particles span:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    .loading-particles span:nth-child(3) {
      animation-delay: 0.6s;
    }
    
    .loading-particles span:nth-child(4) {
      animation-delay: 0.9s;
    }
    
    .loading-particles span:nth-child(5) {
      animation-delay: 1.2s;
    }
    
    .loading-text h3 {
      margin: 0 0 1.2rem 0;
      color: white;
      font-size: 1.7rem;
      font-weight: 600;
      text-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #e11d48, #fb7185);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    
    .loading-progress {
      width: 240px;
      margin: 0 auto 1rem;
    }
    
    .progress-bar {
      height: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 0.5rem;
      box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    }
    
    .progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #e11d48, #fb7185);
      border-radius: 5px;
      transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 10px rgba(225, 29, 72, 0.5);
    }
    
    .loading-percentage {
      font-size: 0.9rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .loading-message {
      margin: 0.5rem 0 0;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.7);
      font-style: italic;
    }
    
    @keyframes spin-bounce {
      0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
      25% { transform: translate(-50%, -50%) scale(1.1) rotate(90deg); }
      50% { transform: translate(-50%, -50%) scale(1) rotate(180deg); }
      75% { transform: translate(-50%, -50%) scale(1.1) rotate(270deg); }
    }
    
    @keyframes particle-orbit {
      0% {
        transform: translate(-50%, -50%) rotate(0deg) translateX(35px) rotate(0deg);
        opacity: 1;
        scale: 1;
      }
      100% {
        transform: translate(-50%, -50%) rotate(360deg) translateX(35px) rotate(-360deg);
        opacity: 0.5;
        scale: 0.8;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Loading messages to cycle through
  const loadingMessages = [
    "Obteniendo tus estadísticas y logros...",
    "Calculando tu rendimiento...",
    "Analizando tus últimas partidas...",
    "Comprobando récords personales...",
    "Preparando tu perfil de jugador...",
    "¡Casi listo!"
  ];
  
  // Animate loading
  let progress = 0;
  const progressFill = document.querySelector('.progress-fill');
  const percentageText = document.querySelector('.loading-percentage');
  const messageElement = document.querySelector('.loading-message');
  let messageIndex = 0;
  
  // Progress interval
  const interval = setInterval(() => {
    // Calculate progress increase (slower at the beginning, faster toward the end)
    let increment;
    if (progress < 30) {
      increment = 1 + Math.random() * 2; // Slower start
    } else if (progress < 70) {
      increment = 2 + Math.random() * 3; // Medium pace
    } else if (progress < 90) {
      increment = 0.5 + Math.random() * 1; // Slow down near end
    } else {
      increment = 0.1 + Math.random() * 0.5; // Very slow at the end
    }
    
    progress += increment;
    if (progress > 95) progress = 95; // Cap at 95% until actual load complete
    
    progressFill.style.width = `${progress}%`;
    percentageText.textContent = `${Math.round(progress)}%`;
    
    // Change message occasionally
    if (Math.random() < 0.1 && messageIndex < loadingMessages.length - 1) {
      messageIndex++;
      if (messageElement) {
        messageElement.style.opacity = '0';
        setTimeout(() => {
          messageElement.textContent = loadingMessages[messageIndex];
          messageElement.style.opacity = '1';
        }, 300);
      }
    }
  }, 180);
  
  return {
    completeLoading: function() {
      clearInterval(interval);
      
      // Animate to 100%
      progressFill.style.width = '100%';
      percentageText.textContent = '100%';
      if (messageElement) {
        messageElement.textContent = "¡Listo!";
      }
      
      // Add completion animation
      const loadingAnimation = document.querySelector('.loading-animation');
      if (loadingAnimation) {
        loadingAnimation.innerHTML = `<div class="loading-complete"><i class="fas fa-check-circle"></i></div>`;
        
        // Add completion style
        const completeStyle = document.createElement('style');
        completeStyle.textContent = `
          .loading-complete {
            font-size: 4rem;
            color: #10b981;
            animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          
          @keyframes scale-in {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(completeStyle);
      }
      
      // Fade out and restore original content
      setTimeout(() => {
        const enhancedLoading = document.querySelector('.enhanced-loading');
        if (enhancedLoading) {
          enhancedLoading.style.opacity = '0';
          enhancedLoading.style.transform = 'translateY(-20px)';
          enhancedLoading.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          
          setTimeout(() => {
            profileContent.innerHTML = originalContent;
          }, 500);
        } else {
          profileContent.innerHTML = originalContent;
        }
      }, 800);
    }
  };
}

// Calcular y mostrar el porcentaje de jugadores superados
function updatePlayersBeatStat(playerName, data) {
  if (!playerName) return;
  
  try {
    // Elemento donde mostrar el porcentaje
    const playersBeatElement = document.getElementById('players-beat');
    if (!playersBeatElement) return;
    
    // Asegurarse de que tenemos un array de rankings
    let rankings = [];
    
    if (data) {
      // Ya tenemos datos pasados como parámetro
      if (Array.isArray(data)) {
        rankings = data;
      } else if (data.rankings && Array.isArray(data.rankings)) {
        rankings = data.rankings;
      }
    } else {
      // Intentar obtener desde localStorage
      const rankingData = localStorage.getItem('rankingData');
      if (rankingData) {
        try {
          const parsedData = JSON.parse(rankingData);
          if (Array.isArray(parsedData)) {
            rankings = parsedData;
          } else if (parsedData.rankings && Array.isArray(parsedData.rankings)) {
            rankings = parsedData.rankings;
          }
        } catch (e) {
          console.error('Error parsing rankingData from localStorage', e);
        }
      }
    }
    
    // Si no hay datos, hacer fetch
    if (rankings.length === 0) {
      // Será manejado de manera asíncrona
      fetchPlayerRankingPosition(playerName);
      return;
    }
    
    // Ordenar por puntuación (mayor a menor)
    rankings.sort((a, b) => b.score - a.score);
    
    // Buscar la posición del jugador en el ranking
    const playerIndex = rankings.findIndex(entry => 
      entry.name && entry.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (playerIndex >= 0) {
      // Calcular porcentaje de jugadores superados
      const totalPlayers = rankings.length;
      const position = playerIndex + 1;
      const playersBeat = totalPlayers - position;
      const percentage = Math.round((playersBeat / totalPlayers) * 100);
      
      // Actualizar la UI con el porcentaje
      playersBeatElement.textContent = `${percentage}%`;
      
      // Añadir clase según el porcentaje
      if (percentage >= 90) {
        playersBeatElement.classList.add('top-tier');
      } else if (percentage >= 70) {
        playersBeatElement.classList.add('high-tier');
      } else if (percentage >= 40) {
        playersBeatElement.classList.add('mid-tier');
      } else {
        playersBeatElement.classList.add('low-tier');
      }
    } else {
      // Jugador no encontrado en el ranking
      playersBeatElement.textContent = '-';
    }
  } catch (error) {
    console.error('Error al calcular jugadores superados:', error);
    document.getElementById('players-beat')?.textContent = '-';
  }
}

// Función para configurar el botón de restablecimiento de perfil
function setupResetProfileButton() {
  const resetBtn = document.getElementById('reset-profile-btn');
  const resetModal = document.getElementById('reset-modal');
  const cancelResetBtn = document.getElementById('cancel-reset');
  const confirmResetBtn = document.getElementById('confirm-reset');
  const usernameModal = document.getElementById('username-modal');
  const cancelUsernameBtn = document.getElementById('cancel-username');
  const confirmUsernameBtn = document.getElementById('confirm-username');
  const newUsernameInput = document.getElementById('new-username');
  
  if (!resetBtn || !resetModal || !usernameModal) return;
  
  // Mostrar el modal de confirmación al hacer clic en el botón de restablecimiento
  resetBtn.addEventListener('click', function() {
    resetModal.style.display = 'block';
  });
  
  // Ocultar modal al cancelar
  if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', function() {
      resetModal.style.display = 'none';
    });
  }
  
  // Manejar el clic en el botón de confirmación
  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', function() {
      // Ocultar modal de confirmación
      resetModal.style.display = 'none';
      
      // Restablecer perfil
      resetProfile();
      
      // Mostrar modal para ingresar nuevo nombre
      usernameModal.style.display = 'block';
    });
  }
  
  // Manejar el cambio de nombre de usuario
  if (cancelUsernameBtn) {
    cancelUsernameBtn.addEventListener('click', function() {
      usernameModal.style.display = 'none';
      window.location.href = 'index.html';
    });
  }
  
  if (confirmUsernameBtn && newUsernameInput) {
    confirmUsernameBtn.addEventListener('click', function() {
      const newUsername = newUsernameInput.value.trim();
      
      if (newUsername) {
        // Guardar nuevo nombre de usuario
        saveNewUsername(newUsername);
        usernameModal.style.display = 'none';
        
        // Mostrar mensaje de éxito
        showToast('Nombre de usuario actualizado correctamente', 'success');
        
        // Recargar la página después de un breve retraso
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Mostrar mensaje de error
        showToast('Por favor ingresa un nombre de usuario válido', 'error');
      }
    });
  }
}

// Función para restablecer el perfil
function resetProfile() {
  try {
    // Eliminar TODOS los datos del perfil del localStorage
    const keysToRemove = [
      'profileData',
      'achievements',
      'gameHistory',
      'currentRankingPosition',
      'lastGameStats',
      'cachedProfiles',
      'cachedRanking',
      'userStats',
      'userLevel',
      'userXP',
      'userBadges',
      'userChallenges',
      'lastUpdate',
      'gamesPlayed',
      'totalScore',
      'correctAnswers',
      'wrongAnswers',
      'userStreak',
      'bestScores',
      'rankingData',
      'playerRank'
    ];
    
    // Eliminar cada clave
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Mantener temporalmente el nombre de usuario para el API
    const oldUsername = localStorage.getItem('username');
    
    // Enviar solicitud de restablecimiento al servidor
    fetch('/api/update-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player: oldUsername,
        reset: true,
        score: 0,
        correctAnswers: 0,
        errors: 0,
        timeUsed: 0,
        difficulty: 'facil'
      })
    }).catch(error => {
      console.warn('Error al enviar solicitud de restablecimiento al servidor:', error);
    });
    
    // Mostrar mensaje de éxito
    showToast('Perfil restablecido correctamente', 'success');
    
    return oldUsername;
  } catch (error) {
    console.error('Error al restablecer perfil:', error);
    showToast('Error al restablecer perfil', 'error');
    return null;
  }
}

// Función para guardar el nuevo nombre de usuario
async function saveNewUsername(newUsername) {
  try {
    // Guardar en localStorage
    localStorage.setItem('username', newUsername);
    sessionStorage.setItem('username', newUsername);
    
    // Enviar al servidor una partida con 0 puntos para crear el nuevo perfil
    const emptyGameData = {
      player: newUsername,
      score: 0,
      correct: 0,
      wrong: 0,
      timeUsed: 0,
      difficulty: 'facil',
      victory: false,
      achievements: []
    };
    
    try {
      // Intentar enviar al servidor
      await fetch('/api/update-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emptyGameData)
      });
    } catch (serverError) {
      console.warn('No se pudo enviar al servidor, se usará solo localStorage:', serverError);
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar nuevo nombre de usuario:', error);
    showToast('Error al guardar nuevo nombre de usuario', 'error');
    return false;
  }
}

// Función para mostrar notificaciones
function showToast(message, type = 'info') {
  // Verificar si ya existe un toast
  let toast = document.querySelector('.toast-notification');
  
  if (!toast) {
    // Crear nuevo elemento para el toast
    toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    // Añadir al body
    document.body.appendChild(toast);
  } else {
    // Actualizar clase de tipo
    toast.className = `toast-notification ${type}`;
  }
  
  // Actualizar mensaje
  toast.textContent = message;
  
  // Mostrar el toast
  toast.style.display = 'block';
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
} 