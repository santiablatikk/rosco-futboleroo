/**
 * profile.js - Gestiona la página de perfil de usuario
 * 
 * Este script se encarga de:
 * - Cargar y mostrar los datos del perfil de usuario
 * - Generar y mostrar estadísticas de juego
 * - Mostrar el historial de partidas
 * - Configurar gráficos con Chart.js
 */

// Variables globales
let userProfile = null;
let gameHistory = [];
let charts = {};

/**
 * Inicialización cuando el DOM está completamente cargado
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando página de perfil');
  
  // Inicializa partículas de fondo
  if (window.particlesJS) {
    particlesJS.load('particles-js', 'js/particles-config.js');
  }
  
  // Configurar eventos
  setupEventListeners();
  
  // Cargar datos del perfil
  loadProfileData();
  
  // Mostrar notificación si se viene desde el juego
  const fromGame = new URLSearchParams(window.location.search).get('fromGame');
  if (fromGame === 'true') {
    showToast('Datos de perfil actualizados', 'success');
  }
});

/**
 * Configura listeners de eventos
 */
function setupEventListeners() {
  // Botón Jugar
  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', function() {
      window.location.href = 'game.html';
    });
  }
  
  // Botón Ver Logros
  const achievementsBtn = document.getElementById('achievements-btn');
  if (achievementsBtn) {
    achievementsBtn.addEventListener('click', function() {
      window.location.href = 'logros.html';
    });
  }
  
  // Botón Restablecer Perfil
  const resetProfileBtn = document.getElementById('reset-profile-btn');
  if (resetProfileBtn) {
    resetProfileBtn.addEventListener('click', function() {
      showResetConfirmation();
    });
  }
}

/**
 * Carga y muestra los datos del perfil de usuario
 */
function loadProfileData() {
  try {
    // Obtener nombre de usuario
    const username = localStorage.getItem('username') || 'Jugador';
    
    // Mostrar nombre en la UI
    document.getElementById('profile-name').textContent = username;
    
    // Obtener datos de perfil y partidas
    loadGameHistory();
    
    // Fecha de registro (primera partida o fecha actual si no hay partidas)
    const memberSince = gameHistory.length > 0 
      ? new Date(gameHistory[gameHistory.length - 1].date) 
      : new Date();
    
    document.getElementById('member-since').textContent = formatDate(memberSince);
    
    // Procesar datos y mostrar estadísticas
    calculateAndDisplayStats();
    
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    showToast('Error al cargar datos de perfil', 'error');
  }
}

/**
 * Carga el historial de partidas del localStorage
 */
function loadGameHistory() {
  try {
    // Intentar obtener historial del usuario
    const userIP = localStorage.getItem('userIP') || 'unknown';
    const historyKey = `gameHistory_${userIP}`;
    const historyData = localStorage.getItem(historyKey);
    
    if (historyData) {
      gameHistory = JSON.parse(historyData);
      console.log(`Cargadas ${gameHistory.length} partidas del historial`);
    } else {
      gameHistory = [];
      console.log('No se encontró historial de partidas');
    }
    
    // Ordenar por fecha (más reciente primero)
    gameHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Renderizar historial en la tabla
    renderGameHistory();
    
  } catch (error) {
    console.error('Error al cargar historial de partidas:', error);
    gameHistory = [];
  }
}

/**
 * Renderiza el historial de partidas en la tabla
 */
