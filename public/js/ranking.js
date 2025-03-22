// ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM cargado - Inicializando ranking');
  
  // Obtener el perfil del jugador y el ranking
  await loadPlayerProfile();
  await loadRanking(true); // Forzar recarga al iniciar
  
  // Verificar si venimos de finalizar una partida
  const urlParams = new URLSearchParams(window.location.search);
  const fromGame = urlParams.get('fromGame');
  if (fromGame === 'true') {
    showGameCompletionMessage();
    // Ya se forzó la recarga del ranking al iniciar
  }
  
  // Configurar los botones
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
});

// Obtener el perfil del jugador basado en su IP o localStorage
async function loadPlayerProfile() {
  try {
    console.log('Cargando perfil del jugador...');
    
    // Si estamos en localhost, usar datos locales
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Modo local - usando perfil desde localStorage');
      return;
    }
    
    const response = await fetch('/api/profile');
    if (!response.ok) {
      throw new Error('No se pudo cargar el perfil del jugador');
    }
    
    const profileData = await response.json();
    if (profileData && profileData.name) {
      console.log('Perfil cargado:', profileData.name);
      // Guardar nombre del jugador en localStorage para uso global
      localStorage.setItem('username', profileData.name);
      localStorage.setItem('playerRankingData', JSON.stringify({
        name: profileData.name,
        totalScore: profileData.totalScore || 0,
        gamesPlayed: profileData.gamesPlayed || 0
      }));
    } else {
      console.log('No se encontró perfil para este usuario');
    }
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
  }
}

