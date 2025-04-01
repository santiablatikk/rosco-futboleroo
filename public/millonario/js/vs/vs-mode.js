// Variables globales
const socket = io(window.socketOptions || {}); // Conexión Socket.io con opciones
let username = '';
let roomId = '';
let isHost = false;
let players = [];
let currentTurn = '';
let gameStarted = false;
let gameEnded = false;

// Variables para el estado de conexión
let isConnected = false;
let connectionTimeout = null;
const connectionStatus = document.getElementById('connection-status');
const serverErrorBanner = document.getElementById('server-error-banner');
const serverErrorMessage = document.getElementById('server-error-message');
const dismissErrorBtn = document.getElementById('dismiss-error-btn');

// Variables para salas y modal de contraseña
let availableRooms = [];
let selectedRoomToJoin = null;
const roomsContainer = document.getElementById('rooms-container');
const refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
const passwordModal = document.getElementById('password-modal');
const modalPasswordInput = document.getElementById('modal-password-input');
const confirmJoinBtn = document.getElementById('confirm-join-btn');
const cancelJoinBtn = document.getElementById('cancel-join-btn');
const closeModalBtn = document.querySelector('.close-modal-btn');

// Flag para el modo fallback
let isFallbackMode = false;

// Variables de juego
let allQuestions = {};
let currentLevel = 1;
let currentQuestionIndex = 0;
let totalQuestions = 30; // 5 preguntas por nivel * 6 niveles
let player1Score = 0;
let player2Score = 0;
let timer = 60; // 1 minuto por pregunta
let timerInterval;
let optionsRequested = false;
let fiftyFiftyUsed = false;
let myTurn = false;

// Elementos DOM
const roomSection = document.getElementById('room-section');
const createRoomSection = document.getElementById('create-room-section');
const waitingRoom = document.getElementById('waiting-room');
const gameSection = document.getElementById('game-section');

const createRoomBtn = document.getElementById('create-room-btn');
const confirmCreateRoomBtn = document.getElementById('confirm-create-room-btn');
const roomNameInput = document.getElementById('room-name-input');
const roomPasswordInput = document.getElementById('room-password-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomCodeInput = document.getElementById('room-code');
const roomPasswordJoinInput = document.getElementById('room-password-join');
const backToMenuBtn = document.getElementById('back-to-menu-btn');

const roomIdDisplay = document.getElementById('room-id');
const playerCountDisplay = document.getElementById('player-count');
const playersContainer = document.getElementById('players-container');
const startGameBtn = document.getElementById('start-game-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const copyCodeBtn = document.getElementById('copy-code-btn');

const player1NameDisplay = document.getElementById('player1-name');
const player2NameDisplay = document.getElementById('player2-name');
const player1ScoreDisplay = document.getElementById('player1-score');
const player2ScoreDisplay = document.getElementById('player2-score');
const turnPlayerDisplay = document.getElementById('turn-player');
const levelDisplay = document.getElementById('level-display');
const questionCountDisplay = document.getElementById('question-count');
const timerDisplay = document.getElementById('timer-display');
const timerBar = document.getElementById('timer-bar');

const questionText = document.getElementById('question-text');
const answerInputContainer = document.getElementById('answer-input-container');
const answerInput = document.getElementById('answer-input');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const optionsContainer = document.getElementById('options-container');
const showOptionsBtn = document.getElementById('show-options-btn');
const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
const answerFeedback = document.getElementById('answer-feedback');
const feedbackMessage = document.getElementById('feedback-message');
const correctAnswerDisplay = document.getElementById('correct-answer').querySelector('span');

const resultModal = document.getElementById('result-modal');
const finalScores = document.getElementById('final-scores');
const winnerDisplay = document.getElementById('winner-display');
const rematchBtn = document.getElementById('rematch-btn');
const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

const notification = document.getElementById('notification');

// Event listeners
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Configurar particles.js
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', particlesConfig);
  }
  
  // Evento para cerrar el banner de error
  if (dismissErrorBtn) {
    dismissErrorBtn.addEventListener('click', () => {
      if (serverErrorBanner) {
        serverErrorBanner.style.display = 'none';
      }
    });
  }
  
  // Eventos para el modal de contraseña
  if (confirmJoinBtn) {
    confirmJoinBtn.addEventListener('click', confirmJoinRoom);
  }
  
  if (cancelJoinBtn) {
    cancelJoinBtn.addEventListener('click', closePasswordModal);
  }
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closePasswordModal);
  }
  
  if (refreshRoomsBtn) {
    refreshRoomsBtn.addEventListener('click', loadAvailableRooms);
  }
  
  // Check socket connection state
  socket.on('connect', () => {
    console.log('Connected to server');
    isConnected = true;
    updateConnectionStatus('connected');
    showNotification('Conectado al servidor', 'success');
    hideServerErrorBanner();
    
    // Load available rooms once connected
    loadAvailableRooms();
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    isConnected = false;
    updateConnectionStatus('disconnected');
    showNotification('Error de conexión al servidor', 'error');
    showServerErrorBanner('Problemas de conexión con el servidor. Se habilitó el modo alternativo.');
    
    // After multiple failed attempts, try to reconnect manually
    if (!connectionTimeout) {
      connectionTimeout = setTimeout(() => {
        socket.connect();
        connectionTimeout = null;
      }, 3000);
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    isConnected = false;
    updateConnectionStatus('disconnected');
    showNotification('Desconectado del servidor. Reconectando...', 'warning');
    
    // If the disconnection was not initiated by the server, reconnect
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after', attemptNumber, 'attempts');
    isConnected = true;
    updateConnectionStatus('connected');
    showNotification('Reconectado al servidor', 'success');
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Reconnection attempt:', attemptNumber);
    updateConnectionStatus('connecting');
    showNotification(`Intentando reconectar (${attemptNumber})...`, 'info');
  });
  
  // Comprobar si hay nombre guardado o asignar uno aleatorio
  const savedUsername = localStorage.getItem('millonarioUsername');
  if (savedUsername) {
    username = savedUsername;
  } else {
    // Generar nombre aleatorio si no hay uno guardado
    const randomName = "Jugador" + Math.floor(Math.random() * 10000);
    username = randomName;
    localStorage.setItem('millonarioUsername', username);
  }
  
  // Mostrar directamente la sección de sala
  roomSection.style.display = 'block';
  createRoomSection.style.display = 'none';
  waitingRoom.style.display = 'none';
  
  // Event listeners para los botones
  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', showCreateRoomForm);
  }
  
  if (confirmCreateRoomBtn) {
    confirmCreateRoomBtn.addEventListener('click', createRoom);
  }
  
  if (backToMenuBtn) {
    backToMenuBtn.addEventListener('click', showRoomSection);
  }
  
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', joinRoom);
  }
  
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', copyRoomCode);
  }
  
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', leaveRoom);
  }
  
  if (startGameBtn) {
    startGameBtn.addEventListener('click', startGame);
  }
  
  if (submitAnswerBtn) {
    submitAnswerBtn.addEventListener('click', submitAnswer);
  }
  
  if (showOptionsBtn) {
    showOptionsBtn.addEventListener('click', showOptions);
  }
  
  if (fiftyFiftyBtn) {
    fiftyFiftyBtn.addEventListener('click', useFiftyFifty);
  }
  
  if (rematchBtn) {
    rematchBtn.addEventListener('click', requestRematch);
  }
  
  if (backToLobbyBtn) {
    backToLobbyBtn.addEventListener('click', backToLobby);
  }
  
  // Tecla Enter para input
  if (roomCodeInput) {
    roomCodeInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') joinRoomBtn.click();
    });
  }
  
  if (answerInput) {
    answerInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') submitAnswerBtn.click();
    });
  }
  
  // Socket.io event listeners
  setupSocketListeners();
  
  // First load of available rooms
  loadAvailableRooms();
}

