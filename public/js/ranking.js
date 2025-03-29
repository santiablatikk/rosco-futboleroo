// ranking.js

// Variables globales
let rankingData = [];
let currentPeriod = 'global';
let isRankingInitialized = false;
let autoRefreshEnabled = true;

// Inicializar ranking al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado - Inicializando ranking');
    
    // Ocultar elementos mientras se carga
    toggleLoadingState(true);
    
    // Inicializar pestañas
    initTabs();
    
    // Inicializar buscador
    initSearch();
    
    // Cargar datos del ranking
    loadRankingData(currentPeriod);
    
    // Iniciar actualización automática si está habilitada
    if (autoRefreshEnabled) {
        startAutoRefresh();
    }
});

// Inicializar las pestañas de periodos
function initTabs() {
    const tabs = document.querySelectorAll('.ranking-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Quitar clase activa de todas las pestañas
            tabs.forEach(t => t.classList.remove('active'));
            
            // Agregar clase activa a la pestaña seleccionada
            this.classList.add('active');
            
            // Obtener periodo seleccionado
            const period = this.dataset.period;
            
            // Cargar datos si cambió el periodo
            if (period !== currentPeriod) {
                currentPeriod = period;
                loadRankingData(period);
            }
        });
    });
}

// Inicializar buscador
function initSearch() {
    const searchInput = document.getElementById('player-search');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput && searchButton) {
        // Buscar al hacer clic en botón
        searchButton.addEventListener('click', function() {
            const query = searchInput.value.trim().toLowerCase();
            searchPlayer(query);
        });
        
        // Buscar al presionar Enter
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const query = this.value.trim().toLowerCase();
                searchPlayer(query);
            }
        });
    }
    
    // Añadir botón de actualizar
    const filterControls = document.querySelector('.filter-controls');
    if (filterControls) {
        const refreshButton = document.createElement('button');
        refreshButton.id = 'refresh-button';
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        refreshButton.className = 'action-button';
        refreshButton.style.marginLeft = 'auto';
        
        refreshButton.addEventListener('click', function() {
            // Añadir clase de animación
            this.querySelector('i').classList.add('fa-spin');
            
            // Recargar datos
            loadRankingData(currentPeriod, true);
            
            // Quitar animación después de un tiempo
            setTimeout(() => {
                this.querySelector('i').classList.remove('fa-spin');
            }, 1000);
        });
        
        filterControls.appendChild(refreshButton);
    }
}

// Cargar datos del ranking
async function loadRankingData(period = 'global', forceRefresh = false) {
    try {
        toggleLoadingState(true);
        
        // Usar utilidades compartidas para obtener datos
        rankingData = await ProfileUtils.getRankingData(period, forceRefresh);
        
        // Mostrar los datos
        displayRankingData(rankingData);
        
        // Marcar como inicializado
        isRankingInitialized = true;
        
        // Determinar posición del jugador actual
        highlightCurrentPlayer();
        
        // Mostrar mensaje de compleción si viene de finalizar una partida
        if (!forceRefresh && isComingFromGameCompletion()) {
            showGameCompletionMessage();
        }
    } catch (error) {
        console.error('Error cargando datos del ranking:', error);
        showError('No se pudieron cargar los datos del ranking. Por favor, inténtalo de nuevo más tarde.');
    } finally {
        toggleLoadingState(false);
    }
}

// Obtener nombre de usuario (usando la función desde utils.js)
function getUsernameFromStorage() {
  return Utils.getUsernameFromStorage();
}

// Configurar botones de navegación
function setupNavigationButtons() {
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', function() {
      if (localStorage.getItem('hasPlayed') === 'true') {
        window.location.href = 'game.html';
      } else {
        window.location.href = 'index.html';
      }
    });
  }
  
  const viewProfileButton = document.getElementById('view-profile');
  if (viewProfileButton) {
    viewProfileButton.addEventListener('click', function() {
      window.location.href = 'profile.html';
    });
  }
}

