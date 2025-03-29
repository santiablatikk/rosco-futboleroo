/**
 * ranking.js - Gestiona la página de ranking global
 * 
 * Este script se encarga de:
 * - Recopilar datos de todos los jugadores para mostrar el ranking global
 * - Filtrar y ordenar los datos según criterios seleccionados
 * - Mostrar estadísticas globales del juego
 */

// Variables globales
let allGameData = [];
let rankedPlayers = [];
let currentFilters = {
  difficulty: 'all',
  timeframe: 'all'
};

/**
 * Inicialización cuando el DOM está completamente cargado
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando página de ranking');
  
  // Inicializar partículas de fondo
  if (window.particlesJS) {
    particlesJS.load('particles-js', 'js/particles-config.js');
  }
  
  // Configurar listeners de eventos
  setupEventListeners();
  
  // Cargar datos del ranking global
  loadRankingData();
});

/**
 * Configura listeners de eventos
 */
function setupEventListeners() {
  // Selector de dificultad
  const difficultyFilter = document.getElementById('difficulty-filter');
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', function() {
      currentFilters.difficulty = this.value;
      applyFilters();
    });
  }
  
  // Selector de período
  const timeFilter = document.getElementById('time-filter');
  if (timeFilter) {
    timeFilter.addEventListener('change', function() {
      currentFilters.timeframe = this.value;
      applyFilters();
    });
  }
  
  // Botón de actualizar
  const refreshButton = document.getElementById('refresh-ranking');
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      refreshRanking();
    });
  }
}

/**
 * Carga los datos de ranking desde localStorage (combinando datos de todos los usuarios)
 */
async function loadRankingData() {
  try {
    showLoading(true);
    
    // Simulación de tiempo de carga para mejor UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 1. Recopilamos los historials de juego de todos los usuarios (IPs)
    const allGameHistories = collectAllGameHistories();
    
    if (allGameHistories.length === 0) {
      showNoDataMessage(true);
      showLoading(false);
      return;
    }
    
    // 2. Procesar los datos para el ranking
    allGameData = processAllGameData(allGameHistories);
    
    // 3. Generar el ranking aplicando los filtros actuales
    applyFilters();
    
    // 4. Calcular y mostrar estadísticas globales
    updateGlobalStats(allGameData);
    
    // 5. Actualizar el podio de los mejores jugadores
    updateTopPlayersPodium(rankedPlayers.slice(0, 3));
    
    showLoading(false);
    
  } catch (error) {
    console.error('Error al cargar datos de ranking:', error);
    showToast('Error al cargar ranking global', 'error');
    showLoading(false);
    showNoDataMessage(true);
  }
}

/**
 * Recopila todos los datos de historiales de juego de localStorage
 * @returns {Array} - Array de objetos con datos de partidas
 */
function collectAllGameHistories() {
  try {
    const allHistories = [];
    
    // Iterar a través de localStorage para encontrar todos los historiales de juego
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Buscar claves que sigan el patrón de historial de juego: gameHistory_*
      if (key && key.startsWith('gameHistory_')) {
        const historyData = localStorage.getItem(key);
        
        if (historyData) {
          try {
            const parsedData = JSON.parse(historyData);
            
            // Asegurarnos de que es un array y tiene elementos
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              // Añadir las partidas de este usuario al array global
              parsedData.forEach(game => {
                // Asegurarse de que es un objeto de partida válido
                if (isValidGameData(game)) {
                  allHistories.push(game);
                }
              });
            }
          } catch (parseError) {
            console.error(`Error al parsear historial ${key}:`, parseError);
          }
        }
      }
    }
    
    console.log(`Recopiladas ${allHistories.length} partidas para el ranking global`);
    return allHistories;
  } catch (error) {
    console.error('Error al recopilar historiales de juego:', error);
    return [];
  }
}

/**
 * Verifica si un objeto de datos de juego es válido para incluirse en el ranking
 * @param {Object} game - Objeto con datos de una partida
 * @returns {boolean} - true si es válido, false en caso contrario
 */
function isValidGameData(game) {
  return (
    game &&
    typeof game === 'object' &&
    game.name && 
    typeof game.score === 'number' &&
    typeof game.date === 'string' &&
    game.difficulty && 
    typeof game.correct === 'number'
  );
}

/**
 * Procesa todos los datos de juego para preparar el ranking
 * @param {Array} allGames - Array de todas las partidas
 * @returns {Array} - Array de partidas procesado
 */
function processAllGameData(allGames) {
  // Ordenar por puntuación (mayor a menor)
  return allGames.sort((a, b) => b.score - a.score);
}

/**
 * Aplica los filtros seleccionados al ranking
 */
