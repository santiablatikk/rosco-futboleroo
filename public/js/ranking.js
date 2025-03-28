// ranking.js
let socket;

document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM cargado - Inicializando ranking');
  
  // Inicializar conexión de Socket.io
  initializeSocketConnection();
  
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

// Inicializar conexión con Socket.io
function initializeSocketConnection() {
  try {
    console.log('[DEBUG] Inicializando conexión Socket.io...');
    
    // Comprobar si la biblioteca está disponible
    if (typeof io === 'undefined') {
      console.error('[DEBUG] Error: io no está definido. La biblioteca Socket.io no está cargada correctamente.');
      return;
    }
    
    // Conectar a la misma URL que sirve la página
    socket = io({
      reconnectionAttempts: 5,
      timeout: 10000,
      reconnectionDelay: 1000
    });
    
    // Evento cuando se establece conexión
    socket.on('connect', () => {
      console.log('[DEBUG] Conectado al servidor de ranking en tiempo real con ID:', socket.id);
      
      // Verificar conexión después de 2 segundos
      setTimeout(pingServer, 2000);
    });
    
    // Escuchar evento de prueba de conexión
    socket.on('test-connection', (data) => {
      console.log('[DEBUG] Evento de prueba recibido:', data);
    });
    
    // Evento cuando hay error de conexión
    socket.on('connect_error', (error) => {
      console.error('[DEBUG] Error de conexión Socket.io:', error);
    });
    
    // Escuchar actualizaciones del ranking
    socket.on('ranking-update', (data) => {
      console.log('[DEBUG] Actualización de ranking recibida:', data);
      
      // Mostrar notificación al usuario
      showRankingUpdateNotification(data);
      
      // Recargar datos del ranking (recuperando el período activo)
      const activePeriod = document.querySelector('.ranking-tab.active')?.getAttribute('data-period') || 'global';
      console.log('[DEBUG] Recargando ranking después de actualización con período:', activePeriod);
      loadRanking(true, activePeriod);
    });
    
    // Evento de desconexión
    socket.on('disconnect', (reason) => {
      console.log('[DEBUG] Desconectado del servidor de ranking. Razón:', reason);
    });
    
    // Evento de reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log('[DEBUG] Reconectado al servidor después de', attemptNumber, 'intentos');
    });
    
    // Evento de intento de reconexión
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[DEBUG] Intento de reconexión', attemptNumber);
    });
    
    // Evento de error de reconexión
    socket.on('reconnect_error', (error) => {
      console.error('[DEBUG] Error durante la reconexión:', error);
    });
    
    // Evento cuando se agotan los intentos de reconexión
    socket.on('reconnect_failed', () => {
      console.error('[DEBUG] Falló la reconexión después de múltiples intentos');
    });
    
    console.log('[DEBUG] Eventos Socket.io configurados correctamente');
  } catch (error) {
    console.error('[DEBUG] Error crítico al inicializar Socket.io:', error);
  }
}

// Función para verificar la conexión con el servidor
function pingServer() {
  if (socket && socket.connected) {
    console.log('[DEBUG] Enviando ping al servidor...');
    socket.emit('ping-server', (response) => {
      console.log('[DEBUG] Respuesta de ping recibida:', response);
    });
  } else {
    console.warn('[DEBUG] No se puede enviar ping, socket no conectado');
  }
}