// Actualizar estadísticas globales mostradas en la página
function updateGlobalStats(rankingData) {
  // Actualizar jugadores totales (nombres únicos)
  const uniquePlayers = new Set(rankingData.map(item => item.name)).size;
  const totalGames = rankingData.length;
  
  // Calcular tasa de aciertos total
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalQuestions = 0;
  let totalTimeUsed = 0;
  
  // Contadores para analizar niveles de dificultad
  let difficultyCount = {
    facil: 0,
    normal: 0,
    dificil: 0
  };
  
  rankingData.forEach(item => {
    totalCorrect += item.correct || 0;
    totalWrong += item.wrong || 0;
    totalQuestions += (item.correct || 0) + (item.wrong || 0);
    totalTimeUsed += item.time || 0;
    
    // Contar partidas por nivel de dificultad
    const difficulty = item.difficulty || 'normal';
    if (difficultyCount[difficulty] !== undefined) {
      difficultyCount[difficulty]++;
    }
  });
  
  // Cálculos estadísticos
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const avgTimePerGame = totalGames > 0 ? Math.round(totalTimeUsed / totalGames) : 0;
  const avgQuestionsPerGame = totalGames > 0 ? Math.round(totalQuestions / totalGames) : 0;
  
  // Determinar dificultad más popular
  let mostPopularDifficulty = 'normal';
  let maxCount = 0;
  for (const [difficulty, count] of Object.entries(difficultyCount)) {
    if (count > maxCount) {
      maxCount = count;
      mostPopularDifficulty = difficulty;
    }
  }
  
  // Actualizar valores en la UI
  document.getElementById('total-players').textContent = uniquePlayers;
  document.getElementById('total-games').textContent = totalGames;
  document.getElementById('success-rate').textContent = `${successRate}%`;
  
  // Crear estadísticas adicionales más interesantes
  const statsContainer = document.querySelector('.ranking-stats');
  if (statsContainer) {
    // Añadir nuevas tarjetas de estadísticas
    const additionalStats = document.createElement('div');
    additionalStats.className = 'ranking-stats additional-stats';
    additionalStats.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon">
          <i class="fas fa-stopwatch"></i>
        </div>
        <div class="stat-card-value">${formatTime(avgTimePerGame)}</div>
        <div class="stat-card-title">Tiempo Promedio</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-icon">
          <i class="fas fa-question-circle"></i>
        </div>
        <div class="stat-card-value">${avgQuestionsPerGame}</div>
        <div class="stat-card-title">Preguntas Promedio</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-icon">
          <i class="fas fa-fire"></i>
        </div>
        <div class="stat-card-value">${formatDifficulty(mostPopularDifficulty)}</div>
        <div class="stat-card-title">Dificultad Popular</div>
      </div>
    `;
    
    // Insertar después de las estadísticas originales
    const originalStats = document.querySelector('.ranking-stats');
    if (originalStats && originalStats.nextSibling) {
      originalStats.parentNode.insertBefore(additionalStats, originalStats.nextSibling);
    } else if (originalStats) {
      originalStats.parentNode.appendChild(additionalStats);
    }
    
    // Añadir estilos adicionales
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .additional-stats {
        margin-top: 1.5rem;
      }
      
      .additional-stats .stat-card {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7));
      }
      
      .additional-stats .stat-card::before {
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      }
      
      .additional-stats .stat-card-value {
        background: linear-gradient(45deg, #3b82f6, #60a5fa);
        -webkit-background-clip: text;
        background-clip: text;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

// Formatear tiempo para mostrar (usando la función desde utils.js)
function formatTime(seconds) {
  return Utils.formatTime(seconds);
}

// Actualizar visualización de posición del jugador
function updatePlayerPositionDisplay(position, playerName) {
  const playerPositionNote = document.getElementById('player-position-note');
  
  if (playerPositionNote) {
    if (playerName && position > 0) {
      // Si el jugador está en el ranking, mostrar su posición
      playerPositionNote.innerHTML = `
        <i class="fas fa-trophy"></i>
        Tu posición actual: <strong>${position}</strong> de ${document.querySelectorAll('#ranking-body tr').length}
      `;
      playerPositionNote.style.display = 'block';
      playerPositionNote.className = position <= 3 ? 'player-position-note top-position' : 'player-position-note normal-position';
    } else if (playerName) {
      // Si el jugador no está en el ranking visible, mostrar mensaje
      playerPositionNote.innerHTML = `
        <i class="fas fa-info-circle"></i>
        No estás entre los mejores jugadores del ranking. ¡Sigue intentándolo!
      `;
      playerPositionNote.style.display = 'block';
      playerPositionNote.className = 'player-position-note not-in-ranking';
    } else {
      playerPositionNote.style.display = 'none';
    }
  }
}

// Función para poblar la sección de top players
function populateTopPlayers(topData, currentPlayer) {
  const topPlayersContainer = document.querySelector('.top-players');
  if (!topPlayersContainer || topData.length === 0) return;
  
  // Limpiar contenedor
  topPlayersContainer.innerHTML = '';
  
  // Si no hay suficientes datos, no mostrar nada
  if (topData.length < 3) {
    return;
  }
  
  // Orden de visualización: segundo, primero, tercero
  const displayOrder = [
    { position: 2, class: 'second' },
    { position: 1, class: 'first' },
    { position: 3, class: 'third' }
  ];
  
  // Crear divs para cada top player
  displayOrder.forEach(display => {
    const index = display.position - 1;
    if (index >= topData.length) return;
    
    const player = topData[index];
    const isCurrentPlayer = currentPlayer && player.name === currentPlayer;
    
    const playerDiv = document.createElement('div');
    playerDiv.className = `top-player ${display.class}`;
    if (isCurrentPlayer) playerDiv.classList.add('current-player');
    
    playerDiv.innerHTML = `
      <div class="rank-number">${display.position}</div>
      <div class="top-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="top-name">${player.name || "Anónimo"}</div>
      <div class="top-score">${player.score || 0}</div>
      <div class="top-details">
        <span><i class="fas fa-check"></i> ${player.correct || 0}</span>
        <span><i class="fas fa-times"></i> ${player.wrong || 0}</span>
      </div>
    `;
    
    topPlayersContainer.appendChild(playerDiv);
  });
  
  // Agregar estilos para el avatar con icono en lugar de imagen
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .top-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
      border: 3px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 1rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 3rem;
    }
    
    .top-player.first .top-avatar {
      width: 120px;
      height: 120px;
      border: 4px solid rgba(255, 215, 0, 0.5);
      box-shadow: 0 0 25px rgba(255, 215, 0, 0.3);
      font-size: 3.5rem;
      color: rgba(255, 215, 0, 0.8);
    }
    
    .top-player.second .top-avatar {
      border-color: rgba(192, 192, 192, 0.5);
      color: rgba(192, 192, 192, 0.8);
    }
    
    .top-player.third .top-avatar {
      border-color: rgba(205, 127, 50, 0.5);
      color: rgba(205, 127, 50, 0.8);
    }
  `;
  document.head.appendChild(styleEl);
}

// Mostrar mensaje si el jugador viene de completar una partida
function showGameCompletionMessage() {
  // Check if we already have a message div
  let messageElement = document.getElementById('game-completion-message');
  
  if (!messageElement) {
    // Create message element if it doesn't exist
    messageElement = document.createElement('div');
    messageElement.id = 'game-completion-message';
    messageElement.className = 'game-completion-message';
    
    // Apply styles
    messageElement.style.backgroundColor = 'rgba(34, 197, 94, 0.9)';
    messageElement.style.borderRadius = '10px';
    messageElement.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '20px';
    messageElement.style.margin = '20px auto';
    messageElement.style.maxWidth = '90%';
    messageElement.style.position = 'relative';
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(-20px)';
    messageElement.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    // Obtener datos de la última partida
    const playerName = localStorage.getItem('username') || 'Jugador';
    const lastGameStats = JSON.parse(localStorage.getItem('lastGameStats') || '{}');
    const score = lastGameStats.score || 0;
    const correct = lastGameStats.correct || 0;
    const wrong = lastGameStats.wrong || 0;
    const victory = lastGameStats.victory;
    
    const resultIcon = victory ? 
      '<i class="fas fa-trophy" style="color: gold; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);"></i>' : 
      '<i class="fas fa-medal" style="color: #e11d48;"></i>';
    
    messageElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 40px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
          ${resultIcon}
        </div>
        <div>
          <h3 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">¡Partida Registrada!</h3>
          <p style="margin: 0; font-size: 16px;">
            <strong>${playerName}</strong>, tu puntuación de <strong>${score} puntos</strong> 
            (${correct} aciertos, ${wrong} errores) ha sido registrada y tu ranking ha sido actualizado.
          </p>
        </div>
        <button onclick="this.parentNode.parentNode.style.display='none';" 
                style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Insertar antes de la tabla pero después del encabezado
    const rankingHeader = document.querySelector('.ranking-header');
    if (rankingHeader && rankingHeader.nextSibling) {
      rankingHeader.parentNode.insertBefore(messageElement, rankingHeader.nextSibling);
    } else {
      // Si no se encuentra el encabezado
      const container = document.querySelector('.ranking-container');
      if (container) {
        container.insertBefore(messageElement, container.firstChild);
      }
    }
    
    // Añadir estilos para la animación de pulso
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    }, 100);
  }
  
  // Auto-ocultar mensaje después de 8 segundos
  setTimeout(() => {
    if (messageElement) {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 500);
    }
  }, 8000);
}