// Configurar listeners de Socket.io
function setupSocketListeners() {
  // Eventos de sala
  socket.on('room_created', handleRoomCreated);
  socket.on('room_joined', handleRoomJoined);
  socket.on('players_updated', handlePlayersUpdated);
  socket.on('player_disconnected', handlePlayerDisconnected);
  socket.on('error', handleError);
  socket.on('available_rooms', handleAvailableRooms);
  
  // Eventos de juego
  socket.on('game_started', handleGameStarted);
  socket.on('next_turn', handleNextTurn);
  socket.on('player_answered', handlePlayerAnswered);
  socket.on('game_restarted', handleGameRestarted);
}

// Funciones de manejo de eventos del socket
function handleRoomCreated(data) {
  // Clear the timeout
  if (window.createRoomTimeout) {
    clearTimeout(window.createRoomTimeout);
    window.createRoomTimeout = null;
  }
  
  // Clear fallback mode if it was set
  isFallbackMode = false;
  hideServerErrorBanner();
  
  roomId = data.roomId;
  isHost = true;
  
  // Inicializar players con el jugador actual
  players = [{
    id: socket.id,
    username: username,
    isHost: true,
    score: 0
  }];
  
  // Re-enable button in case user goes back
  confirmCreateRoomBtn.disabled = false;
  confirmCreateRoomBtn.innerHTML = '<i class="fas fa-plus-circle"></i> CREAR SALA';
  confirmCreateRoomBtn.classList.remove('loading');
  
  // Mostrar información de la sala creada
  showNotification(`Sala creada correctamente`, 'success');
  
  // Mostrar la sala de espera inmediatamente
  showWaitingRoom(data.roomName || `Sala de ${username}`);
  
  // Generar mensaje para compartir fácilmente
  navigator.clipboard.writeText(roomId)
    .then(() => {
      showNotification('Código copiado al portapapeles para compartir', 'info');
    })
    .catch(() => {
      // Si falla la copia automática, no mostrar error
      console.log('No se pudo copiar automáticamente el código');
    });
}

function handleRoomJoined(data) {
  roomId = data.roomId;
  players = data.players;
  isHost = false;
  showNotification(`Te has unido a la sala: ${roomId}`, 'success');
  showWaitingRoom();
}