function renderGameHistory() {
  const tbody = document.getElementById('game-history-tbody');
  const noHistoryMessage = document.getElementById('no-history-message');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Mostrar/ocultar mensaje de no historial
  if (gameHistory.length === 0) {
    if (noHistoryMessage) noHistoryMessage.style.display = 'flex';
    return;
  } else {
    if (noHistoryMessage) noHistoryMessage.style.display = 'none';
  }
  
  // Mostrar las últimas 10 partidas
  const recentGames = gameHistory.slice(0, 10);
  
  recentGames.forEach(game => {
    const row = document.createElement('tr');
    
    // Formatos para los datos
    const formattedDate = formatDate(new Date(game.date));
    const formattedTime = formatTime(game.timeUsed);
    const difficultyLabel = translateDifficulty(game.difficulty);
    const resultBadge = game.victory 
      ? '<span class="victory-badge">Victoria</span>' 
      : '<span class="defeat-badge">Derrota</span>';
    
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${difficultyLabel}</td>
      <td>${game.correct}</td>
      <td>${game.wrong}</td>
      <td>${game.skipped}</td>
      <td>${formattedTime}</td>
      <td>${game.score}</td>
      <td>${resultBadge}</td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Calcula y muestra todas las estadísticas
 */
function calculateAndDisplayStats() {
  if (gameHistory.length === 0) {
    // No hay partidas jugadas, mostrar estadísticas en ceros
    updateStatsWithZeros();
    setupEmptyCharts();
    return;
  }
  
  // Calcular estadísticas generales
  const totalGames = gameHistory.length;
  const victories = gameHistory.filter(game => game.victory).length;
  const winRate = totalGames > 0 ? Math.round((victories / totalGames) * 100) : 0;
  const highScore = gameHistory.reduce((max, game) => Math.max(max, game.score), 0);
  
  // Actualizar estadísticas generales en la UI
  document.getElementById('total-games').textContent = totalGames;
  document.getElementById('victories').textContent = victories;
  document.getElementById('win-rate').textContent = `${winRate}%`;
  document.getElementById('high-score').textContent = highScore;
  
  // Calcular totales de respuestas
  const totalCorrect = gameHistory.reduce((sum, game) => sum + game.correct, 0);
  const totalIncorrect = gameHistory.reduce((sum, game) => sum + game.wrong, 0);
  const totalSkipped = gameHistory.reduce((sum, game) => sum + game.skipped, 0);
  
  // Actualizar estadísticas de respuestas en la UI
  document.getElementById('total-correct').textContent = totalCorrect;
  document.getElementById('total-incorrect').textContent = totalIncorrect;
  document.getElementById('total-skipped').textContent = totalSkipped;
  
  // Contar partidas por dificultad
  const easyGames = gameHistory.filter(game => game.difficulty === 'facil').length;
  const normalGames = gameHistory.filter(game => game.difficulty === 'normal').length;
  const hardGames = gameHistory.filter(game => game.difficulty === 'dificil').length;
  
  // Actualizar contadores de dificultad en la UI
  document.getElementById('easy-games').textContent = easyGames;
  document.getElementById('normal-games').textContent = normalGames;
  document.getElementById('hard-games').textContent = hardGames;
  
  // Estadísticas de tiempo
  const totalTimePlayed = gameHistory.reduce((sum, game) => sum + game.timeUsed, 0);
  const avgTimePerGame = Math.round(totalTimePlayed / totalGames);
  const bestRemainingTime = gameHistory.reduce((max, game) => Math.max(max, game.timeRemaining || 0), 0);
  
  // Actualizar estadísticas de tiempo en la UI
  document.getElementById('total-time-played').textContent = formatTime(totalTimePlayed, true);
  document.getElementById('avg-time-per-game').textContent = formatTime(avgTimePerGame);
  document.getElementById('best-remaining-time').textContent = formatTime(bestRemainingTime);
  
  // Estadísticas de ayudas
  const totalHintsUsed = gameHistory.reduce((sum, game) => sum + (game.hintsUsed || 0), 0);
  const avgHintsPerGame = totalGames > 0 ? (totalHintsUsed / totalGames).toFixed(1) : 0;
  const gamesWithoutHints = gameHistory.filter(game => (game.hintsUsed || 0) === 0).length;
  
  // Actualizar estadísticas de ayudas en la UI
  document.getElementById('total-hints-used').textContent = totalHintsUsed;
  document.getElementById('avg-hints-per-game').textContent = avgHintsPerGame;
  document.getElementById('games-without-hints').textContent = gamesWithoutHints;
  
  // Configurar gráficos
  setupCharts(totalCorrect, totalIncorrect, totalSkipped, easyGames, normalGames, hardGames);
}

/**
 * Actualiza las estadísticas con valores cero cuando no hay partidas
 */
function updateStatsWithZeros() {
  const statsElements = [
    'total-games', 'victories', 'win-rate', 'high-score',
    'total-correct', 'total-incorrect', 'total-skipped',
    'easy-games', 'normal-games', 'hard-games', 
    'total-hints-used', 'avg-hints-per-game', 'games-without-hints'
  ];
  
  statsElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = id === 'win-rate' ? '0%' : '0';
    }
  });
  
  document.getElementById('total-time-played').textContent = '0 minutos';
  document.getElementById('avg-time-per-game').textContent = '0 segundos';
  document.getElementById('best-remaining-time').textContent = '0 segundos';
}

/**
 * Configura los gráficos con Chart.js
 */