// Función auxiliar para formatear tiempo en minutos:segundos
function formatDifficulty(difficulty) {
  switch(difficulty) {
    case 'facil':
      return 'Fácil';
    case 'normal':
      return 'Normal';
    case 'dificil':
      return 'Difícil';
    default:
      return difficulty || '-';
  }
}

// Nueva función para hacer scroll al jugador actual
function scrollToCurrentPlayer() {
  setTimeout(() => {
    const currentPlayerRow = document.querySelector('tr.current-player');
    if (currentPlayerRow) {
      const tableContainer = document.querySelector('.ranking-table-container');
      if (tableContainer) {
        // Posicionar el jugador actual en el centro del contenedor
        const rowPosition = currentPlayerRow.offsetTop;
        const containerHeight = tableContainer.clientHeight;
        const rowHeight = currentPlayerRow.clientHeight;
        
        // Calcular posición para centrar la fila
        const scrollPosition = rowPosition - (containerHeight / 2) + (rowHeight / 2);
        
        // Hacer scroll suave
        tableContainer.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
        
        // Aplicar efecto de destaque
        currentPlayerRow.classList.add('highlight');
        setTimeout(() => {
          currentPlayerRow.classList.remove('highlight');
          setTimeout(() => {
            currentPlayerRow.classList.add('highlight');
          }, 300);
        }, 300);
      }
    }
  }, 500);
}