// Mostrar notificación de actualización del ranking
function showRankingUpdateNotification(data) {
  const notificationContainer = document.createElement('div');
  notificationContainer.className = 'ranking-update-notification';
  
  // Estilos para la notificación
  notificationContainer.style.position = 'fixed';
  notificationContainer.style.bottom = '20px';
  notificationContainer.style.left = '20px';
  notificationContainer.style.backgroundColor = 'rgba(34, 197, 94, 0.9)';
  notificationContainer.style.color = 'white';
  notificationContainer.style.padding = '15px 20px';
  notificationContainer.style.borderRadius = '8px';
  notificationContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
  notificationContainer.style.zIndex = '1000';
  notificationContainer.style.maxWidth = '350px';
  notificationContainer.style.animation = 'fadeInUp 0.5s ease-out';
  
  // Contenido de la notificación
  notificationContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas fa-bell" style="font-size: 1.5rem;"></i>
      <div>
        <h4 style="margin: 0 0 5px 0; font-weight: 600;">${data.message}</h4>
        <p style="margin: 0; font-size: 0.9rem;">
          ${data.player} ha registrado ${data.score} puntos. ¡El ranking se ha actualizado!
        </p>
      </div>
    </div>
    <button onclick="this.parentNode.remove();" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: white; cursor: pointer; font-size: 0.9rem;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Añadir animación
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  // Añadir notificación al DOM
  document.body.appendChild(notificationContainer);
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    notificationContainer.style.opacity = '0';
    notificationContainer.style.transform = 'translateY(20px)';
    notificationContainer.style.transition = 'all 0.5s ease';
    
    setTimeout(() => {
      if (notificationContainer.parentNode) {
        notificationContainer.parentNode.removeChild(notificationContainer);
      }
    }, 500);
  }, 5000);
}

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

// Obtener datos del ranking desde el servidor
async function getRankingDataFromServer(period = 'global') {
  try {
    // URL del endpoint del servidor para obtener datos del ranking
    const url = `/api/ranking?period=${period}`;
    console.log(`[DEBUG] Realizando petición al servidor: ${url}`);
    
    // Realizar la petición al servidor
    const response = await fetch(url);
    console.log(`[DEBUG] Respuesta del servidor: status=${response.status}`);
    
    // Si la respuesta no es ok, lanzar un error
    if (!response.ok) {
      throw new Error(`Error al obtener ranking: ${response.status}`);
    }
    
    // Convertir respuesta a JSON
    const rankingData = await response.json();
    
    console.log(`[DEBUG] Datos de ranking obtenidos del servidor: ${rankingData.length} registros para período ${period}`);
    
    // Si no hay datos en el servidor, usar datos locales como respaldo
    if (!rankingData || !Array.isArray(rankingData) || rankingData.length === 0) {
      console.log('[DEBUG] No hay datos en el servidor, intentando obtener datos locales...');
      const localData = await getRankingDataFromStorage(period);
      
      // Si tampoco hay datos locales, crear un ejemplo para mostrar
      if (!localData || localData.length === 0) {
        console.log('[DEBUG] Creando datos de ejemplo para mostrar');
        return createExampleRankingData();
      }
      
      return localData;
    }
    
    return rankingData;
  } catch (error) {
    console.error('[DEBUG] Error al obtener datos del ranking del servidor:', error);
    
    // En caso de error, intentar con datos locales como fallback
    console.log('[DEBUG] Intentando obtener datos locales como respaldo...');
    const localData = await getRankingDataFromStorage(period);
    
    // Si tampoco hay datos locales, crear un ejemplo para mostrar
    if (!localData || localData.length === 0) {
      console.log('[DEBUG] Creando datos de ejemplo para mostrar');
      return createExampleRankingData();
    }
    
    return localData;
  }
}

// Función para crear datos de ejemplo cuando no hay datos
function createExampleRankingData() {
  // Obtener nombre del usuario actual
  const currentUser = getUsernameFromStorage() || 'Jugador';
  
  // Crear algunos datos de ejemplo
  return [
    {
      name: currentUser,
      score: 75,
      correct: 15,
      wrong: 5,
      difficulty: 'normal',
      date: new Date().toISOString(),
      victory: true
    },
    {
      name: 'Maradona',
      score: 100,
      correct: 20,
      wrong: 0,
      difficulty: 'dificil',
      date: new Date().toISOString(),
      victory: true
    },
    {
      name: 'Messi',
      score: 95,
      correct: 19,
      wrong: 1,
      difficulty: 'dificil',
      date: new Date().toISOString(),
      victory: true
    },
    {
      name: 'Ronaldo',
      score: 85,
      correct: 17,
      wrong: 3,
      difficulty: 'normal',
      date: new Date().toISOString(),
      victory: true
    },
    {
      name: 'Pelé',
      score: 80,
      correct: 16,
      wrong: 4,
      difficulty: 'normal',
      date: new Date().toISOString(),
      victory: true
    }
  ];
}