async function loadRanking(forceRefresh = false) {
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
    console.log('Cargando ranking' + (forceRefresh ? ' (forzando recarga)' : '') + '...');
    
    // Pequeña espera para asegurar que el spinner se muestre (evita parpadeos)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let rankingData = [];
    
    // En modo local/desarrollo, usar datos mockeados
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Modo local - usando datos de ranking mockeados');
      
      // Si no se fuerza recarga, intentar usar caché
      if (!forceRefresh) {
        const cachedRanking = sessionStorage.getItem('cachedRanking');
        if (cachedRanking) {
          rankingData = JSON.parse(cachedRanking);
          console.log('Usando ranking en caché');
        }
      }
      
      // Si no hay caché o se fuerza recarga, generar datos
      if (rankingData.length === 0) {
        // Simular tiempo de carga
        await new Promise(resolve => setTimeout(resolve, 800));
        rankingData = getMockRankingData();
        // Guardar en caché
        sessionStorage.setItem('cachedRanking', JSON.stringify(rankingData));
      }
    } else {
      // En producción, obtener datos del servidor
      try {
        // Usar caché al buscar para evitar cargas innecesarias a menos que se fuerce recarga
        const cacheParam = forceRefresh ? `?nocache=${Date.now()}` : '';
        
        const res = await fetch(`/api/ranking${cacheParam}`);
        if (!res.ok) throw new Error(`Respuesta HTTP no válida: ${res.status}`);
        rankingData = await res.json();
        
        // Guardar en caché
        sessionStorage.setItem('cachedRanking', JSON.stringify(rankingData));
      } catch (fetchError) {
        console.error("Error al obtener datos del servidor:", fetchError);
        
        // Intentar usar datos en caché si hay un error
        const cachedRanking = sessionStorage.getItem('cachedRanking');
        if (cachedRanking) {
          console.log('Usando ranking en caché debido a error de conexión');
          rankingData = JSON.parse(cachedRanking);
        } else {
          // Si no hay caché, mostrar error y permitir recargar
          if (loadingContainer) {
            loadingContainer.innerHTML = `
              <div class="alert alert-info">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar el ranking. Comprueba tu conexión.</p>
                <button class="reload-btn" onclick="window.location.reload()">
                  <i class="fas fa-sync-alt"></i> Reintentar
                </button>
              </div>
            `;
            loadingContainer.style.display = 'flex';
          }
          return;
        }
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
    
    // Ordenar por puntaje (score) de mayor a menor si no están ordenados
    rankingData.sort((a, b) => b.score - a.score);
    
    // Obtener nombre del jugador actual para destacarlo
    const currentPlayer = localStorage.getItem('username');
    
    // Variable para rastrear si el jugador actual está en la tabla
    let currentPlayerPosition = -1;
    
    // Generar filas de la tabla
    rankingData.forEach((item, index) => {
      const position = index + 1;
      const tr = document.createElement("tr");
      
      // Determinar si es el jugador actual
      const isCurrentPlayer = currentPlayer && item.name === currentPlayer;
      if (isCurrentPlayer) {
        tr.classList.add('current-player');
        currentPlayerPosition = position;
      }
      
      // Determinar clase para posición
      let positionClass = '';
      if (position === 1) positionClass = 'gold';
      else if (position === 2) positionClass = 'silver';
      else if (position === 3) positionClass = 'bronze';
      
      tr.innerHTML = `
        <td class="position ${positionClass}">${position}</td>
        <td class="username">${item.name || "Anónimo"}</td>
        <td class="score">${item.score || 0}</td>
        <td class="games">${item.gamesPlayed || 0}</td>
        <td class="correct">${item.correct || 0}</td>
        <td class="incorrect">${item.wrong || 0}</td>
      `;
      rankingTableBody.appendChild(tr);
    });
    
    // Mostrar posición del jugador actual si está en el ranking
    const playerPositionNote = document.getElementById('player-position-note');
    
    if (playerPositionNote) {
      if (currentPlayer && currentPlayerPosition > 0) {
        // Si el jugador está en el ranking, mostrar su posición
        playerPositionNote.innerHTML = `
          <i class="fas fa-trophy"></i>
          Tu posición actual en el ranking: <strong>${currentPlayerPosition}</strong>
        `;
        playerPositionNote.style.display = 'block';
      } else if (currentPlayer) {
        // Si el jugador no está en el ranking visible, mostrar mensaje
        playerPositionNote.innerHTML = `
          <i class="fas fa-info-circle"></i>
          No estás entre los mejores jugadores del ranking. ¡Sigue intentándolo!
        `;
        playerPositionNote.style.display = 'block';
      } else {
        playerPositionNote.style.display = 'none';
      }
    }
    
    console.log('Ranking cargado correctamente');
  } catch (err) {
    console.error("Error general al cargar ranking:", err);
    
    // Ocultar spinner de carga
    if (loadingContainer) {
      loadingContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error al cargar el ranking: ${err.message}</p>
          <button class="reload-btn" onclick="window.location.reload()">
            <i class="fas fa-sync-alt"></i> Reintentar
          </button>
        </div>
      `;
      loadingContainer.style.display = 'flex';
    }
  }
  
  // Como salvaguarda, ocultar el spinner después de 5 segundos
  // en caso de que algo haya fallado y no se haya ocultado
  setTimeout(() => {
    if (loadingContainer && loadingContainer.style.display === 'flex') {
      console.warn('Forzando ocultamiento del spinner de carga después de timeout');
      loadingContainer.style.display = 'none';
      
      // Si la tabla sigue oculta, mostrar error
      if (rankingTable && rankingTable.style.display === 'none') {
        loadingContainer.innerHTML = `
          <div class="alert alert-info">
            <i class="fas fa-exclamation-circle"></i>
            <p>La carga del ranking está tardando más de lo esperado.</p>
            <button class="reload-btn" onclick="window.location.reload()">
              <i class="fas fa-sync-alt"></i> Reintentar
            </button>
          </div>
        `;
        loadingContainer.style.display = 'flex';
      }
    }
  }, 5000);
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
    
    // Create the alert content with more detailed information
    const playerName = localStorage.getItem('username') || 'Jugador';
    const lastGameStats = JSON.parse(localStorage.getItem('lastGameStats') || '{}');
    const score = lastGameStats.score || 0;
    
    messageElement.innerHTML = `
      <div class="alert alert-success">
        <i class="fas fa-trophy"></i>
        <div class="completion-content">
          <h3>¡Partida completada!</h3>
          <p><strong>${playerName}</strong>, tu puntuación de <strong>${score} puntos</strong> ha sido registrada en el ranking.</p>
        </div>
        <button class="close-btn" onclick="this.parentNode.parentNode.style.display='none';">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Insert after the header but before the ranking table
    const rankingHeader = document.querySelector('.ranking-header');
    if (rankingHeader && rankingHeader.nextSibling) {
      rankingHeader.parentNode.insertBefore(messageElement, rankingHeader.nextSibling);
    } else {
      // Fallback if ranking header not found
      const container = document.querySelector('.container');
      if (container) {
        container.insertBefore(messageElement, container.firstChild);
      }
    }
  }
  
  // Auto-dismiss the message after 8 seconds
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
  
  // Highlight and scroll to the player's row in the ranking table
  setTimeout(() => {
    const currentPlayer = localStorage.getItem('username');
    if (currentPlayer) {
      const playerRow = document.querySelector('tr.current-player');
      if (playerRow) {
        // Add a highlight animation class
        playerRow.classList.add('highlight-row');
        
        // Scroll to the player's position with smooth scrolling
        const rankingScroll = document.querySelector('.ranking-scroll');
        if (rankingScroll) {
          const headerHeight = document.querySelector('.ranking-header')?.offsetHeight || 0;
          const messageHeight = messageElement ? messageElement.offsetHeight : 0;
          
          // Calculate optimal scroll position
          const tableHeaderHeight = document.querySelector('thead')?.offsetHeight || 0;
          const optimalPosition = playerRow.offsetTop - headerHeight - messageHeight - tableHeaderHeight - 20;
          
          rankingScroll.scrollTo({
            top: Math.max(0, optimalPosition),
            behavior: 'smooth'
          });
        }
        
        // Remove highlight after animation completes
        setTimeout(() => {
          playerRow.classList.remove('highlight-row');
        }, 3500);
      }
    }
  }, 1200); // Give time for the ranking to load
}

// Datos de prueba para desarrollo local
function getMockRankingData() {
  const currentPlayerName = localStorage.getItem('username') || 'Jugador';
  const mockPlayers = [
    { name: 'SuperCampeón', score: 2850, gamesPlayed: 42, correct: 623, wrong: 158 },
    { name: 'ProGamer123', score: 2340, gamesPlayed: 36, correct: 531, wrong: 211 },
    { name: 'FutbolMaster', score: 2120, gamesPlayed: 29, correct: 487, wrong: 165 },
    { name: 'RoscoCrack', score: 1930, gamesPlayed: 25, correct: 412, wrong: 131 },
    { name: 'TiktokFutbol', score: 1760, gamesPlayed: 31, correct: 376, wrong: 214 },
    { name: 'PasionFutbol', score: 1590, gamesPlayed: 23, correct: 321, wrong: 115 },
    { name: 'GoleadorNato', score: 1470, gamesPlayed: 19, correct: 298, wrong: 98 },
    { name: 'FutbolExpert', score: 1350, gamesPlayed: 21, correct: 279, wrong: 126 },
    { name: 'PasalaCrack', score: 1280, gamesPlayed: 18, correct: 246, wrong: 89 },
    { name: 'ArgentinoTop', score: 1190, gamesPlayed: 17, correct: 231, wrong: 102 },
  ];
  
  // Verificar si el jugador actual ya está en la lista
  const playerInList = mockPlayers.some(player => player.name === currentPlayerName);
  
  // Si no está en la lista y tiene puntuación, añadirlo en alguna posición aleatoria
  if (!playerInList && localStorage.getItem('hasPlayed') === 'true') {
    // Obtener datos de la última partida o crear datos aleatorios
    let playerScore = 0;
    let playerGames = 1;
    let playerCorrect = 0;
    let playerWrong = 0;
    
    try {
      const lastGameStats = JSON.parse(localStorage.getItem('lastGameStats') || '{}');
      playerScore = lastGameStats.score || Math.floor(Math.random() * 1000 + 500);
      playerCorrect = lastGameStats.correct || Math.floor(Math.random() * 200 + 50);
      playerWrong = lastGameStats.wrong || Math.floor(Math.random() * 100 + 20);
      
      // Si hay historial de partidas, actualizar número de partidas
      const gameHistory = JSON.parse(localStorage.getItem('gameHistory') || '[]');
      playerGames = gameHistory.length || 1;
    } catch (e) {
      console.error('Error obteniendo estadísticas del jugador:', e);
    }
    
    // Crear entrada para el jugador actual
    const currentPlayerEntry = {
      name: currentPlayerName,
      score: playerScore,
      gamesPlayed: playerGames,
      correct: playerCorrect,
      wrong: playerWrong
    };
    
    // Añadir en una posición aleatoria entre 3 y 8 para que no sea siempre el primero
    const insertPosition = Math.floor(Math.random() * 6) + 3;
    mockPlayers.splice(insertPosition, 0, currentPlayerEntry);
  }
  
  return mockPlayers;
}

// Función para formatear la dificultad
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
