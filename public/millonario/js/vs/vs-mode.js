// Variables globales
const socket = io(); // Conexión Socket.io
let username = '';
let roomId = '';
let isHost = false;
let players = [];
let currentTurn = '';
let gameStarted = false;
let gameEnded = false;

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
}

// Configurar listeners de Socket.io
function setupSocketListeners() {
  // Eventos de sala
  socket.on('room_created', handleRoomCreated);
  socket.on('room_joined', handleRoomJoined);
  socket.on('players_updated', handlePlayersUpdated);
  socket.on('player_disconnected', handlePlayerDisconnected);
  socket.on('error', handleError);
  
  // Eventos de juego
  socket.on('game_started', handleGameStarted);
  socket.on('next_turn', handleNextTurn);
  socket.on('player_answered', handlePlayerAnswered);
  socket.on('game_restarted', handleGameRestarted);
}

// Funciones de manejo de eventos del socket
function handleRoomCreated(data) {
  roomId = data.roomId;
  isHost = true;
  
  // Mostrar información de la sala creada
  showNotification(`Sala creada: ${roomId}`, 'success');
  
  // Actualizar UI de la sala de espera
  document.getElementById('waiting-room-name').textContent = data.roomName || 'Sala sin nombre';
  document.getElementById('room-id').textContent = roomId;
  
  showWaitingRoom();
  
  // Mostrar mensaje de instrucciones
  const waitingMessage = document.getElementById('waiting-message');
  if (waitingMessage) {
    waitingMessage.innerHTML = `
      <p>Comparte este código con tu amigo para jugar.</p>
      <p>Esperando a que otro jugador se una...</p>
    `;
  }
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
  
  socket.emit('create_room', { 
    username,
    roomName,
    password
  });
  
  // Mostrar mensaje de espera
  showNotification('Creando sala...', 'info');
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
function showWaitingRoom() {
  roomSection.style.display = 'none';
  waitingRoom.style.display = 'block';
  gameSection.style.display = 'none';
  
  roomIdDisplay.textContent = roomId;
  updatePlayersDisplay();
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
  notification.textContent = message;
  notification.className = `toast ${type}`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
} 