// Modificar la función loadRanking para resaltar mejor al usuario actual
async function loadRanking(forceRefresh = false, period = 'global') {
  const loadingContainer = document.getElementById('loading-container');
  const rankingTable = document.getElementById('ranking-table');
  const rankingTableBody = document.getElementById('ranking-body');
  const noResultsContainer = document.getElementById('no-results');
  
  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-body'");
    return;
  }
  
  // Mostrar el spinner de carga
  if (loadingContainer) loadingContainer.style.display = 'flex';
  if (rankingTable) rankingTable.style.display = 'none';
  if (noResultsContainer) noResultsContainer.style.display = 'none';
  
  try {
    console.log('Cargando ranking ' + period + (forceRefresh ? ' (forzando recarga)' : ''));
    
    // Pequeña espera para asegurar que el spinner se muestre (evita parpadeos)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Obtener datos del localStorage
    let rankingData = await getRankingDataFromStorage(period);
    
    // Ocultar spinner de carga
    if (loadingContainer) loadingContainer.style.display = 'none';
    
    // Limpiar contenido anterior
    rankingTableBody.innerHTML = '';
    
    if (!rankingData || rankingData.length === 0) {
      // Si no hay datos, mostrar mensaje
      if (noResultsContainer) noResultsContainer.style.display = 'flex';
      return;
    }
    
    // Mostrar tabla
    if (rankingTable) rankingTable.style.display = 'table';
    
    // Ordenar por puntaje (score) de mayor a menor
    rankingData.sort((a, b) => b.score - a.score);
    
    // Obtener nombre del jugador actual para destacarlo
    const currentPlayer = getUsernameFromStorage();
    
    // Variable para rastrear si el jugador actual está en la tabla
    let currentPlayerPosition = -1;
    
    // Generar filas de la tabla (primero los top 3)
    populateTopPlayers(rankingData.slice(0, 3), currentPlayer);
    
    // Generar filas de la tabla principal
    rankingData.forEach((item, index) => {
      const position = index + 1;
      
      // Determinar si es el jugador actual (comparar sin importar mayúsculas/minúsculas)
      const isCurrentPlayer = currentPlayer && item.name && 
                             item.name.toLowerCase() === currentPlayer.toLowerCase();
      if (isCurrentPlayer) {
        currentPlayerPosition = position;
      }
      
      // No volver a mostrar los top 3 en la tabla principal si hay sección top-players
      if (position <= 3 && document.querySelector('.top-players').children.length > 0) {
        return;
      }
      
      const tr = document.createElement("tr");
      
      // Añadir clase si es el jugador actual
      if (isCurrentPlayer) {
        tr.classList.add('current-player');
        tr.classList.add('highlight'); // Añadir highlight directamente
      }
      
      // Determinar clase para posición
      let positionClass = '';
      if (position === 1) positionClass = 'gold';
      else if (position === 2) positionClass = 'silver';
      else if (position === 3) positionClass = 'bronze';
      
      // Formatear fecha
      const gameDate = item.date ? new Date(item.date) : null;
      const formattedDate = gameDate ? 
        `${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
        '-';
      
      tr.innerHTML = `
        <td class="position ${positionClass}">${position}</td>
        <td class="username">
          ${item.name || "Anónimo"}
          ${isCurrentPlayer ? '<span class="current-player-badge">Tú</span>' : ''}
        </td>
        <td class="score">${item.score || 0}</td>
        <td class="correct">${item.correct || 0}</td>
        <td class="wrong">${item.wrong || 0}</td>
        <td class="difficulty">${formatDifficulty(item.difficulty)}</td>
        <td class="date">${formattedDate}</td>
      `;
      
      rankingTableBody.appendChild(tr);
    });
    
    // Mostrar posición del jugador actual si está en el ranking
    updatePlayerPositionDisplay(currentPlayerPosition, currentPlayer);
    
    // Scroll al jugador actual si está en el ranking
    if (currentPlayerPosition > 0) {
      scrollToCurrentPlayer();
    }
    
    // Actualizar estadísticas globales
    updateGlobalStats(rankingData);
    
    console.log('Ranking cargado correctamente');
  } catch (err) {
    console.error("Error general al cargar ranking:", err);
    if (loadingContainer) {
      loadingContainer.innerHTML = `
        <div class="no-results">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error al cargar el ranking: ${err.message}</p>
        </div>
      `;
      loadingContainer.style.display = 'flex';
    }
  }
}

// Configurar la funcionalidad de búsqueda y filtros
function setupSearchAndFilters() {
  const searchInput = document.getElementById('player-search');
  const searchButton = document.getElementById('search-button');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const dateFilter = document.getElementById('date-filter');
  const resetButton = document.getElementById('reset-filters');
  
  // Manejar búsqueda cuando se hace clic en el botón
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      applyFiltersAndSearch();
    });
  }
  
  // Manejar búsqueda al presionar Enter en el input
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyFiltersAndSearch();
      }
    });
  }
  
  // Manejar cambios en los filtros de dificultad
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', () => {
      applyFiltersAndSearch();
    });
  }
  
  // Manejar cambios en los filtros de fecha
  if (dateFilter) {
    dateFilter.addEventListener('change', () => {
      applyFiltersAndSearch();
    });
  }
  
  // Manejar clic en el botón de restablecer
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      // Restablecer valores en los controles
      if (searchInput) searchInput.value = '';
      if (difficultyFilter) difficultyFilter.value = 'all';
      if (dateFilter) dateFilter.value = 'all';
      
      // Aplicar filtros (ahora sin filtros)
      applyFiltersAndSearch();
    });
  }
}

// Aplicar búsqueda y filtros al ranking
async function applyFiltersAndSearch() {
  // Obtener los valores de los filtros
  const searchTerm = document.getElementById('player-search')?.value.toLowerCase().trim() || '';
  const difficultyFilter = document.getElementById('difficulty-filter')?.value || 'all';
  const dateFilter = document.getElementById('date-filter')?.value || 'all';
  
  console.log(`Aplicando filtros - Búsqueda: "${searchTerm}", Dificultad: ${difficultyFilter}, Fecha: ${dateFilter}`);
  
  try {
    // Obtener datos del ranking
    const rankingData = await getRankingDataFromStorage();
    
    // Aplicar filtros
    const filteredData = rankingData.filter(entry => {
      // Filtrar por término de búsqueda
      const matchesSearch = searchTerm === '' || 
                           (entry.name && entry.name.toLowerCase().includes(searchTerm));
      
      // Filtrar por dificultad
      const matchesDifficulty = difficultyFilter === 'all' || 
                               entry.difficulty === difficultyFilter;
      
      // Filtrar por fecha
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const entryDate = new Date(entry.date);
        const today = new Date();
        
        switch (dateFilter) {
          case 'today':
            // Comprobar si es del mismo día
            matchesDate = entryDate.toDateString() === today.toDateString();
            break;
          case 'week':
            // Comprobar si está dentro de la última semana
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            matchesDate = entryDate >= oneWeekAgo;
            break;
          case 'month':
            // Comprobar si está dentro del último mes
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            matchesDate = entryDate >= oneMonthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesDifficulty && matchesDate;
    });
    
    // Mostrar tabla filtrada
    displayFilteredRanking(filteredData);
    
  } catch (error) {
    console.error('Error al aplicar filtros:', error);
  }
}

// Mostrar tabla con datos filtrados
function displayFilteredRanking(filteredData) {
  const rankingTable = document.getElementById('ranking-table');
  const rankingTableBody = document.getElementById('ranking-body');
  const noResultsContainer = document.getElementById('no-results');
  
  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-body'");
    return;
  }
  
  // Limpiar contenido anterior
  rankingTableBody.innerHTML = '';
  
  if (!filteredData || filteredData.length === 0) {
    // Si no hay datos después de filtrar, mostrar mensaje
    if (noResultsContainer) {
      noResultsContainer.innerHTML = `
        <i class="fas fa-filter"></i>
        <p>No se encontraron resultados con los filtros seleccionados.</p>
      `;
      noResultsContainer.style.display = 'flex';
    }
    
    if (rankingTable) rankingTable.style.display = 'none';
    return;
  }
  
  // Ocultar mensaje de no resultados
  if (noResultsContainer) noResultsContainer.style.display = 'none';
  
  // Mostrar tabla
  if (rankingTable) rankingTable.style.display = 'table';
  
  // Ordenar por puntaje (score) de mayor a menor
  filteredData.sort((a, b) => b.score - a.score);
  
  // Obtener nombre del jugador actual para destacarlo
  const currentPlayer = getUsernameFromStorage();
  
  // Variable para rastrear si el jugador actual está en la tabla
  let currentPlayerPosition = -1;
  
  // Generar filas de la tabla (primero los top 3)
  populateTopPlayers(filteredData.slice(0, 3), currentPlayer);
  
  // Generar filas de la tabla principal
  filteredData.forEach((item, index) => {
    const position = index + 1;
    
    // Determinar si es el jugador actual (comparar sin importar mayúsculas/minúsculas)
    const isCurrentPlayer = currentPlayer && item.name && 
                           item.name.toLowerCase() === currentPlayer.toLowerCase();
    if (isCurrentPlayer) {
      currentPlayerPosition = position;
    }
    
    // No volver a mostrar los top 3 en la tabla principal si hay sección top-players
    if (position <= 3 && document.querySelector('.top-players').children.length > 0) {
      return;
    }
    
    const tr = document.createElement("tr");
    
    // Añadir clase si es el jugador actual
    if (isCurrentPlayer) {
      tr.classList.add('current-player');
      tr.classList.add('highlight'); // Añadir highlight directamente
    }
    
    // Determinar clase para posición
    let positionClass = '';
    if (position === 1) positionClass = 'gold';
    else if (position === 2) positionClass = 'silver';
    else if (position === 3) positionClass = 'bronze';
    
    // Formatear fecha
    const gameDate = item.date ? new Date(item.date) : null;
    const formattedDate = gameDate ? 
      `${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
      '-';
    
    tr.innerHTML = `
      <td class="position ${positionClass}">${position}</td>
      <td class="username">
        ${item.name || "Anónimo"}
        ${isCurrentPlayer ? '<span class="current-player-badge">Tú</span>' : ''}
      </td>
      <td class="score">${item.score || 0}</td>
      <td class="correct">${item.correct || 0}</td>
      <td class="wrong">${item.wrong || 0}</td>
      <td class="difficulty">${formatDifficulty(item.difficulty)}</td>
      <td class="date">${formattedDate}</td>
    `;
    
    rankingTableBody.appendChild(tr);
  });
  
  // Mostrar posición del jugador actual si está en el ranking
  updatePlayerPositionDisplay(currentPlayerPosition, currentPlayer);
  
  // Scroll al jugador actual si está en el ranking
  if (currentPlayerPosition > 0) {
    scrollToCurrentPlayer();
  }
  
  // Actualizar estadísticas globales con los datos filtrados
  updateGlobalStats(filteredData);
}

// Mostrar los datos del ranking en la UI
function displayRankingData(data) {
    // Validar datos
    if (!data || !Array.isArray(data) || data.length === 0) {
        showNoResultsMessage('No hay datos de ranking disponibles');
        return;
    }
    
    // Ocultar mensajes de error
    hideErrorMessages();
    
    // Mostrar elementos de ranking
    const topPlayersContainer = document.querySelector('.top-players');
    const rankingTableContainer = document.querySelector('.ranking-table-container');
    
    if (topPlayersContainer) topPlayersContainer.style.display = 'block';
    if (rankingTableContainer) rankingTableContainer.style.display = 'block';

    // Mostrar top jugadores y tabla de ranking
    displayTopPlayers(data);
    displayRankingTable(data);
    
    // Actualizar estadísticas globales
    updateGlobalStats(data);
    
    // Resaltar jugador actual
    highlightCurrentPlayer();
    
    // Mostrar mensaje especial si acaba de terminar una partida
    if (isComingFromGameCompletion()) {
        const username = getCurrentUsername();
        const userRank = data.findIndex(item => item.name === username) + 1;
        if (userRank > 0) {
            updatePlayerPositionDisplay(userRank, username);
        }
    }
}

// Mostrar los top 3 jugadores
function displayTopPlayers(data) {
    const topPlayersContainer = document.querySelector('.top-players');
    if (!topPlayersContainer) return;
    
    // Limpiar contenedor
    topPlayersContainer.innerHTML = '';
    
    // Obtener los primeros 3 jugadores o menos
    const topPlayers = data.slice(0, Math.min(3, data.length));
    
    // Crear elementos para cada jugador del top
    topPlayers.forEach((player, index) => {
        if (!player || !player.name) return;
        
        const playerElement = document.createElement('div');
        playerElement.className = `top-player ${index === 0 ? 'first' : ''}`;
        
        playerElement.innerHTML = `
            <span class="rank-number">${index + 1}</span>
            <div class="top-avatar">
                <i class="fas fa-user"></i>
            </div>
            <h3 class="top-name">${player.name}</h3>
            <div class="top-score">${player.score || 0}</div>
            <div class="top-details">
                <span><i class="fas fa-gamepad"></i> ${player.games_played || 1}</span>
                <span><i class="fas fa-check"></i> ${player.correct_answers || 0}</span>
            </div>
        `;
        
        // Hacer clic para ver perfil del jugador
        playerElement.style.cursor = 'pointer';
        playerElement.addEventListener('click', () => {
            window.location.href = `profile.html?username=${encodeURIComponent(player.name)}`;
        });
        
        topPlayersContainer.appendChild(playerElement);
    });
}

// Mostrar tabla de ranking completa
function displayRankingTable(data) {
    const tableContainer = document.querySelector('.ranking-table-container');
    if (!tableContainer) return;
    
    // Ordenar datos por puntuación (para asegurar el orden correcto)
    data.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Limpiar contenedor o crear tabla si no existe
    let table = tableContainer.querySelector('.ranking-table');
    
    if (!table) {
        table = document.createElement('table');
        table.className = 'ranking-table';
        tableContainer.appendChild(table);
    }
    
    // Crear estructura de la tabla
    table.innerHTML = `
        <thead>
            <tr>
                <th width="10%">Posición</th>
                <th width="30%">Jugador</th>
                <th width="15%">Puntuación</th>
                <th width="15%">Partidas</th>
                <th width="15%">Aciertos</th>
                <th width="15%">Última partida</th>
            </tr>
        </thead>
        <tbody id="ranking-body">
        </tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    // Verificar si hay datos válidos
    if (!data || data.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" class="empty-table-message">
                No hay datos de ranking disponibles
            </td>
        `;
        tbody.appendChild(emptyRow);
        return;
    }
    
    // Crear filas para cada jugador
    data.forEach((player, index) => {
        // Verificar que el jugador sea válido
        if (!player || !player.name) return;
        
        const position = index + 1;
        const row = document.createElement('tr');
        row.dataset.player = player.name;
        
        // Determinar clase para posición
        let positionClass = '';
        if (position === 1) positionClass = 'gold';
        else if (position === 2) positionClass = 'silver';
        else if (position === 3) positionClass = 'bronze';
        
        // Formatear fecha
        let formattedDate = 'Desconocida';
        if (player.date) {
            const date = new Date(player.date);
            formattedDate = formatDate(date);
        }
        
        // Contenido de la fila
        row.innerHTML = `
            <td class="position ${positionClass}">${position}</td>
            <td class="username">${player.name} 
                ${player.name === getCurrentUsername() ? 
                    '<span class="current-player-badge"><i class="fas fa-user"></i> Tú</span>' : ''}
            </td>
            <td class="score">${player.score || 0}</td>
            <td>${player.games_played || 1}</td>
            <td>${player.correct_answers || 0}</td>
            <td>${formattedDate}</td>
        `;
        
        // Hacer clic para ver perfil del jugador
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            window.location.href = `profile.html?username=${encodeURIComponent(player.name)}`;
        });
        
        tbody.appendChild(row);
    });
}