function setupCharts(totalCorrect, totalIncorrect, totalSkipped, easyGames, normalGames, hardGames) {
  // Destruir gráficos existentes si hay
  if (charts.answersChart) charts.answersChart.destroy();
  if (charts.difficultyChart) charts.difficultyChart.destroy();
  
  // Gráfico de respuestas
  const answersCtx = document.getElementById('answers-chart').getContext('2d');
  charts.answersChart = new Chart(answersCtx, {
    type: 'doughnut',
    data: {
      labels: ['Correctas', 'Incorrectas', 'Pasadas'],
      datasets: [{
        data: [totalCorrect, totalIncorrect, totalSkipped],
        backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 10,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 14
          }
        }
      }
    }
  });
  
  // Gráfico de dificultad
  const difficultyCtx = document.getElementById('difficulty-chart').getContext('2d');
  charts.difficultyChart = new Chart(difficultyCtx, {
    type: 'doughnut',
    data: {
      labels: ['Fácil', 'Normal', 'Difícil'],
      datasets: [{
        data: [easyGames, normalGames, hardGames],
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 10,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 14
          }
        }
      }
    }
  });
}

/**
 * Configura gráficos vacíos cuando no hay datos
 */
function setupEmptyCharts() {
  setupCharts(0, 0, 0, 0, 0, 0);
}

/**
 * Formatea una fecha en formato legible
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Fecha desconocida';
  }
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  
  return date.toLocaleDateString('es-ES', options);
}

/**
 * Formatea tiempo en segundos a formato legible
 * @param {number} seconds - Tiempo en segundos
 * @param {boolean} includeMinutes - Si debe incluir minutos
 * @returns {string} - Tiempo formateado
 */
function formatTime(seconds, includeMinutes = false) {
  if (!seconds || isNaN(seconds)) return '0 segundos';
  
  if (includeMinutes && seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  
  return `${seconds} segundos`;
}

/**
 * Traduce el código de dificultad a un texto legible
 * @param {string} difficulty - Código de dificultad (facil, normal, dificil)
 * @returns {string} - Texto legible de la dificultad
 */
function translateDifficulty(difficulty) {
  const difficultyMap = {
    'facil': 'Fácil',
    'normal': 'Normal',
    'dificil': 'Difícil'
  };
  
  return difficultyMap[difficulty] || 'Desconocida';
}

/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, info)
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('notification');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = 'toast';
  toast.classList.add(`toast-${type}`);
  
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      
      // Hide the toast after fade out
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
      
    }, 3000); // Hide after 3 seconds
    
  }, 100); // Start animation after 100ms
}

/**
 * Muestra un diálogo de confirmación para restablecer el perfil
 */
function showResetConfirmation() {
  // Crear modal de confirmación
  const confirmationModal = document.createElement('div');
  confirmationModal.className = 'reset-confirmation-modal';
  confirmationModal.innerHTML = `
    <div class="reset-confirmation-content">
      <h3><i class="fas fa-exclamation-triangle"></i> Confirmar restablecimiento</h3>
      <p>Esta acción eliminará <strong>todos tus datos personales</strong>, historial de partidas y estadísticas. Esta acción no se puede deshacer.</p>
      <div class="reset-confirmation-buttons">
        <button id="cancel-reset" class="confirmation-btn secondary-btn">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button id="confirm-reset" class="confirmation-btn danger-btn">
          <i class="fas fa-check"></i> Confirmar
        </button>
      </div>
    </div>
  `;
  
  // Añadir a la página
  document.body.appendChild(confirmationModal);
  
  // Mostrar con animación
  setTimeout(() => {
    confirmationModal.classList.add('show');
  }, 10);
  
  // Configurar botones
  document.getElementById('cancel-reset').addEventListener('click', function() {
    // Cerrar modal con animación
    confirmationModal.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(confirmationModal);
    }, 300);
  });
  
  document.getElementById('confirm-reset').addEventListener('click', function() {
    resetUserProfile();
  });
}

/**
 * Restablece el perfil del usuario borrando todos los datos
 */
function resetUserProfile() {
  try {
    // Obtener IP actual para borrar datos específicos
    const userIP = localStorage.getItem('userIP') || 'unknown';
    
    // Datos a borrar (claves específicas)
    const keysToDelete = [
      'username',
      'selectedDifficulty',
      `gameHistory_${userIP}`,
      `profile_${userIP}`
    ];
    
    // Borrar cada clave
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Mostrar mensaje de éxito
    showToast('Perfil restablecido correctamente', 'success');
    
    // Redirigir a la página de inicio después de un breve retraso
    setTimeout(() => {
      // Redirigir a index.html con un parámetro para mostrar la pantalla de login
      window.location.href = 'index.html?showLogin=true';
    }, 1500);
    
  } catch (error) {
    console.error('Error al restablecer el perfil:', error);
    showToast('Error al restablecer el perfil', 'error');
  }
} 