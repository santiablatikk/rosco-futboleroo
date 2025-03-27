// ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM cargado - Inicializando ranking');
  
  // Obtener el perfil del jugador y el ranking
  await loadPlayerProfile();
  
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

// Obtener el perfil del jugador basado en su IP o localStorage
async function loadPlayerProfile() {
  try {
    console.log('Cargando perfil del jugador...');
    
    // Intentar obtener perfil del servidor
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const profileData = await response.json();
        if (profileData && profileData.name) {
          console.log('Perfil cargado desde servidor:', profileData.name);
          
          // Actualizar datos en localStorage
          localStorage.setItem('username', profileData.name);
          localStorage.setItem('playerRankingData', JSON.stringify({
            name: profileData.name,
            totalScore: profileData.totalScore || 0,
            gamesPlayed: profileData.gamesPlayed || 0
          }));
          
          return profileData;
        }
      }
    } catch (serverError) {
      console.log('No se pudo conectar con el servidor:', serverError);
    }
    
    // Si no hay datos del servidor, usar localStorage
    const username = localStorage.getItem('username');
    if (username) {
      console.log('Usando perfil desde localStorage:', username);
      return { name: username };
    } else {
      console.log('No se encontró perfil para este usuario');
      return null;
    }
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    return null;
  }
}

// Cargar ranking con varias opciones
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
    
    let rankingData = [];
    
    // Intentar obtener datos desde el servidor
    try {
      // Parámetros para la solicitud
      const params = new URLSearchParams();
      if (forceRefresh) params.append('nocache', Date.now());
      if (period) params.append('period', period);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/ranking${queryString}`);
      
      if (response.ok) {
        rankingData = await response.json();
        console.log('Ranking obtenido del servidor:', rankingData.length, 'entradas');
        
        // Guardar en sessionStorage para uso offline
        sessionStorage.setItem('cachedRanking', JSON.stringify(rankingData));
        sessionStorage.setItem('rankingLastUpdate', new Date().toISOString());
      } else {
        throw new Error(`Error HTTP: ${response.status}`);
      }
    } catch (fetchError) {
      console.error("Error al obtener datos del servidor:", fetchError);
      
      // Usar datos en caché si hay un error de conexión
      const cachedRanking = sessionStorage.getItem('cachedRanking');
      if (cachedRanking) {
        console.log('Usando ranking en caché debido a error de conexión');
        rankingData = JSON.parse(cachedRanking);
      } else {
        // Si no hay caché, mostrar mensaje de error
        showConnectionError(loadingContainer);
        return;
      }
    }
    
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
    const currentPlayer = localStorage.getItem('username');
    
    // Variable para rastrear si el jugador actual está en la tabla
    let currentPlayerPosition = -1;
    
    // Generar filas de la tabla (primero los top 3)
    populateTopPlayers(rankingData.slice(0, 3), currentPlayer);
    
    // Generar filas de la tabla principal
    rankingData.forEach((item, index) => {
      const position = index + 1;
      
      // Determinar si es el jugador actual
      const isCurrentPlayer = currentPlayer && item.name === currentPlayer;
      if (isCurrentPlayer) {
        currentPlayerPosition = position;
      }
      
      // No volver a mostrar los top 3 en la tabla principal si hay sección top-players
      if (position <= 3 && document.querySelector('.top-players')) {
        return;
      }
      
      const tr = document.createElement("tr");
      
      // Añadir clase si es el jugador actual
      if (isCurrentPlayer) {
        tr.classList.add('current-player');
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
    
    // Destacar al jugador actual en la tabla
    highlightCurrentPlayer();
    
    console.log('Ranking cargado correctamente');
  } catch (err) {
    console.error("Error general al cargar ranking:", err);
    showConnectionError(loadingContainer, err.message);
  }
  
  // Como salvaguarda, ocultar el spinner después de 5 segundos
  setTimeout(() => {
    if (loadingContainer && loadingContainer.style.display === 'flex') {
      console.warn('Forzando ocultamiento del spinner de carga después de timeout');
      loadingContainer.style.display = 'none';
      
      // Si la tabla sigue oculta, mostrar error
      if (rankingTable && rankingTable.style.display === 'none') {
        showConnectionError(loadingContainer, 'Timeout al cargar el ranking');
      }
    }
  }, 5000);
}

// Función para mostrar error de conexión
function showConnectionError(container, message = 'Comprueba tu conexión') {
  if (container) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-exclamation-circle"></i>
        <p>Error al cargar el ranking. ${message}</p>
        <button class="reload-btn" onclick="window.location.reload()">
          <i class="fas fa-sync-alt"></i> Reintentar
        </button>
      </div>
    `;
    container.style.display = 'flex';
  }
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
      playerPositionNote.className = position <= 3 ? 'top-position' : 'normal-position';
    } else if (playerName) {
      // Si el jugador no está en el ranking visible, mostrar mensaje
      playerPositionNote.innerHTML = `
        <i class="fas fa-info-circle"></i>
        No estás entre los mejores jugadores del ranking. ¡Sigue intentándolo!
      `;
      playerPositionNote.style.display = 'block';
      playerPositionNote.className = 'not-in-ranking';
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
      <img src="img/avatar-${display.position}.jpg" alt="${player.name}" class="top-avatar">
      <div class="top-name">${player.name || "Anónimo"}</div>
      <div class="top-score">${player.score || 0}</div>
      <div class="top-details">
        <span><i class="fas fa-check"></i> ${player.correct || 0}</span>
        <span><i class="fas fa-times"></i> ${player.wrong || 0}</span>
      </div>
    `;
    
    topPlayersContainer.appendChild(playerDiv);
  });
}

// Función para resaltar al jugador actual en la tabla
function highlightCurrentPlayer() {
  const playerRow = document.querySelector('tr.current-player');
  if (playerRow) {
    // Asegurar que sea visible
    setTimeout(() => {
      // Añadir clase de destaque
      playerRow.classList.add('highlight');
      
      // Scroll a la posición del jugador
      const tableContainer = document.querySelector('.ranking-table-container');
      if (tableContainer) {
        const rowRect = playerRow.getBoundingClientRect();
        const containerRect = tableContainer.getBoundingClientRect();
        
        if (rowRect.top < containerRect.top || rowRect.bottom > containerRect.bottom) {
          // Calcular posición óptima
          const scrollOffset = playerRow.offsetTop - tableContainer.offsetTop - 100;
          tableContainer.scrollTo({
            top: Math.max(0, scrollOffset),
            behavior: 'smooth'
          });
        }
      }
    }, 500);
  }
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
    
    // Obtener datos de la última partida
    const playerName = localStorage.getItem('username') || 'Jugador';
    const lastGameStats = JSON.parse(localStorage.getItem('lastGameStats') || '{}');
    const score = lastGameStats.score || 0;
    const correct = lastGameStats.correct || 0;
    const wrong = lastGameStats.wrong || 0;
    
    messageElement.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-trophy"></i>
        <div class="completion-content">
          <h3>¡Partida completada!</h3>
          <p><strong>${playerName}</strong>, tu puntuación de <strong>${score} puntos</strong> 
          (${correct} aciertos, ${wrong} errores) ha sido registrada.</p>
        </div>
        <button class="close-btn" onclick="this.parentNode.parentNode.style.display='none';">
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
  }
  
  // Auto-ocultar mensaje después de 8 segundos
  setTimeout(() => {
    if (messageElement) {
      messageElement.style.opacity = '0';
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