// Destacar al jugador actual en la tabla
function highlightCurrentPlayer() {
    const currentUsername = getCurrentUsername();
    if (!currentUsername) return;
    
    // Buscar al jugador actual en la tabla
    const rows = document.querySelectorAll('.ranking-table tr');
    let playerFound = false;
    let playerPosition = 0;
    
    rows.forEach((row, index) => {
        if (row.dataset && row.dataset.player && 
            row.dataset.player.toLowerCase() === currentUsername.toLowerCase()) {
            
            row.classList.add('current-player');
            row.classList.add('highlight');
            playerFound = true;
            playerPosition = index; // Considerando también el encabezado
        }
    });
    
    // Actualizar mensaje de posición del jugador
    updatePlayerPositionNote(playerFound, playerPosition);
    
    // Si no se encuentra directamente, intentar obtener posición desde LocalStorage
    if (!playerFound) {
        const storedPosition = localStorage.getItem('currentRankingPosition');
        if (storedPosition) {
            updatePlayerPositionNote(true, parseInt(storedPosition));
        }
    }
}

// Actualizar mensaje que muestra la posición del jugador
function updatePlayerPositionNote(playerFound, position) {
    const noteElement = document.getElementById('player-position-note');
    if (!noteElement) return;
    
    const currentUsername = getCurrentUsername() || 'Jugador';
    
    if (playerFound) {
        noteElement.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <strong>${currentUsername}</strong>, actualmente estás en la posición 
            <strong>${position}</strong> del ranking ${currentPeriod === 'global' ? 'global' : 
                    currentPeriod === 'monthly' ? 'mensual' : 'semanal'}.
        `;
        noteElement.style.display = 'flex';
    } else {
        noteElement.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <strong>${currentUsername}</strong>, aún no apareces en el ranking ${
                currentPeriod === 'global' ? 'global' : 
                currentPeriod === 'monthly' ? 'mensual' : 'semanal'
            }. ¡Juega para aparecer!
        `;
        noteElement.style.display = 'flex';
    }
}