function applyFilters() {
  // Filtrar los datos según las selecciones
  const filteredData = allGameData.filter(game => {
    // Filtrar por dificultad
    if (currentFilters.difficulty !== 'all' && game.difficulty !== currentFilters.difficulty) {
      return false;
    }
    
    // Filtrar por período de tiempo
    if (currentFilters.timeframe !== 'all') {
      const gameDate = new Date(game.date);
      const now = new Date();
      
      if (currentFilters.timeframe === 'week') {
        // Última semana
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (gameDate < oneWeekAgo) {
          return false;
        }
      } else if (currentFilters.timeframe === 'month') {
        // Último mes
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (gameDate < oneMonthAgo) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Guardar el resultado filtrado
  rankedPlayers = filteredData;
  
  // Actualizar la tabla de ranking
  updateRankingTable(rankedPlayers);
  
  // Actualizar el podio con los nuevos datos filtrados
  updateTopPlayersPodium(rankedPlayers.slice(0, 3));
}

/**
 * Actualiza la tabla de ranking con los datos filtrados
 * @param {Array} players - Array de jugadores ordenados para el ranking
 */
function updateRankingTable(players) {
  const tbody = document.getElementById('ranking-tbody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Comprobar si hay datos para mostrar
  if (players.length === 0) {
    showNoDataMessage(true);
    return;
  }
  
  showNoDataMessage(false);
  
  // Mostrar solo los 50 mejores resultados como máximo
  const topPlayers = players.slice(0, 50);
  
  topPlayers.forEach((player, index) => {
    const position = index + 1;
    const row = document.createElement('tr');
    
    // Añadir clase especial para destacar los primeros puestos
    if (position <= 3) {
      row.classList.add(`top-${position}`);
    }
    
    // Formatear fecha y tiempo
    const formattedDate = formatDate(new Date(player.date));
    const formattedTime = formatTime(player.timeUsed);
    const difficultyLabel = translateDifficulty(player.difficulty);
    
    row.innerHTML = `
      <td class="position-col">${position}</td>
      <td class="player-col">${player.name}</td>
      <td class="score-col">${player.score}</td>
      <td class="difficulty-col">${difficultyLabel}</td>
      <td class="correct-col">${player.correct}</td>
      <td class="time-col">${formattedTime}</td>
      <td class="date-col">${formattedDate}</td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Actualiza las estadísticas globales
 * @param {Array} allGames - Array con todas las partidas
 */
function updateGlobalStats(allGames) {
  // Total de jugadores únicos
  const uniquePlayers = new Set(allGames.map(game => game.name)).size;
  
  // Total de partidas
  const totalGames = allGames.length;
  
  // Puntuación media
  const totalScore = allGames.reduce((sum, game) => sum + game.score, 0);
  const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
  
  // Total de respuestas correctas
  const totalCorrect = allGames.reduce((sum, game) => sum + game.correct, 0);
  
  // Actualizar la UI
  document.getElementById('total-players').textContent = uniquePlayers;
  document.getElementById('total-games').textContent = totalGames;
  document.getElementById('avg-score').textContent = avgScore;
  document.getElementById('total-correct').textContent = totalCorrect;
}

/**
 * Actualiza el podio de los mejores jugadores
 * @param {Array} topThree - Los tres mejores jugadores
 */
function updateTopPlayersPodium(topThree) {
  // Verificar que tenemos datos suficientes
  if (!topThree || topThree.length === 0) {
    return;
  }
  
  // Primer lugar
  if (topThree.length >= 1) {
    document.getElementById('first-player-name').textContent = topThree[0].name;
    document.getElementById('first-player-score').textContent = `${topThree[0].score} pts`;
  }
  
  // Segundo lugar
  if (topThree.length >= 2) {
    document.getElementById('second-player-name').textContent = topThree[1].name;
    document.getElementById('second-player-score').textContent = `${topThree[1].score} pts`;
  }
  
  // Tercer lugar
  if (topThree.length >= 3) {
    document.getElementById('third-player-name').textContent = topThree[2].name;
    document.getElementById('third-player-score').textContent = `${topThree[2].score} pts`;
  }
}

/**
 * Refresca los datos del ranking
 */
function refreshRanking() {
  showToast('Actualizando ranking...', 'info');
  loadRankingData();
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - true para mostrar, false para ocultar
 */
function showLoading(show) {
  const loading = document.getElementById('ranking-loading');
  if (loading) {
    loading.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Muestra u oculta el mensaje de "no hay datos"
 * @param {boolean} show - true para mostrar, false para ocultar
 */
function showNoDataMessage(show) {
  const noDataMsg = document.getElementById('no-data-message');
  const table = document.querySelector('.ranking-table');
  
  if (noDataMsg && table) {
    noDataMsg.style.display = show ? 'flex' : 'none';
    table.style.display = show ? 'none' : 'table';
  }
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
 * @returns {string} - Tiempo formateado
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  return `${seconds}s`;
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
      
      // Ocultar el toast después de la animación
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
      
    }, 3000); // Ocultar después de 3 segundos
    
  }, 100); // Iniciar animación después de 100ms
} 