function handlePlayersUpdated(data) {
  players = data.players;
  updatePlayersDisplay();
  
  // Habilitar/deshabilitar botón de inicio
  if (isHost && players.length === 2) {
    startGameBtn.disabled = false;
  } else {
    startGameBtn.disabled = true;
  }
}

function handlePlayerDisconnected(data) {
  const { username } = data;
  showNotification(`${username} ha abandonado la sala`, 'error');
  
  if (gameStarted) {
    // Si el juego estaba en curso, mostrar modal de fin de juego
    showEndGameModal("Jugador desconectado", `${username} abandonó la partida`);
  }
}

function handleError(data) {
  showNotification(data.message, 'error');
}

function handleGameStarted(data) {
  allQuestions = data.questions;
  currentTurn = data.firstTurn;
  myTurn = socket.id === currentTurn;
  gameStarted = true;
  currentQuestionIndex = 0;
  
  // Iniciar el juego
  showGameScreen();
  updateGameInfo();
  
  if (myTurn) {
    showQuestion();
    startTimer();
  } else {
    showWaitingForOpponent();
  }
}

function handleNextTurn(data) {
  currentTurn = data.currentTurn;
  myTurn = socket.id === currentTurn;
  
  // Si hay un índice de pregunta, actualizarlo
  if (data.questionIndex !== undefined) {
    currentQuestionIndex = data.questionIndex;
  }
  
  updateGameInfo();
  
  if (myTurn) {
    showQuestion();
    startTimer();
  } else {
    showWaitingForOpponent();
  }
}

function handlePlayerAnswered(data) {
  const { playerId, isCorrect, points, correctAnswer, players } = data;
  const answeringPlayer = players.find(p => p.id === playerId);
  
  // Actualizar puntuaciones
  this.players = players;
  updateScoreDisplay();
  
  // Mostrar notificación
  showNotification(
    `${answeringPlayer.username} ${isCorrect ? 'acertó' : 'falló'} ${isCorrect ? `(+${points} puntos)` : ''}`, 
    isCorrect ? 'success' : 'error'
  );
  
  // Si soy yo quien respondió, ocultar el temporizador
  if (playerId === socket.id) {
    clearInterval(timerInterval);
  }
  
  // Si llegamos al final del juego
  if (currentQuestionIndex >= totalQuestions - 1 && !myTurn) {
    setTimeout(() => {
      showEndGameModal();
    }, 1500);
  }
}

function handleGameRestarted(data) {
  allQuestions = data.questions;
  currentTurn = data.firstTurn;
  myTurn = socket.id === currentTurn;
  gameStarted = true;
  currentQuestionIndex = 0;
  
  // Actualizar las puntuaciones
  players = data.players;
  updateScoreDisplay();
  
  // Cerrar el modal de fin de juego
  resultModal.style.display = 'none';
  
  // Mostrar la pantalla de juego y actualizar la información
  showGameScreen();
  updateGameInfo();
  
  if (myTurn) {
    showQuestion();
    startTimer();
  } else {
    showWaitingForOpponent();
  }
}

// Funciones de gestión de salas
function showCreateRoomForm() {
  roomSection.style.display = 'none';
  createRoomSection.style.display = 'block';
  
  // Generar un nombre de sala predeterminado
  const defaultRoomName = `Sala de ${username}`;
  roomNameInput.value = defaultRoomName;
  roomPasswordInput.value = '';
  
  // Poner el foco en el campo de nombre de sala
  setTimeout(() => {
    roomNameInput.focus();
  }, 100);
}

function createRoom() {
  const roomName = roomNameInput.value.trim();
  const password = roomPasswordInput.value.trim();
  
  if (!roomName) {
    showNotification('Por favor, ingresa un nombre para la sala', 'error');
    return;
  }
  
  // Disable button and show loading state
  confirmCreateRoomBtn.disabled = true;
  confirmCreateRoomBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
  confirmCreateRoomBtn.classList.add('loading');
  
  // Check if socket is connected
  if (!isConnected) {
    showNotification('No hay conexión con el servidor. Usando modo alternativo...', 'warning');
    // Re-enable button (fallback function will handle room creation)
    confirmCreateRoomBtn.disabled = false;
    confirmCreateRoomBtn.innerHTML = '<i class="fas fa-plus-circle"></i> CREAR SALA';
    confirmCreateRoomBtn.classList.remove('loading');
    createFallbackRoom(roomName, password);
    return;
  }
  
  // Set a timeout in case the server doesn't respond
  const timeout = setTimeout(() => {
    showNotification('El servidor está tardando demasiado. Usando modo alternativo...', 'warning');
    confirmCreateRoomBtn.disabled = false;
    confirmCreateRoomBtn.innerHTML = '<i class="fas fa-plus-circle"></i> CREAR SALA';
    confirmCreateRoomBtn.classList.remove('loading');
    
    // Create a fallback room if server doesn't respond
    createFallbackRoom(roomName, password);
  }, 3000); // Reduced to 3 seconds for faster fallback
  
  // Store the timeout ID to clear it when we get a response
  window.createRoomTimeout = timeout;
  
  socket.emit('create_room', { 
    username,
    roomName,
    password
  });
  
  // Mostrar mensaje de espera
  showNotification('Creando sala...', 'info');
}