// Buscar jugador por nombre
function searchPlayer(query) {
    if (!query) {
        // Si la búsqueda está vacía, mostrar todos los jugadores
        displayRankingData(rankingData);
        return;
    }
    
    // Filtrar jugadores por nombre
    const filteredData = rankingData.filter(player => 
        player.name && player.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // Mostrar resultados filtrados
    displayRankingData(filteredData);
    
    // Mostrar mensaje si no hay resultados
    if (filteredData.length === 0) {
        showNoResultsMessage(`No se encontró ningún jugador con el nombre "${query}"`);
    }
}

// Mostrar mensaje cuando no hay resultados
function showNoResultsMessage(message = 'No hay datos disponibles para mostrar') {
    const noResultsElement = document.getElementById('no-results');
    
    if (noResultsElement) {
        const messageElement = noResultsElement.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
        noResultsElement.style.display = 'flex';
    }
    
    // Ocultar tabla y top jugadores
    const topPlayersContainer = document.querySelector('.top-players');
    const rankingTableContainer = document.querySelector('.ranking-table-container');
    
    if (topPlayersContainer) topPlayersContainer.style.display = 'none';
    if (rankingTableContainer) rankingTableContainer.style.display = 'none';
}

// Mostrar mensaje de error
function showError(message) {
    // Verificar si ya existe un mensaje de error
    let errorElement = document.querySelector('.notification.error');
    
    if (!errorElement) {
        // Crear nuevo elemento para el error
        errorElement = document.createElement('div');
        errorElement.className = 'notification error';
        
        // Estructura del mensaje
        errorElement.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="notification-content">
                <h3 class="notification-title">Error</h3>
                <p class="notification-message"></p>
            </div>
        `;
        
        // Insertar después de la cabecera
        const header = document.querySelector('.ranking-header');
        if (header && header.nextElementSibling) {
            header.parentNode.insertBefore(errorElement, header.nextElementSibling);
        } else {
            const container = document.querySelector('.ranking-container');
            if (container) {
                container.appendChild(errorElement);
            }
        }
    }
    
    // Actualizar mensaje de error
    const messageElement = errorElement.querySelector('.notification-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Mostrar el mensaje
    errorElement.style.display = 'flex';
}

// Ocultar mensajes de error
function hideErrorMessages() {
    const errorElements = document.querySelectorAll('.notification.error');
    errorElements.forEach(element => {
        element.style.display = 'none';
    });
    
    const noResultsElement = document.getElementById('no-results');
    if (noResultsElement) {
        noResultsElement.style.display = 'none';
    }
}

// Activar/desactivar estado de carga
function toggleLoadingState(isLoading) {
    const loadingElement = document.getElementById('loading-container');
    
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'flex' : 'none';
    }
    
    // Ocultar/mostrar contenedores según estado de carga
    const containers = [
        document.querySelector('.top-players'),
        document.querySelector('.ranking-table-container')
    ];
    
    containers.forEach(container => {
        if (container) {
            container.style.display = isLoading ? 'none' : 'block';
        }
    });
}

// Iniciar actualización automática
function startAutoRefresh() {
    ProfileUtils.startAutoRefresh(
        null, // No necesitamos actualizar perfil individual
        (rankings) => {
            // Actualizar ranking con los nuevos datos
            if (rankings && rankings.length) {
                rankingData = rankings;
                displayRankingData(rankingData);
                highlightCurrentPlayer();
            }
        }
    );
}

// Obtener nombre de usuario actual
function getCurrentUsername() {
    return localStorage.getItem('username') || null;
}

// Verificar si el usuario viene de completar una partida
function isComingFromGameCompletion() {
    const lastGameStats = localStorage.getItem('lastGameStats');
    if (!lastGameStats) return false;
    
    try {
        const stats = JSON.parse(lastGameStats);
        const gameDate = new Date(stats.date);
        const now = new Date();
        
        // Comprobar si la partida se completó hace menos de 5 minutos
        return now - gameDate < 5 * 60 * 1000;
    } catch (error) {
        console.error('Error al parsear lastGameStats:', error);
        return false;
    }
}

// Formato de fecha
function formatDate(date) {
    if (!date) return 'Desconocida';
    
    const now = new Date();
    const diff = now - date;
    
    // Menos de un día
    if (diff < 24 * 60 * 60 * 1000) {
        return 'Hoy';
    }
    
    // Menos de 2 días
    if (diff < 2 * 24 * 60 * 60 * 1000) {
        return 'Ayer';
    }
    
    // Menos de una semana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[date.getDay()];
    }
    
    // Formato normal
    return date.toLocaleDateString();
}