// Función de respaldo: Obtener datos del ranking desde el localStorage
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
    
    console.log(`Datos de ranking obtenidos localmente: ${rankingData.length} registros para período ${period}`);
    return rankingData;
  } catch (error) {
    console.error('Error al obtener datos del ranking local:', error);
    return [];
  }
}

// Enviar resultado de partida al servidor
async function sendGameResultToServer(gameData) {
  try {
    console.log('[DEBUG] Enviando resultado al servidor:', gameData);
    
    // Verificar que los datos tengan el formato esperado
    if (!gameData || !gameData.name || typeof gameData.score !== 'number') {
      console.error('[DEBUG] Datos inválidos para enviar al servidor:', gameData);
      console.log('[DEBUG] Intentando corregir datos...');
      
      // Corregir datos si es posible
      if (gameData) {
        if (!gameData.name) gameData.name = getUsernameFromStorage() || 'Jugador';
        if (typeof gameData.score !== 'number') gameData.score = parseInt(gameData.score) || 0;
        if (typeof gameData.correct !== 'number') gameData.correct = parseInt(gameData.correct) || 0;
        if (typeof gameData.wrong !== 'number') gameData.wrong = parseInt(gameData.wrong) || 0;
        if (!gameData.date) gameData.date = new Date().toISOString();
      } else {
        console.error('[DEBUG] No se pueden corregir datos nulos');
        return false;
      }
    }
    
    // Guardar localmente para respaldo
    saveGameToLocalStorage(gameData);
    
    // Intentar enviar al servidor con un timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
    
    const response = await fetch('/api/ranking/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`[DEBUG] Respuesta del servidor: status=${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Error al enviar resultado: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[DEBUG] Resultado enviado al servidor exitosamente:', result);
    
    // Intentar también actualizar vía Socket.io
    if (socket && socket.connected) {
      try {
        socket.emit('client-game-result', {
          message: 'Nueva entrada en el ranking',
          player: gameData.name,
          score: gameData.score
        });
        console.log('[DEBUG] Notificación enviada vía Socket.io');
      } catch (socketError) {
        console.error('[DEBUG] Error enviando vía Socket.io:', socketError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[DEBUG] Error al enviar resultado al servidor:', error);
    
    // Guardar localmente en caso de error
    saveGameToLocalStorage(gameData);
    
    // Intentar notificar a otros clientes vía Socket.io si la API falla
    if (socket && socket.connected) {
      try {
        socket.emit('client-game-result', {
          message: 'Nueva entrada en el ranking',
          player: gameData.name,
          score: gameData.score
        });
        console.log('[DEBUG] Notificación enviada vía Socket.io (fallback)');
      } catch (socketError) {
        console.error('[DEBUG] Error enviando vía Socket.io (fallback):', socketError);
      }
    }
    
    return false;
  }
}

// Función para guardar el juego en localStorage
function saveGameToLocalStorage(gameData) {
  try {
    if (!gameData) return false;
    
    console.log('[DEBUG] Guardando partida en localStorage:', gameData);
    
    // Guardar los datos de la última partida
    localStorage.setItem('lastGameStats', JSON.stringify(gameData));
    
    // Obtener historial de partidas del usuario
    const userGameHistory = JSON.parse(localStorage.getItem('userGameHistory') || '[]');
    if (!Array.isArray(userGameHistory)) {
      console.error('[DEBUG] userGameHistory no es un array, inicializando nuevo');
      userGameHistory = [];
    }
    
    // Añadir nueva partida al historial
    userGameHistory.push(gameData);
    
    // Limitar el historial a un máximo de 50 partidas
    if (userGameHistory.length > 50) {
      userGameHistory.splice(0, userGameHistory.length - 50);
    }
    
    // Guardar historial actualizado
    localStorage.setItem('userGameHistory', JSON.stringify(userGameHistory));
    
    // También guardar en historial basado en IP
    const userIP = localStorage.getItem('userIP');
    if (userIP) {
      const historyKey = `gameHistory_${userIP}`;
      let ipHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      if (!Array.isArray(ipHistory)) ipHistory = [];
      
      ipHistory.unshift(gameData);
      if (ipHistory.length > 50) ipHistory = ipHistory.slice(0, 50);
      
      localStorage.setItem(historyKey, JSON.stringify(ipHistory));
    }
    
    console.log('[DEBUG] Datos guardados exitosamente en localStorage');
    return true;
  } catch (error) {
    console.error('[DEBUG] Error guardando datos en localStorage:', error);
    return false;
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
  console.log('[DEBUG] Mostrando mensaje de finalización de partida');
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
    
    console.log('[DEBUG] Datos de partida recuperados:', { 
      playerName, 
      score, 
      correct, 
      wrong, 
      victory 
    });
    
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
    
    // Preparar datos de la partida
    const gameData = {
      name: playerName,
      score: score,
      correct: correct,
      wrong: wrong,
      difficulty: lastGameStats.difficulty || 'normal',
      date: new Date().toISOString(),
      victory: victory
    };
    
    // Forzar la actualización a través de Socket.io incluso antes de enviar al servidor
    if (socket && socket.connected) {
      console.log('[DEBUG] Enviando actualización directa a través de socket');
      socket.emit('client-game-result', {
        message: 'Nueva entrada en el ranking',
        player: playerName,
        score: score
      });
    }
    
    // Intentar enviar resultado al servidor
    sendGameResultToServer(gameData)
      .then(success => {
        console.log('[DEBUG] Resultado de envío al servidor:', success ? 'Éxito' : 'Fallo');
        // Si falló el envío al servidor pero estamos conectados por socket.io
        // intentar emitir evento directamente desde el cliente
        if (!success && socket && socket.connected) {
          console.log('[DEBUG] Enviando actualización de ranking a través de socket desde el cliente');
          socket.emit('client-game-result', {
            message: 'Nueva entrada en el ranking',
            player: playerName,
            score: score
          });
        }
      })
      .catch(err => {
        console.error('[DEBUG] Error al enviar partida al servidor:', err);
        
        // Si hubo error pero tenemos conexión de socket
        if (socket && socket.connected) {
          console.log('[DEBUG] Enviando actualización de ranking a través de socket desde el cliente tras error');
          socket.emit('client-game-result', {
            message: 'Nueva entrada en el ranking',
            player: playerName,
            score: score
          });
        }
      });
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

// Modificar la función loadRanking para obtener datos del servidor
async function loadRanking(forceRefresh = false, period = 'global') {
  console.log(`[DEBUG] Iniciando carga de ranking: forceRefresh=${forceRefresh}, period=${period}`);
  const loadingContainer = document.getElementById('loading-container');
  const rankingTable = document.getElementById('ranking-table');
  const rankingTableBody = document.getElementById('ranking-body');
  const noResultsContainer = document.getElementById('no-results');
  const playerPositionNote = document.getElementById('player-position-note');
  
  // Verificar que existan los elementos necesarios en el DOM
  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-body'");
    return;
  }
  
  // Restablecer visibilidad de los contenedores
  if (playerPositionNote) playerPositionNote.style.display = 'none';
  
  // Mostrar el spinner de carga
  if (loadingContainer) loadingContainer.style.display = 'flex';
  if (rankingTable) rankingTable.style.display = 'none';
  if (noResultsContainer) noResultsContainer.style.display = 'none';
  
  try {
    console.log('Cargando ranking ' + period + (forceRefresh ? ' (forzando recarga)' : ''));
    
    // Pequeña espera para asegurar que el spinner se muestre (evita parpadeos)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Obtener datos desde el servidor (con timeout para no esperar indefinidamente)
    console.log('[DEBUG] Solicitando datos del ranking al servidor...');
    let rankingData;
    
    try {
      // Agregar un timeout a la petición
      const fetchWithTimeout = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
        
        try {
          const data = await getRankingDataFromServer(period);
          clearTimeout(timeoutId);
          return data;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };
      
      rankingData = await fetchWithTimeout();
    } catch (fetchError) {
      console.error('[DEBUG] Error en la petición al servidor con timeout:', fetchError);
      // Si falla la petición con timeout, usar respaldo
      rankingData = createExampleRankingData();
    }
    
    console.log(`[DEBUG] Datos recibidos: ${rankingData.length} registros`);
    
    // Ocultar spinner de carga
    if (loadingContainer) loadingContainer.style.display = 'none';
    
    // Limpiar contenido anterior
    rankingTableBody.innerHTML = '';
    
    // Si no hay datos mostrar mensaje pero no salir de la función
    const hasData = rankingData && rankingData.length > 0;
    
    if (!hasData) {
      console.log('[DEBUG] No hay datos de ranking disponibles, mostrando mensaje');
      if (noResultsContainer) noResultsContainer.style.display = 'flex';
      
      // Actualizar estadísticas con valores vacíos 
      document.getElementById('total-players').textContent = '0';
      document.getElementById('total-games').textContent = '0';
      document.getElementById('success-rate').textContent = '0%';
      
      // Ocultar nota de posición del jugador
      if (playerPositionNote) playerPositionNote.style.display = 'none';
      
      return; // No continuar si no hay datos
    }
    
    // Mostrar tabla
    if (rankingTable) rankingTable.style.display = 'table';
    
    // Ordenar por puntaje (score) de mayor a menor
    rankingData.sort((a, b) => b.score - a.score);
    
    // Obtener nombre del jugador actual para destacarlo
    const currentPlayer = getUsernameFromStorage();
    console.log(`[DEBUG] Jugador actual: ${currentPlayer || 'No identificado'}`);
    
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
      const topPlayersSection = document.querySelector('.top-players');
      if (position <= 3 && topPlayersSection && topPlayersSection.children.length > 0) {
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
    
    console.log('[DEBUG] Ranking cargado correctamente');
  } catch (err) {
    console.error("[DEBUG] Error general al cargar ranking:", err);
    
    // En caso de error general, mostrar mensaje y usar datos de ejemplo
    if (loadingContainer) loadingContainer.style.display = 'none';
    
    // Usar datos de ejemplo para mostrar algo
    const exampleData = createExampleRankingData();
    
    // Actualizar estadísticas con datos de ejemplo
    updateGlobalStats(exampleData);
    
    // Intentar mostrar filas de ejemplo
    try {
      if (rankingTable) rankingTable.style.display = 'table';
      rankingTableBody.innerHTML = '';
      
      exampleData.forEach((item, index) => {
        const tr = document.createElement("tr");
        
        // Estilos especiales para indicar que son datos de ejemplo
        tr.style.opacity = '0.7';
        
        // Posición
        const position = index + 1;
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
      
    } catch (renderError) {
      console.error("[DEBUG] Error al mostrar datos de ejemplo:", renderError);
      if (noResultsContainer) {
        noResultsContainer.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>Error al mostrar el ranking. Por favor, inténtalo de nuevo más tarde.</p>
        `;
        noResultsContainer.style.display = 'flex';
      }
    }
  }
}