// Function to show the server error banner
function showServerErrorBanner(message) {
  if (serverErrorBanner && serverErrorMessage) {
    serverErrorMessage.textContent = message || 'Error de conexión con el servidor';
    serverErrorBanner.style.display = 'flex';
  }
}

// Function to hide the server error banner
function hideServerErrorBanner() {
  if (serverErrorBanner) {
    serverErrorBanner.style.display = 'none';
  }
}

// Fallback function to create a local room when server is unresponsive
function createFallbackRoom(roomName, password) {
  // Set fallback mode flag
  isFallbackMode = true;
  
  // Generate a random room ID
  roomId = 'LOCAL' + Math.random().toString(36).substring(2, 8).toUpperCase();
  isHost = true;
  
  // Initialize players with current player
  players = [{
    id: 'local-id-' + Date.now(),
    username: username,
    isHost: true,
    score: 0
  }];
  
  // Show server error banner
  showServerErrorBanner('El servidor no responde. Se activó el modo alternativo de juego.');
  
  // Show room created message
  showNotification('Sala creada en modo alternativo', 'success');
  
  // Show waiting room
  showWaitingRoom(roomName || `Sala de ${username}`);
  
  // Update room status to show it's in fallback mode
  const waitingRoomName = document.getElementById('waiting-room-name');
  if (waitingRoomName) {
    waitingRoomName.innerHTML = `${roomName || 'Sala de ' + username} <span class="fallback-mode-badge">Modo alternativo</span>`;
  }
  
  const waitingMessage = document.getElementById('waiting-message');
  if (waitingMessage) {
    waitingMessage.className = 'waiting-message warning';
    waitingMessage.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>Sala creada en modo alternativo debido a problemas con el servidor.</span>
    `;
  }
  
  // Try to reconnect to server
  tryReconnectToServer();
}

function tryReconnectToServer() {
  if (!socket.connected) {
    socket.connect();
    
    // Show reconnecting message
    updateConnectionStatus('connecting');
    
    // Check connection after a delay
    setTimeout(() => {
      if (socket.connected) {
        showNotification('Conexión restablecida con el servidor', 'success');
        updateConnectionStatus('connected');
        hideServerErrorBanner();
        
        // Try to register the room with the server if we're in a local room
        if (isFallbackMode && roomId && roomId.startsWith('LOCAL')) {
          socket.emit('register_fallback_room', {
            username,
            roomName: document.getElementById('waiting-room-name').textContent,
            roomId: roomId.replace('LOCAL', ''),
            players: players
          });
        }
      } else {
        showNotification('No se pudo conectar con el servidor', 'error');
        updateConnectionStatus('disconnected');
      }
    }, 3000);
  }
}

function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();
  const password = roomPasswordJoinInput.value.trim();
  
  if (code.length !== 6) {
    showNotification('El código de sala debe tener 6 caracteres', 'error');
    return;
  }
  
  socket.emit('join_room', { 
    username, 
    roomId: code,
    password
  });
  
  // Mostrar mensaje de espera
  showNotification('Intentando unirse a la sala...', 'info');
}

function copyRoomCode() {
  navigator.clipboard.writeText(roomId)
    .then(() => {
      showNotification('Código copiado al portapapeles', 'success');
    })
    .catch(() => {
      showNotification('No se pudo copiar el código', 'error');
    });
}

function leaveRoom() {
  socket.emit('leave_room', { roomId });
  resetGameState();
  showRoomSection();
}

function startGame() {
  if (players.length !== 2) {
    showNotification('Se necesitan 2 jugadores para iniciar', 'error');
    return;
  }
  
  socket.emit('start_game', { roomId });
}

// Funciones de interfaz de usuario
function showWaitingRoom(roomName) {
  // Ocultar otras secciones
  roomSection.style.display = 'none';
  createRoomSection.style.display = 'none';
  gameSection.style.display = 'none';
  
  // Configurar y mostrar sala de espera
  waitingRoom.style.display = 'block';
  
  // Establecer nombre de la sala y código
  const waitingRoomName = document.getElementById('waiting-room-name');
  if (waitingRoomName) {
    waitingRoomName.textContent = roomName || 'Sala de espera';
  }
  
  if (roomIdDisplay) {
    roomIdDisplay.textContent = roomId;
  }
  
  // Actualizar estado de los jugadores
  updatePlayersDisplay();
  
  // Configurar texto de espera según corresponda
  const waitingMessage = document.getElementById('waiting-message');
  if (waitingMessage) {
    if (players.length < 2) {
      waitingMessage.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>Podrás iniciar el juego cuando se una otro jugador.</span>
      `;
    } else {
      waitingMessage.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>¡Ya pueden comenzar el juego! Presiona "INICIAR DUELO".</span>
      `;
    }
  }
  
  // Configurar botón de inicio
  if (startGameBtn) {
    // Solo el anfitrión puede iniciar el juego y solo cuando hay 2 jugadores
    startGameBtn.disabled = !(isHost && players.length === 2);
  }
  
  // Agregar una animación de entrada
  waitingRoom.classList.add('animate-in');
  setTimeout(() => {
    waitingRoom.classList.remove('animate-in');
  }, 500);
}

function showRoomSection() {
  roomSection.style.display = 'block';
  createRoomSection.style.display = 'none';
  waitingRoom.style.display = 'none';
  gameSection.style.display = 'none';
}

function showGameScreen() {
  roomSection.style.display = 'none';
  waitingRoom.style.display = 'none';
  gameSection.style.display = 'block';
}

function updatePlayersDisplay() {
  playerCountDisplay.textContent = players.length;
  
  // Limpiar lista de jugadores
  playersContainer.innerHTML = '';
  
  // Añadir cada jugador a la lista
  players.forEach(player => {
    const li = document.createElement('li');
    
    // Nombre del jugador
    const nameSpan = document.createElement('span');
    nameSpan.textContent = player.username;
    nameSpan.className = 'player-name';
    
    // Indicador de host
    if (player.id === socket.id) {
      nameSpan.innerHTML += ' <span class="badge">(Tú)</span>';
    }
    
    li.appendChild(nameSpan);
    
    // Listo o esperando
    const statusSpan = document.createElement('span');
    statusSpan.className = 'player-status';
    statusSpan.textContent = player.id === socket.id ? 'Listo' : 'Esperando...';
    li.appendChild(statusSpan);
    
    playersContainer.appendChild(li);
  });
}

function updateGameInfo() {
  // Niveles basados en la cantidad de preguntas respondidas
  currentLevel = Math.floor(currentQuestionIndex / 5) + 1;
  
  // Actualizar nivel y contador de preguntas
  levelDisplay.textContent = `Nivel ${currentLevel}`;
  questionCountDisplay.textContent = `Pregunta ${(currentQuestionIndex % 5) + 1}/5`;
  
  // Actualizar indicador de turno
  if (myTurn) {
    turnPlayerDisplay.textContent = 'TU TURNO';
    turnPlayerDisplay.className = 'current-turn my-turn';
  } else {
    const opponent = players.find(p => p.id !== socket.id);
    turnPlayerDisplay.textContent = `Turno de ${opponent ? opponent.username : 'oponente'}`;
    turnPlayerDisplay.className = 'current-turn opponent-turn';
  }
  
  // Actualizar nombres de jugadores
  if (players.length >= 2) {
    player1NameDisplay.textContent = players[0].username;
    player2NameDisplay.textContent = players[1].username;
    
    // Si soy el jugador 2, invertir el orden visual
    if (socket.id === players[1].id) {
      player1NameDisplay.textContent = players[1].username;
      player2NameDisplay.textContent = players[0].username;
    }
  }
  
  // Actualizar puntuaciones
  updateScoreDisplay();
}

function updateScoreDisplay() {
  if (players.length >= 2) {
    const p1Score = players[0].score;
    const p2Score = players[1].score;
    
    // Si soy el jugador 2, invertir el orden visual
    if (socket.id === players[1].id) {
      player1ScoreDisplay.textContent = `${p2Score} pts`;
      player2ScoreDisplay.textContent = `${p1Score} pts`;
    } else {
      player1ScoreDisplay.textContent = `${p1Score} pts`;
      player2ScoreDisplay.textContent = `${p2Score} pts`;
    }
  }
}

// Funciones del juego
function showQuestion() {
  // Resetear estado de las opciones
  optionsRequested = false;
  fiftyFiftyUsed = false;
  
  // Habilitar controles
  answerInput.disabled = false;
  submitAnswerBtn.disabled = false;
  showOptionsBtn.disabled = false;
  
  // Mostrar la entrada de texto y ocultar las opciones
  answerInputContainer.style.display = 'flex';
  optionsContainer.style.display = 'none';
  showOptionsBtn.style.display = 'block';
  fiftyFiftyBtn.style.display = 'none';
  
  // Limpiar la entrada de texto y poner el foco
  answerInput.value = '';
  setTimeout(() => {
    answerInput.focus();
  }, 100);
  
  // Obtener y mostrar la pregunta
  const questionObj = getCurrentQuestion();
  questionText.textContent = questionObj.pregunta;
  
  // Ocultar feedback
  answerFeedback.style.display = 'none';
}

function showWaitingForOpponent() {
  // Deshabilitar controles
  answerInput.disabled = true;
  submitAnswerBtn.disabled = true;
  showOptionsBtn.disabled = true;
  fiftyFiftyBtn.disabled = true;
  
  // Mostrar mensaje de espera
  questionText.textContent = 'Esperando a que tu oponente responda...';
  
  // Ocultar la entrada de texto y las opciones
  answerInputContainer.style.display = 'none';
  optionsContainer.style.display = 'none';
  showOptionsBtn.style.display = 'none';
  fiftyFiftyBtn.style.display = 'none';
}

function getCurrentQuestion() {
  // Determinar el nivel actual basado en el índice de pregunta
  const level = Math.floor(currentQuestionIndex / 5) + 1;
  const indexInLevel = currentQuestionIndex % 5;
  
  // Obtener la pregunta del nivel correspondiente
  return allQuestions[`level_${level}`][indexInLevel];
}

function submitAnswer() {
  // Verificar que es nuestro turno
  if (!myTurn) return;
  
  const userAnswer = answerInput.value.trim();
  
  // Validar respuesta
  if (userAnswer === '' && !optionsRequested) {
    showNotification('Por favor, escribe una respuesta o selecciona opciones', 'error');
    return;
  }
  
  // Detener el temporizador
  clearInterval(timerInterval);
  
  // Obtener la pregunta actual
  const questionObj = getCurrentQuestion();
  
  // Verificar si la respuesta es correcta
  let isCorrect = false;
  let method = 'direct'; // Método de respuesta: direct, options, fifty
  
  if (optionsRequested) {
    // Si usó opciones, la respuesta debe ser exacta
    isCorrect = userAnswer.toUpperCase() === questionObj.respuesta_correcta;
    method = fiftyFiftyUsed ? 'fifty' : 'options';
  } else {
    // Comparación más flexible para respuestas escritas
    isCorrect = isWrittenAnswerCorrect(userAnswer, questionObj);
    method = 'direct';
  }
  
  // Calcular puntos según nivel y método
  let points = 0;
  if (isCorrect) {
    if (currentLevel === 1) {
      points = 1; // Nivel 1 siempre vale 1 punto
    } else {
      // Niveles 2-6
      if (method === 'direct') {
        points = 2; // Respuesta directa
      } else if (method === 'options') {
        points = 1; // Usando opciones
      } else if (method === 'fifty') {
        points = 0.5; // Usando 50/50
      }
    }
  }
  
  // Mostrar feedback
  showAnswerFeedback(isCorrect, questionObj.opciones[questionObj.respuesta_correcta], questionObj.opciones[questionObj.respuesta_correcta]);
  
  // Enviar resultado al servidor
  socket.emit('answer_submitted', {
    roomId,
    isCorrect,
    points,
    correctAnswer: questionObj.opciones[questionObj.respuesta_correcta]
  });
  
  // Incrementar contador de preguntas
  const nextQuestionIndex = currentQuestionIndex + 1;
  
  // Si llegamos al final del juego
  if (nextQuestionIndex >= totalQuestions) {
    setTimeout(() => {
      showEndGameModal();
    }, 1500);
    return;
  }
  
  // Pasar al siguiente turno después de un retraso
  setTimeout(() => {
    socket.emit('end_turn', { 
      roomId,
      questionIndex: nextQuestionIndex
    });
  }, 1500);
}

function isWrittenAnswerCorrect(userAnswer, questionObj) {
  if (!userAnswer) return false;
  
  // Obtener la respuesta correcta
  const correctText = questionObj.opciones[questionObj.respuesta_correcta];
  
  // Normalizar ambas respuestas para comparación
  const normalizedUserAnswer = normalizeText(userAnswer);
  const normalizedCorrectAnswer = normalizeText(correctText);
  
  // Considerar correcto si:
  // 1. Es exactamente igual
  // 2. La respuesta correcta contiene la respuesta del usuario (si es suficientemente larga)
  // 3. La respuesta del usuario contiene la respuesta correcta
  return normalizedUserAnswer === normalizedCorrectAnswer || 
         (normalizedCorrectAnswer.includes(normalizedUserAnswer) && normalizedUserAnswer.length > 3) ||
         (normalizedUserAnswer.includes(normalizedCorrectAnswer) && normalizedCorrectAnswer.length > 3);
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, "") // Solo letras, números y espacios
    .replace(/\s+/g, " "); // Normalizar espacios
}

function showOptions() {
  // Marcar que se solicitaron opciones
  optionsRequested = true;
  
  // Ocultar la entrada de texto
  answerInputContainer.style.display = 'none';
  
  // Mostrar contenedor de opciones
  optionsContainer.style.display = 'grid';
  optionsContainer.innerHTML = '';
  
  // Obtener la pregunta actual
  const questionObj = getCurrentQuestion();
  
  // Crear un botón para cada opción
  Object.entries(questionObj.opciones).forEach(([key, value]) => {
    const optionBtn = document.createElement('button');
    optionBtn.className = 'option-btn';
    optionBtn.textContent = `${key}: ${value}`;
    optionBtn.setAttribute('data-key', key);
    
    optionBtn.addEventListener('click', function() {
      // Al hacer clic en una opción, enviarla como respuesta
      answerInput.value = this.getAttribute('data-key');
      submitAnswer();
    });
    
    optionsContainer.appendChild(optionBtn);
  });
  
  // Mostrar botón 50/50
  fiftyFiftyBtn.style.display = 'block';
  fiftyFiftyBtn.disabled = false;
  
  // Ocultar botón de mostrar opciones
  showOptionsBtn.style.display = 'none';
  
  // Mostrar notificación
  showNotification('Usando opciones las preguntas valen menos puntos', 'info');
}

function useFiftyFifty() {
  fiftyFiftyUsed = true;
  fiftyFiftyBtn.disabled = true;
  
  // Obtener la pregunta actual
  const questionObj = getCurrentQuestion();
  const correctKey = questionObj.respuesta_correcta;
  
  // Obtener todas las opciones incorrectas
  const incorrectOptions = Array.from(optionsContainer.querySelectorAll('.option-btn'))
    .filter(btn => btn.getAttribute('data-key') !== correctKey);
  
  // Dejar solo 2 opciones (la correcta y una incorrecta)
  if (incorrectOptions.length > 1) {
    // Desordenar y tomar opciones incorrectas a eliminar
    incorrectOptions.sort(() => Math.random() - 0.5);
    
    // Eliminar todas menos una incorrecta
    incorrectOptions.slice(1).forEach(btn => {
      btn.style.display = 'none';
    });
  }
  
  showNotification('Usando 50/50 las preguntas valen menos puntos', 'info');
}

function showAnswerFeedback(isCorrect, correctKey, correctText) {
  feedbackMessage.textContent = isCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta';
  feedbackMessage.className = `feedback-message ${isCorrect ? 'correct' : 'incorrect'}`;
  
  correctAnswerDisplay.textContent = correctText;
  
  answerFeedback.style.display = 'block';
  
  // Resaltar la opción correcta si se mostraron opciones
  if (optionsRequested) {
    const optionBtns = optionsContainer.querySelectorAll('.option-btn');
    
    optionBtns.forEach(btn => {
      const key = btn.getAttribute('data-key');
      
      if (key === correctKey) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected')) {
        btn.classList.add('incorrect');
      }
      
      // Deshabilitar botones
      btn.disabled = true;
    });
  }
}

function startTimer() {
  // Inicializar el temporizador
  timer = 60; // 1 minuto
  updateTimerDisplay();
  
  // Limpiar cualquier intervalo anterior
  clearInterval(timerInterval);
  
  // Iniciar el nuevo intervalo
  timerInterval = setInterval(() => {
    timer--;
    updateTimerDisplay();
    
    if (timer <= 0) {
      clearInterval(timerInterval);
      // Tiempo agotado - Enviar respuesta vacía
      showNotification('¡Tiempo agotado!', 'error');
      
      // Si no se había respondido aún, enviar respuesta vacía
      if (myTurn) {
        submitAnswer();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  // Actualizar texto del temporizador
  timerDisplay.textContent = `${timer}s`;
  
  // Actualizar barra de progreso
  const percentage = (timer / 60) * 100;
  timerBar.style.width = `${percentage}%`;
  
  // Cambiar color según el tiempo restante
  if (timer <= 10) {
    timerBar.style.backgroundColor = '#ef4444'; // rojo
  } else if (timer <= 30) {
    timerBar.style.backgroundColor = '#f59e0b'; // amarillo
  } else {
    timerBar.style.backgroundColor = '#10b981'; // verde
  }
}

function showEndGameModal() {
  // Determinar ganador
  let winner = null;
  let winnerName = '';
  let isDraw = false;
  
  if (players[0].score > players[1].score) {
    winner = players[0];
    winnerName = winner.username;
  } else if (players[1].score > players[0].score) {
    winner = players[1];
    winnerName = winner.username;
  } else {
    isDraw = true;
  }
  
  // Mostrar puntajes finales
  finalScores.innerHTML = '';
  
  players.forEach(player => {
    const scoreItem = document.createElement('div');
    scoreItem.className = 'player-score';
    
    if (winner && player.id === winner.id) {
      scoreItem.classList.add('winner');
    }
    
    scoreItem.innerHTML = `
      <span class="player-name">${player.username} ${player.id === socket.id ? '(Tú)' : ''}</span>
      <span class="player-points">${player.score} puntos</span>
    `;
    
    finalScores.appendChild(scoreItem);
  });
  
  // Mostrar mensaje según resultado
  winnerDisplay.innerHTML = isDraw 
    ? '¡Empate!' 
    : `¡${winnerName} ${winner.id === socket.id ? 'has' : 'ha'} ganado!`;
  
  // Mostrar modal
  resultModal.style.display = 'block';
}

function requestRematch() {
  socket.emit('request_rematch', { roomId });
}

function backToLobby() {
  // Ocultar modal y juego, mostrar sala
  resultModal.style.display = 'none';
  gameSection.style.display = 'none';
  roomSection.style.display = 'block';
  
  // Resetear estado
  resetGameState();
}

function resetGameState() {
  gameStarted = false;
  currentQuestionIndex = 0;
  timer = 60;
  optionsRequested = false;
  fiftyFiftyUsed = false;
  clearInterval(timerInterval);
  
  // Limpiar sala
  roomId = '';
  players = [];
}

function showNotification(message, type) {
  // Clear any existing notification timeout
  if (window.notificationTimeout) {
    clearTimeout(window.notificationTimeout);
    notification.classList.remove('hide');
  }
  
  // Set content and class
  notification.textContent = message;
  notification.className = `toast ${type || 'info'}`;
  notification.style.display = 'block';
  
  // Show with animation
  requestAnimationFrame(() => {
    // Force reflow
    notification.offsetHeight;
    // Remove any hide class
    notification.classList.remove('hide');
  });
  
  // Hide after delay
  window.notificationTimeout = setTimeout(() => {
    notification.classList.add('hide');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300); // Match the duration of toast-out animation
  }, 3000);
}

// Function to update connection status UI
function updateConnectionStatus(status) {
  if (!connectionStatus) return;
  
  connectionStatus.className = 'connection-status ' + status;
  
  switch (status) {
    case 'connected':
      connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Conectado</span>';
      break;
    case 'connecting':
      connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Conectando<span class="animated-dots"></span></span>';
      break;
    case 'disconnected':
      connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Desconectado</span>';
      break;
  }
}

// Function to load available rooms
function loadAvailableRooms() {
  if (!isConnected) {
    showRoomsLoadingState();
    showNotification('No se pueden cargar las salas. No hay conexión con el servidor.', 'error');
    setTimeout(() => {
      showNoRoomsMessage();
    }, 1000);
    return;
  }
  
  showRoomsLoadingState();
  socket.emit('get_available_rooms');
}

// Handle received available rooms from server
function handleAvailableRooms(data) {
  availableRooms = data.rooms || [];
  renderAvailableRooms();
}

// Show rooms loading spinner
function showRoomsLoadingState() {
  if (roomsContainer) {
    roomsContainer.innerHTML = `
      <div class="loading-rooms">
        <div class="loading-spinner"></div>
        <p>Cargando salas disponibles...</p>
      </div>
    `;
  }
}

// Show message when no rooms are available
function showNoRoomsMessage() {
  if (roomsContainer) {
    roomsContainer.innerHTML = `
      <div class="no-rooms-message">
        <p>No hay salas disponibles en este momento.</p>
        <p>¡Crea una nueva sala o intenta más tarde!</p>
      </div>
    `;
  }
}

// Render the list of available rooms
function renderAvailableRooms() {
  if (!roomsContainer) return;
  
  if (!availableRooms || availableRooms.length === 0) {
    showNoRoomsMessage();
    return;
  }
  
  let roomsHtml = '';
  
  availableRooms.forEach(room => {
    const isPasswordProtected = room.hasPassword;
    const playerCount = room.playerCount || 0;
    const maxPlayers = 2; // 2 players max for this game
    
    roomsHtml += `
      <div class="room-item">
        <div class="room-details">
          <div class="room-name">${room.name}</div>
          <div class="room-info">
            <div class="players">
              <i class="fas fa-users"></i>
              <span>${playerCount}/${maxPlayers}</span>
            </div>
            ${isPasswordProtected ? `
              <div class="locked">
                <i class="fas fa-lock"></i>
                <span>Protegida</span>
              </div>
            ` : ''}
          </div>
        </div>
        <button class="join-room-btn" data-room-id="${room.id}" data-has-password="${isPasswordProtected}">
          <i class="fas fa-sign-in-alt"></i> Unirse
        </button>
      </div>
    `;
  });
  
  roomsContainer.innerHTML = roomsHtml;
  
  // Add event listeners to join buttons
  const joinButtons = roomsContainer.querySelectorAll('.join-room-btn');
  joinButtons.forEach(button => {
    button.addEventListener('click', handleJoinButtonClick);
  });
}

// Handle join button click
function handleJoinButtonClick(e) {
  const button = e.currentTarget;
  const roomId = button.getAttribute('data-room-id');
  const hasPassword = button.getAttribute('data-has-password') === 'true';
  
  selectedRoomToJoin = roomId;
  
  if (hasPassword) {
    // Show password modal
    showPasswordModal(roomId);
  } else {
    // Join directly if no password
    joinRoomByCode(roomId, '');
  }
}

// Function to show password modal
function showPasswordModal() {
  modalPasswordInput.value = '';
  passwordModal.style.display = 'flex';
  setTimeout(() => {
    modalPasswordInput.focus();
  }, 100);
}

// Function to close password modal
function closePasswordModal() {
  passwordModal.style.display = 'none';
  selectedRoomToJoin = null;
}

// Function to confirm joining room with password
function confirmJoinRoom() {
  const password = modalPasswordInput.value.trim();
  
  if (!selectedRoomToJoin) {
    showNotification('Error al unirse a la sala.', 'error');
    closePasswordModal();
    return;
  }
  
  joinRoomByCode(selectedRoomToJoin, password);
  closePasswordModal();
}

// Join room by code
function joinRoomByCode(roomCode, password) {
  socket.emit('join_room', { 
    username, 
    roomId: roomCode,
    password
  });
  
  // Mostrar mensaje de espera
  showNotification('Intentando unirse a la sala...', 'info');
} 