// ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM cargado - Inicializando ranking');
  
  // Obtener el nombre de usuario guardado
  const username = getUsernameFromStorage();
  console.log('Usuario detectado:', username || 'Anónimo');
  
  // Verificar si venimos de finalizar una partida
  const urlParams = new URLSearchParams(window.location.search);
  const fromGame = urlParams.get('fromGame');
  
  // Si venimos de una partida, forzar recarga del ranking
  if (fromGame === 'true') {
    await loadRanking(true); // Forzar recarga al venir de partida
    showGameCompletionMessage();
  } else {
    await loadRanking(false); // Carga normal
  }
  
  // Configurar los tabs de períodos
  setupRankingTabs();
  
  // Configurar los botones de navegación
  setupNavigationButtons();
});

// Obtener nombre de usuario desde localStorage
function getUsernameFromStorage() {
  // Intentar obtener del localStorage
  const username = localStorage.getItem('username');
  
  // Si no existe en localStorage, verificar si hay un nombre guardado con la IP
  if (!username) {
    const userIP = localStorage.getItem('userIP');
    if (userIP) {
      try {
        // Intentar obtener perfil guardado para esta IP
        const profileKey = `profile_${userIP}`;
        const profileData = localStorage.getItem(profileKey);
        
        if (profileData) {
          const profile = JSON.parse(profileData);
          if (profile && profile.name) {
            return profile.name;
          }
        }
      } catch (error) {
        console.error('Error al obtener nombre desde perfil:', error);
      }
    }
    return null;
  }
  
  return username;
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

// Configurar tabs del ranking
function setupRankingTabs() {
  const tabs = document.querySelectorAll('.ranking-tab');
  if (tabs.length === 0) return;
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Eliminar clase active de todos los tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Añadir clase active al tab clickeado
      this.classList.add('active');
      
      // Obtener período seleccionado
      const period = this.getAttribute('data-period');
      
      // Cargar datos según el período
      loadRanking(true, period);
    });
  });
}

// Obtener datos del ranking desde el localStorage
async function getRankingDataFromStorage(period = 'global') {
  try {
    // Cargamos todos los historiales de juego guardados en localStorage
    let rankingData = [];
    const keys = Object.keys(localStorage);
    
    // Obtener rangos de fecha según el período
    const dateRange = getPeriodDateRange(period);
    
    // Obtener todos los registros que comienzan con "gameHistory_"
    for (const key of keys) {
      if (key.startsWith('gameHistory_')) {
        try {
          const history = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(history)) {
            // Filtrar partidas según el período seleccionado
            const filteredHistory = history.filter(game => {
              if (!dateRange) return true; // Si no hay filtro, incluir todas
              
              const gameDate = game.date ? new Date(game.date) : null;
              if (!gameDate) return false;
              
              return gameDate >= dateRange.start && gameDate <= dateRange.end;
            });
            
            // Añadir cada partida como una entrada en el ranking
            filteredHistory.forEach(game => {
              if (game.name) { // Usar el nombre guardado en la partida
                rankingData.push({
                  name: game.name,
                  score: game.score || 0,
                  correct: game.correct || 0,
                  wrong: game.wrong || 0,
                  difficulty: game.difficulty || 'normal',
                  date: game.date
                });
              }
            });
          }
        } catch (e) {
          console.error(`Error al procesar clave ${key}:`, e);
        }
      }
    }
    
    console.log(`Datos de ranking obtenidos: ${rankingData.length} registros para período ${period}`);
    return rankingData;
  } catch (error) {
    console.error('Error al obtener datos del ranking:', error);
    return [];
  }
}

// Obtener rango de fechas para el período seleccionado
function getPeriodDateRange(period) {
  if (period === 'global') return null; // Sin límite de fecha
  
  const now = new Date();
  const start = new Date();
  
  if (period === 'monthly') {
    // Primer día del mes actual
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    // Primer día de la semana actual (lunes)
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que la semana comience el lunes
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
  }
  
  return {
    start: start,
    end: now
  };
}

// Actualizar estadísticas globales mostradas en la página
function updateGlobalStats(rankingData) {
  // Actualizar jugadores totales (nombres únicos)
  const uniquePlayers = new Set(rankingData.map(item => item.name)).size;
  const totalGames = rankingData.length;
  
  // Calcular tasa de aciertos total
  let totalCorrect = 0;
  let totalQuestions = 0;
  
  rankingData.forEach(item => {
    totalCorrect += item.correct || 0;
    totalQuestions += (item.correct || 0) + (item.wrong || 0);
  });
  
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  // Actualizar valores en la UI
  document.getElementById('total-players').textContent = uniquePlayers;
  document.getElementById('total-games').textContent = totalGames;
  document.getElementById('success-rate').textContent = `${successRate}%`;
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

// Formatear nivel de dificultad
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
        <td class="username">${item.name || "Anónimo"}</td>
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
