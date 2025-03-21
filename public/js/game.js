// Variables globales
let username = '';
let selectedDifficulty = 'facil';
let timeLimit = 180; // 3 minutos
let questions = [];
let currentLetterIndex = 0;
let errors = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let skippedAnswers = 0;
let gameEnded = false;
let timer;
let remainingTime = 0;
let currentLang = 'es';
let mistakes = [];
let helpUsed = 0;
let incompleteAttempts = 0;
let queue = [];
let lettersWithHint = []; // Array para rastrear las letras que ya tienen pista
let soundEnabled = true;
let timerInterval = null;
let playerAchievements = []; // Array para guardar los logros del jugador

// Inicialización de sonidos
const sounds = {
  correct: new Audio('sounds/correct.mp3'),
  incorrect: new Audio('sounds/incorrect.mp3'),
  complete: new Audio('sounds/correct.mp3'), // Usamos el mismo sonido para completar el juego
  timeout: new Audio('sounds/incorrect.mp3') // Usamos el mismo sonido para timeout
};

// Definir los posibles logros del juego
const achievements = {
  perfectGame: {
    id: 'perfect',
    title: '¡PARTIDA PERFECTA!',
    description: 'Completaste el rosco sin cometer ningún error',
    icon: 'trophy',
    color: 'gold'
  },
  speedster: {
    id: 'speedster',
    title: 'VELOCISTA',
    description: 'Completaste el rosco en menos de 2 minutos',
    icon: 'bolt',
    color: '#5d9cec'
  },
  noHelp: {
    id: 'nohelp',
    title: 'SIN AYUDA',
    description: 'Completaste el rosco sin usar ninguna pista',
    icon: 'brain',
    color: '#bc5cde'
  },
  noSkips: {
    id: 'noskips',
    title: 'DIRECTO AL GRANO',
    description: 'Completaste el rosco sin saltar ninguna pregunta',
    icon: 'check-double',
    color: '#5cd6ad'
  },
  hardDifficulty: {
    id: 'hardmode',
    title: 'NIVEL EXPERTO',
    description: 'Ganaste el juego en dificultad difícil',
    icon: 'fire',
    color: '#ff7043'
  }
};

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
  console.log('Página de juego iniciada');
  
  // Recuperar datos de sessionStorage
  loadGameData();
  
  // Inicializar el juego
  initializeGame();
  
  // Configurar manejadores de eventos
  setupGameEventHandlers();
  
  preloadSounds();
  setupSoundToggle();
});

// Cargar datos guardados
function loadGameData() {
  // Recuperar nombre de usuario
  username = sessionStorage.getItem('username');
  if (!username) {
    // Si no hay nombre de usuario, redirigir a la página de inicio
    window.location.href = 'index.html';
    return;
  }
  
  // Mostrar nombre de usuario
  const playerNameDisplay = document.getElementById('player-name-display');
  if (playerNameDisplay) {
    playerNameDisplay.textContent = username;
  }
  
  // Recuperar dificultad seleccionada
  selectedDifficulty = sessionStorage.getItem('selectedDifficulty') || 'facil';
  
  // Configurar límite de tiempo según dificultad
  switch (selectedDifficulty) {
    case 'facil':
      timeLimit = 300;
      break;
    case 'medio':
      timeLimit = 240;
      break;
    case 'dificil':
      timeLimit = 200;
      break;
    default:
      timeLimit = 300;
  }
  
  remainingTime = timeLimit;
  
  // Recuperar idioma
  currentLang = localStorage.getItem('lang') || 'es';
  
  console.log(`Juego iniciado: Usuario: ${username}, Dificultad: ${selectedDifficulty}, Tiempo: ${timeLimit}s`);
}

// Inicializar juego
function initializeGame() {
  // Cargar preguntas - el resto de la inicialización se manejará después de cargar las preguntas
  loadQuestions();
  
  // Iniciar temporizador
  startTimer(timeLimit);
  
  // Mostrar mensaje de inicio
  showGameMessage('¡Empieza el juego! Responde las preguntas para cada letra.');
  
  // Inicializar los contadores de error
  updateErrorIndicators();
  
  // Configurar el evento de redimensionamiento para ajustar el rosco
  window.addEventListener('resize', adjustRoscoSize);
  
  // Configurar eventos para los botones
  document.getElementById('check-btn').addEventListener('click', checkAnswer);
  document.getElementById('pasala-btn').addEventListener('click', passQuestion);
  document.getElementById('help-btn').addEventListener('click', showHint);
  document.getElementById('answer-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkAnswer();
    }
  });
}

// Cargar preguntas de questions.json
function loadQuestions() {
  console.log('Cargando preguntas del archivo questions.json...');
  
  // Intentar cargar desde el endpoint en el servidor primero
  fetch('/questions')
    .then(response => {
      if (!response.ok) {
        throw new Error('No se pudo cargar las preguntas desde el servidor');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.rosco_futbolero && data.rosco_futbolero.length > 0) {
        console.log('Preguntas cargadas desde el servidor');
        
        // Usar las preguntas devueltas por el servidor
        questions = data.rosco_futbolero.map(item => ({
          letra: item.letra,
          pregunta: item.pregunta,
          respuesta: item.respuesta,
          status: 'pending'
        }));
        
        // Ordenar alfabéticamente
        questions.sort((a, b) => a.letra.localeCompare(b.letra));
        
        console.log(`${questions.length} preguntas cargadas correctamente`);
        
        // Establecer la dificultad según lo seleccionado
        setDifficulty(selectedDifficulty);
        
        // Establecer cola de preguntas para jugar (todas las preguntas al inicio)
        queue = questions.map((q, i) => i);
        
        // Dibujar el rosco con las preguntas cargadas
        drawRosco();
        
        // Mostrar la primera pregunta
        showQuestion();
      } else {
        throw new Error('Formato de respuesta del servidor inválido');
      }
    })
    .catch(error => {
      console.error('Error cargando preguntas desde el servidor, intentando cargar localmente:', error);
      
      // Si falla el servidor, intentar cargar localmente
      fetch('/data/questions.json')
        .then(response => {
          if (!response.ok) {
            throw new Error('No se pudo cargar el archivo questions.json');
          }
          return response.json();
        })
        .then(data => {
          if (!Array.isArray(data)) {
            throw new Error('Formato de questions.json inválido');
          }
          
          console.log('Datos del JSON local cargados correctamente');
          
          // Procesar las preguntas en el formato que tenemos en el JSON
          questions = [];
          data.forEach(item => {
            const letter = item.letra.toUpperCase();
            if (item.preguntas && item.preguntas.length > 0) {
              // Seleccionar una pregunta aleatoria para esta letra
              const randomIndex = Math.floor(Math.random() * item.preguntas.length);
              const selectedQuestion = item.preguntas[randomIndex];
              
              // Adaptar al formato usado en el juego
              questions.push({
                letra: letter,
                pregunta: selectedQuestion.pregunta,
                respuesta: selectedQuestion.respuesta,
                status: 'pending'
              });
            }
          });
          
          // Ordenar alfabéticamente
          questions.sort((a, b) => a.letra.localeCompare(b.letra));
          
          console.log(`${questions.length} preguntas cargadas correctamente`);
          
          // Establecer la dificultad según lo seleccionado
          setDifficulty(selectedDifficulty);
          
          // Establecer cola de preguntas para jugar (todas las preguntas al inicio)
          queue = questions.map((q, i) => i);
          
          // Dibujar el rosco con las preguntas cargadas
          drawRosco();
          
          // Mostrar la primera pregunta
          showQuestion();
        })
        .catch(error => {
          console.error('Error cargando questions.json localmente:', error);
          alert('Error al cargar las preguntas. Por favor, recarga la página o contacta con el administrador.');
        });
    });
}

// Establecer dificultad del juego
function setDifficulty(difficulty) {
  switch(difficulty) {
    case 'easy':
      timeLimit = 300; // 5 minutos
      break;
    case 'hard':
      timeLimit = 200; // 3:20 minutos
      break;
    default: // normal
      timeLimit = 240; // 4 minutos
  }
  remainingTime = timeLimit;
  updateTimerDisplay();
}

// Actualizar función de temporizador para usar el nuevo formato
function startTimer(duration) {
  clearInterval(timerInterval);
  
  let timeLeft = duration;
  const maxTime = duration;
  updateTimerDisplay(timeLeft, maxTime);
  
  timerInterval = setInterval(() => {
    timeLeft--;
    remainingTime = timeLeft;
    
    updateTimerDisplay(timeLeft, maxTime);
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      // Llamar a gameOver cuando el tiempo se acaba
      gameEnded = true;
      playSound('timeout');
      showGameMessage('¡Tiempo agotado!', 'error');
      gameOver(false);
    }
  }, 1000);
}

// Actualizar función para saltar pregunta con efecto de sonido
function skipOrTimeoutQuestion(timeout = false) {
  if (gameEnded) return;
  
  const currentQuestion = getCurrentQuestion();
  const currentLetter = document.querySelector('.rosco-letter.current');
  
  if (timeout) {
    playSound('timeout');
    showGameMessage('¡Tiempo agotado!', 'error');
  }
  
  if (currentQuestion) {
    // Marcar la pregunta como pendiente
    currentQuestion.status = 'pending';
    
    // Añadir a la cola
    queue.push(currentQuestion.letter);
    
    // Actualizar la visualización de la letra
    const letterDiv = document.getElementById(`letter-${currentQuestion.letter}`);
    if (letterDiv) {
      letterDiv.classList.remove('current');
      letterDiv.classList.add('pending');
    }
    
    // Mover a la siguiente pregunta
    moveToNextQuestion();
  }
}

// Actualizar visualización del temporizador
function updateTimerDisplay(timeLeft, maxTime) {
  const timerElement = document.getElementById('timer');
  if (!timerElement) return;
  
  timerElement.textContent = formatTime(timeLeft);
  
  const timerContainer = document.querySelector('.timer');
  
  // Eliminar todas las clases de color previas
  timerContainer.classList.remove(
    'color-90', 'color-80', 'color-70', 'color-60', 'color-50', 
    'color-40', 'color-30', 'color-20', 'color-10', 'warning', 'danger'
  );
  
  // Añadir la clase correspondiente según el porcentaje de tiempo restante
  const percentage = (timeLeft / maxTime) * 100;
  
  if (percentage <= 10) {
    timerContainer.classList.add('danger');
    
    // Sonido de tic tac más frecuente en los últimos 10% del tiempo
    if (timeLeft > 0 && timeLeft % 2 === 0) {
      playSound('tick');
    }
  } else if (percentage <= 30) {
    timerContainer.classList.add('warning');
    
    // Sonido de tic tac cuando queden 30% del tiempo
    if (Math.round(percentage) === 30) {
      playSound('tick');
    }
  } else if (percentage <= 100) {
    if (percentage > 90) timerContainer.classList.add('color-90');
    else if (percentage > 80) timerContainer.classList.add('color-80');
    else if (percentage > 70) timerContainer.classList.add('color-70');
    else if (percentage > 60) timerContainer.classList.add('color-60');
    else if (percentage > 50) timerContainer.classList.add('color-50');
    else if (percentage > 40) timerContainer.classList.add('color-40');
    else if (percentage > 30) timerContainer.classList.add('color-30');
    else if (percentage > 20) timerContainer.classList.add('color-20');
    else timerContainer.classList.add('color-10');
  }
}

// Dibujar el rosco
function drawRosco() {
  const roscoContainer = document.getElementById('rosco');
  if (!roscoContainer) return;
  
  // Limpiar el rosco
  roscoContainer.innerHTML = '';
  
  // Verificar si existe el contenedor de preguntas, si no, crearlo
  let questionContainer = document.getElementById('rosco-question');
  if (!questionContainer) {
    questionContainer = document.createElement('div');
    questionContainer.id = 'rosco-question';
    questionContainer.className = 'question-container';
    roscoContainer.appendChild(questionContainer);
  }
  
  const letters = questions.map(q => q.letra);
  const numLetters = letters.length;
  
  // Adaptar el tamaño del rosco al viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let minDimension = Math.min(viewportWidth, viewportHeight * 0.55);
  let roscoSize = Math.min(minDimension, 380);
  
  // Aplicar el tamaño calculado
  roscoContainer.style.width = `${roscoSize}px`;
  roscoContainer.style.height = `${roscoSize}px`;
  
  // Radio del rosco ajustado
  const radius = roscoSize * 0.4;
  
  // Posición central
  const centerX = roscoSize / 2;
  const centerY = roscoSize / 2;
  
  // Crear cada letra del rosco
  letters.forEach((letter, index) => {
    // Calcular la posición en el círculo
    const angle = (index / numLetters) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Crear el elemento de la letra
    const letterElement = document.createElement('div');
    letterElement.className = 'rosco-letter';
    letterElement.id = `letter-${letter}`;
    letterElement.textContent = letter;
    
    // Posicionar la letra
    letterElement.style.left = `${x}px`;
    letterElement.style.top = `${y}px`;
    letterElement.style.transform = 'translate(-50%, -50%)';
    
    // Añadir la letra al rosco
    roscoContainer.appendChild(letterElement);
  });
  
  // Configurar primeros estados
  updateLetterClasses();
}

// Ajustar el contenedor de la pregunta según el tamaño del rosco
function adjustQuestionContainer() {
  // Esta función ahora está vacía para evitar cualquier ajuste dinámico 
  // que pueda interferir con la posición fija del contenedor de preguntas
  return;
}

// Función para ajustar el tamaño del rosco según el tamaño de la ventana
function adjustRoscoSize() {
  drawRosco(); // Redibujar el rosco con el tamaño actualizado
}

// Actualizar información de la letra actual
function updateLetterInfo() {
  if (currentLetterIndex >= questions.length) return;
  
  const currentQuestion = questions[currentLetterIndex];
  
  // Actualizar la pregunta dentro del rosco con animación
  const questionContainer = document.getElementById('rosco-question');
  if (questionContainer) {
    // Primero hacer desvanecer
    questionContainer.style.opacity = '0';
    
    setTimeout(() => {
      // Actualizar contenido
      questionContainer.innerHTML = `
        <div class="question-letter">${currentQuestion.letra.toUpperCase()}</div>
        <p class="question-text">${currentQuestion.pregunta}</p>
      `;
      
      // Hacer aparecer de nuevo
      questionContainer.style.opacity = '1';
    }, 200);
  }
  
  // Mantener el mensaje oculto
  const gameMessage = document.getElementById('game-message');
  if (gameMessage) {
    gameMessage.classList.add('hidden');
  }
  
  // Establecer foco en campo de respuesta
  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.value = '';
    answerInput.focus();
  }
  
  // Actualizar clases de letras
  updateLetterClasses();
}

// Actualizar clases de letras según su estado
function updateLetterClasses() {
  // Recorrer todas las preguntas
  questions.forEach((question, index) => {
    const letterElement = document.getElementById(`letter-${question.letra}`);
    if (!letterElement) return;
    
    // Eliminar todas las clases de estado
    letterElement.classList.remove('current', 'correct', 'incorrect', 'skipped');
    
    // Aplicar la clase según el estado
    if (index === currentLetterIndex) {
      letterElement.classList.add('current');
    } else if (question.status === 'correct') {
      letterElement.classList.add('correct');
    } else if (question.status === 'incorrect') {
      letterElement.classList.add('incorrect');
    } else if (question.status === 'skipped') {
      letterElement.classList.add('skipped');
    }
  });
}

// Funciones para mostrar mensajes del juego (solo para errores/pistas importantes)
function showGameMessage(message, type = '') {
  const gameMessage = document.getElementById('game-message');
  if (!gameMessage) return;
  
  // Para mensajes genéricos o "Tu turno...", mantener oculto
  if (message === 'Tu turno...' || message === '¡Empieza el juego! Responde las preguntas para cada letra.') {
    gameMessage.classList.add('hidden');
    return;
  }
  
  // Resetear clases
  gameMessage.className = 'game-message';
  gameMessage.classList.remove('hidden');
  
  // Añadir clase según el tipo de mensaje
  if (type) {
    gameMessage.classList.add(type);
  }
  
  gameMessage.textContent = message;
  
  // Ocultar automáticamente después de 3 segundos
  setTimeout(() => {
    gameMessage.classList.add('hidden');
  }, 3000);
}

// Normalizar string para comparación eliminando acentos y mayúsculas
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Calcular la distancia de Levenshtein entre dos cadenas
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];
  
  // Inicializar matriz
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  // Rellenar matriz
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = str1.charAt(j - 1) === str2.charAt(i - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,         // eliminación
        matrix[i][j - 1] + 1,         // inserción
        matrix[i - 1][j - 1] + cost   // sustitución
      );
    }
  }
  
  return matrix[len2][len1];
}

// Mostrar pista
function showHint() {
  if (queue.length === 0) return;
  
  const currentIdx = queue[0];
  const currentQuestion = questions[currentIdx];
  const currentLetter = currentQuestion.letra;
  
  // Verificar si ya se mostró pista para esta letra
  if (!lettersWithHint.includes(currentLetter)) {
    // Solo contamos como nuevo uso si es una letra nueva
    if (helpUsed >= 2) {
      showGameMessage('Has agotado las 2 pistas disponibles para letras diferentes', 'error');
      return;
    }
    
    // Agregar esta letra al registro de letras con pista
    lettersWithHint.push(currentLetter);
    helpUsed++;
  }
  
  // Usar la función común para mostrar la pista
  showHintForLetter(currentLetter);
}

// Comprobar respuesta
function checkAnswer() {
  const answerInput = document.getElementById('answer-input');
  if (!answerInput || queue.length === 0) return;
  
  const userAnswer = answerInput.value.trim();
  
  // Si no hay respuesta, pasar a la siguiente pregunta
  if (!userAnswer) {
    passQuestion();
    return;
  }
  
  const currentIdx = queue[0];
  const currentQ = questions[currentIdx];
  const currentLetter = currentQ.letra;
  const userAns = normalizeString(userAnswer);
  const correctAns = normalizeString(currentQ.respuesta);
  const letterDiv = document.querySelectorAll(".rosco-letter")[currentIdx];
  
  // Quitar clase de pasapalabra si la tenía
  letterDiv.classList.remove("skipped");
  
  // Comprobar si la respuesta es incompleta
  if (userAns !== correctAns && correctAns.includes(userAns) && userAns.length < correctAns.length) {
    if (incompleteAttempts < 2) {
      incompleteAttempts++;
      showGameMessage(`¡Respuesta incompleta! Intenta nuevamente. Tienes ${2 - incompleteAttempts} intentos restantes.`, 'warning');
      answerInput.value = '';
      answerInput.focus();
      return;
    }
  }
  
  // Cálculo de distancia de Levenshtein permitida según dificultad
  const wordLen = correctAns.length;
  let maxDist = wordLen > 5 ? 2 : 1;
  
  if (selectedDifficulty === 'easy') {
    maxDist += 1;
  } else if (selectedDifficulty === 'hard') {
    maxDist = Math.max(maxDist - 1, 0);
  }
  
  const dist = levenshteinDistance(userAns, correctAns);
  
  if (dist <= maxDist) {
    // Respuesta correcta
    letterDiv.classList.add('correct');
    letterDiv.classList.add('bounce');
    showGameMessage('¡Respuesta correcta!', 'success');
    correctAnswers++;
    currentQ.status = 'correct';
    showAnswerFeedback(true, letterDiv);
  } else {
    // Respuesta incorrecta
    letterDiv.classList.add('incorrect');
    letterDiv.classList.add('shake');
    showGameMessage(`Respuesta incorrecta. La correcta era: ${currentQ.respuesta}`, 'error');
    errors++;
    currentQ.status = 'incorrect';
    
    // Comprobar si ha alcanzado el máximo de errores
    if (errors >= 3) {
      gameEnded = true;
      gameOver(false);
      return;
    }
    
    // Actualizar indicadores de error
    updateErrorIndicators();
    showAnswerFeedback(false, letterDiv);
  }
  
  // Limpiar entrada y continuar
  answerInput.value = '';
  answerInput.focus();
  
  // Eliminar primera pregunta de la cola
  queue.shift();
  
  // Verificar si se ha completado el rosco
  if (queue.length === 0) {
    // Verificar si hay preguntas pendientes
    const pendingQuestions = questions.filter(q => q.status === 'pending' || q.status === 'skipped');
    
    if (pendingQuestions.length === 0) {
      // No hay más preguntas pendientes, juego completado
      gameEnded = true;
      playSound('complete');
      gameOver(true);
      return;
    }
  }
  
  // Ocultar el mensaje de pista cuando cambia de letra
  const gameMessage = document.getElementById('game-message');
  if (gameMessage && gameMessage.classList.contains('help')) {
    gameMessage.classList.add('hidden');
  }
  
  showQuestion();
}

// Actualizar los indicadores de error en la UI
function updateErrorIndicators() {
  // Verificar si existe el contenedor de player-info
  const playerInfo = document.querySelector('.player-info');
  if (!playerInfo) return;
  
  // Verificar si ya existe el contador de errores
  let errorCounter = playerInfo.querySelector('.error-counter');
  
  // Si no existe, crearlo
  if (!errorCounter) {
    errorCounter = document.createElement('div');
    errorCounter.className = 'error-counter';
    playerInfo.appendChild(errorCounter);
    
    // Crear los 3 puntos de error
    for (let i = 1; i <= 3; i++) {
      const errorDot = document.createElement('div');
      errorDot.className = 'error-dot';
      errorDot.id = `error-${i}`;
      errorCounter.appendChild(errorDot);
    }
  }
  
  // Actualizar los puntos de error
  for (let i = 1; i <= 3; i++) {
    const errorDot = document.getElementById(`error-${i}`);
    if (errorDot) {
      errorDot.classList.toggle('active', i <= errors);
    }
  }
}

// Actualizar el estado visual de una letra en el rosco
function updateLetterUIStatus(index) {
  const letter = questions[index];
  const letterElement = document.getElementById(`letter-${letter.letra}`);
  
  if (letterElement) {
    // Quitar todas las clases de estado
    letterElement.classList.remove('current', 'correct', 'incorrect', 'skipped');
    
    // Añadir la clase según el estado actual
    letterElement.classList.add(letter.status);
  }
}

// Pasar a la siguiente pregunta
function passQuestion() {
  if (gameEnded || queue.length === 0) return;
  
  const currentIdx = queue[0];
  const currentQ = questions[currentIdx];
  const letterDiv = document.querySelectorAll('.rosco-letter')[currentIdx];
  
  // Marcar como pasada
  letterDiv.classList.add('skipped');
  currentQ.status = 'skipped';
  
  // Sonido feedback
  playSound('tick');
  
  // Mover al final de la cola
  const removedIdx = queue.shift();
  queue.push(removedIdx);
  
  // Mensaje
  showGameMessage('¡Pasapalabra! Volveremos a esta pregunta más tarde.', 'warning');
  
  // Limpiar input
  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.value = '';
    answerInput.focus();
  }
  
  // Ocultar el mensaje de pista cuando cambia de letra
  const gameMessage = document.getElementById('game-message');
  if (gameMessage && gameMessage.classList.contains('help')) {
    gameMessage.classList.add('hidden');
  }
  
  // Verificar si todas las preguntas están contestadas o saltadas
  const allAnsweredOrSkipped = questions.every(q => q.status === 'correct' || q.status === 'incorrect' || q.status === 'skipped');
  
  // Si todas están respondidas o saltadas, verificar si hay alguna saltada
  if (allAnsweredOrSkipped) {
    const anySkipped = questions.some(q => q.status === 'skipped');
    
    // Si no hay ninguna saltada, hemos completado el rosco
    if (!anySkipped) {
      gameEnded = true;
      playSound('complete');
      gameOver(true);
      return;
    }
  }
  
  // Mostrar la siguiente pregunta
  showQuestion();
}

// Mover al siguiente índice de letra pendiente
function moveToNextPendingLetter() {
  // Comprobar si quedan letras pendientes
  const pendingIndices = questions
    .map((q, index) => ({ status: q.status, index }))
    .filter(item => item.status === 'pending')
    .map(item => item.index);
  
  if (pendingIndices.length === 0) {
    // Si no quedan letras pendientes, el juego ha terminado con victoria
    gameOver(true);
    return;
  }
  
  // Obtener el siguiente índice después del actual
  let nextIndex = -1;
  for (let i = 0; i < pendingIndices.length; i++) {
    if (pendingIndices[i] > currentLetterIndex) {
      nextIndex = pendingIndices[i];
      break;
    }
  }
  
  // Si no hay próximo índice mayor, volver al principio del array
  if (nextIndex === -1) {
    nextIndex = pendingIndices[0];
  }
  
  // Actualizar el índice actual y mostrar la nueva pregunta
  currentLetterIndex = nextIndex;
  updateLetterInfo();
}

// Finalizar juego
function gameOver(isVictory) {
  // Detener temporizador
  clearInterval(timerInterval);
  gameEnded = true;
  
  // Calcular y asignar logros
  calculateAchievements(isVictory);
  
  // Mostrar modal correspondiente
  if (isVictory) {
    showVictoryModal();
  } else if (remainingTime <= 0) {
    showTimeoutModal(); // Nuevo modal específico para cuando se acaba el tiempo
  } else {
    showDefeatModal();
  }
}

// Calcular logros obtenidos
function calculateAchievements(isVictory) {
  playerAchievements = []; // Reiniciar logros
  
  if (isVictory) {
    // Logro por partida perfecta (0 errores)
    if (errors === 0) {
      playerAchievements.push(achievements.perfectGame);
    }
    
    // Logro por velocidad (menos de 2 minutos)
    const timeUsed = timeLimit - remainingTime;
    if (timeUsed < 120) {
      playerAchievements.push(achievements.speedster);
    }
    
    // Logro por no usar pistas
    if (helpUsed === 0) {
      playerAchievements.push(achievements.noHelp);
    }
    
    // Logro por no saltar preguntas
    const anySkipped = questions.some(q => q.status === 'skipped');
    if (!anySkipped) {
      playerAchievements.push(achievements.noSkips);
    }
    
    // Logro por ganar en dificultad difícil
    if (selectedDifficulty === 'dificil') {
      playerAchievements.push(achievements.hardDifficulty);
    }
  }
}

// Mostrar modal de victoria
function showVictoryModal() {
  const victoryModal = document.getElementById('victory-modal');
  if (!victoryModal) return;
  
  // Personalizar mensaje según número de errores y preguntas respondidas correctamente
  const modalBody = victoryModal.querySelector('.modal-body');
  if (modalBody) {
    const totalQuestions = questions.length;
    const modalP = modalBody.querySelector('p');
    
    if (modalP) {
      if (errors === 0) {
        modalP.textContent = `¡Perfecto! Has completado las ${totalQuestions} preguntas del rosco sin ningún error. ¡Increíble partida!`;
      } else if (errors === 1) {
        modalP.textContent = `¡Excelente! Has completado las ${totalQuestions} preguntas del rosco con solo un error.`;
      } else {
        modalP.textContent = `¡Muy bien! Has completado las ${totalQuestions} preguntas del rosco con ${errors} errores.`;
      }
    }
  }
  
  // Actualizar botón para mostrar los logros (si hay) o estadísticas
  const continueBtn = victoryModal.querySelector('#victory-close-btn');
  if (continueBtn) {
    if (playerAchievements.length > 0) {
      continueBtn.onclick = function() {
        victoryModal.style.display = 'none';
        showAchievements();
      };
    } else {
      continueBtn.onclick = function() {
        victoryModal.style.display = 'none';
        showStats();
      };
    }
  }
  
  // Mostrar el modal
  victoryModal.style.display = 'flex';
}

// Mostrar modal específico para timeout
function showTimeoutModal() {
  // Verificar si existe el modal, si no, crearlo
  let timeoutModal = document.getElementById('timeout-modal');
  if (!timeoutModal) {
    timeoutModal = document.createElement('div');
    timeoutModal.id = 'timeout-modal';
    timeoutModal.className = 'modal';
    
    timeoutModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header timeout">
          <h2>¡TIEMPO AGOTADO!</h2>
        </div>
        <div class="modal-body">
          <p>Se acabó el tiempo para responder todas las preguntas.</p>
          <div class="timeout-image">
            <i class="fas fa-hourglass-end fa-5x" style="color: #FFD54F; margin: 20px 0; text-shadow: 0 0 30px rgba(255,213,79,0.7);"></i>
          </div>
        </div>
        <div class="modal-footer">
          <button id="timeout-close-btn" class="modal-btn">Continuar <i class="fas fa-arrow-right"></i></button>
        </div>
      </div>
    `;
    
    document.body.appendChild(timeoutModal);
  }
  
  // Actualizar mensaje según rendimiento
  const modalBody = timeoutModal.querySelector('.modal-body');
  if (modalBody) {
    const pendingQuestions = questions.filter(q => q.status === 'pending' || q.status === 'skipped').length;
    const modalP = modalBody.querySelector('p');
    
    if (modalP) {
      modalP.textContent = `¡Se acabó el tiempo! Respondiste ${questions.length - pendingQuestions} de ${questions.length} preguntas.`;
    }
  }
  
  // Configurar el botón para continuar
  const continueBtn = timeoutModal.querySelector('#timeout-close-btn');
  if (continueBtn) {
    if (playerAchievements.length > 0) {
      continueBtn.onclick = function() {
        timeoutModal.style.display = 'none';
        showAchievements();
      };
    } else {
      continueBtn.onclick = function() {
        timeoutModal.style.display = 'none';
        showStats();
      };
    }
  }
  
  // Mostrar el modal
  timeoutModal.style.display = 'flex';
}

// Mostrar modal de derrota
function showDefeatModal() {
  const defeatModal = document.getElementById('defeat-modal');
  if (!defeatModal) return;
  
  // Personalizar mensaje basado en la razón real de la derrota
  const modalBody = defeatModal.querySelector('.modal-body');
  if (modalBody) {
    const pendingQuestions = questions.filter(q => q.status === 'pending' || q.status === 'skipped').length;
    const modalP = modalBody.querySelector('p');
    
    if (modalP) {
      modalP.textContent = `Has alcanzado el máximo de ${errors} errores permitidos. Respondiste ${questions.length - pendingQuestions} de ${questions.length} preguntas.`;
    }
  }
  
  // Actualizar indicadores de error
  updateErrorIndicators();
  
  // Configurar el botón para continuar
  const continueBtn = defeatModal.querySelector('#defeat-close-btn');
  if (continueBtn) {
    if (playerAchievements.length > 0) {
      continueBtn.onclick = function() {
        defeatModal.style.display = 'none';
        showAchievements();
      };
    } else {
      continueBtn.onclick = function() {
        defeatModal.style.display = 'none';
        showStats();
      };
    }
  }
  
  // Mostrar el modal
  defeatModal.style.display = 'flex';
}

// Función para mostrar logros obtenidos uno por uno
function showAchievements() {
  // Crear modal de logros si no existe
  let achievementModal = document.getElementById('achievement-modal');
  if (!achievementModal) {
    achievementModal = document.createElement('div');
    achievementModal.id = 'achievement-modal';
    achievementModal.className = 'modal achievement-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content achievement-content';
    
    achievementModal.appendChild(modalContent);
    document.body.appendChild(achievementModal);
  }
  
  // Obtener el contenido del modal
  const modalContent = achievementModal.querySelector('.modal-content');
  
  // Si no hay logros, mostrar estadísticas directamente
  if (playerAchievements.length === 0) {
    showStats();
    return;
  }
  
  // Mostrar el primer logro
  showNextAchievement(0, modalContent, achievementModal);
}

// Función para mostrar el siguiente logro en secuencia
function showNextAchievement(index, modalContent, modal) {
  // Si hemos mostrado todos los logros, mostrar botón para ir a estadísticas
  if (index >= playerAchievements.length) {
    // Agregar botón para continuar a estadísticas
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'modal-btn';
    continueBtn.textContent = 'Ver Estadísticas';
    continueBtn.innerHTML = 'Ver Estadísticas <i class="fas fa-chart-line"></i>';
    continueBtn.onclick = function() {
      modal.style.display = 'none';
      showStats();
    };
    
    footer.appendChild(continueBtn);
    modalContent.appendChild(footer);
    return;
  }
  
  const achievement = playerAchievements[index];
  
  // Limpiar contenido anterior
  modalContent.innerHTML = '';
  
  // Crear contenido de logro
  const header = document.createElement('div');
  header.className = 'modal-header achievement-header';
  header.innerHTML = '<h2>¡LOGRO DESBLOQUEADO!</h2>';
  
  const body = document.createElement('div');
  body.className = 'modal-body achievement-body';
  
  // Icono grande del logro
  const achievementIcon = document.createElement('div');
  achievementIcon.className = 'achievement-icon';
  achievementIcon.innerHTML = `<i class="fas fa-${achievement.icon}" style="color: ${achievement.color};"></i>`;
  
  // Título y descripción del logro
  const achievementInfo = document.createElement('div');
  achievementInfo.className = 'achievement-info';
  achievementInfo.innerHTML = `
    <h3>${achievement.title}</h3>
    <p>${achievement.description}</p>
  `;
  
  // Agregar elementos al body
  body.appendChild(achievementIcon);
  body.appendChild(achievementInfo);
  
  // Crear botón para continuar
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  
  const continueBtn = document.createElement('button');
  continueBtn.className = 'modal-btn';
  
  // Si hay más logros, botón para ver el siguiente, si no, botón para ver estadísticas
  if (index < playerAchievements.length - 1) {
    continueBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';
    continueBtn.onclick = function() {
      modal.classList.remove('achievement-animate');
      showNextAchievement(index + 1, modalContent, modal);
    };
  } else {
    continueBtn.innerHTML = 'Ver Estadísticas <i class="fas fa-chart-line"></i>';
    continueBtn.onclick = function() {
      modal.style.display = 'none';
      showStats();
    };
  }
  
  footer.appendChild(continueBtn);
  
  // Agregar header, body y footer al contenido del modal
  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modalContent.appendChild(footer);
  
  // Mostrar el modal con animación
  modal.style.display = 'flex';
  modal.classList.add('achievement-animate');
}

// Mostrar estadísticas del juego
function showStats() {
  // Ocultar modales anteriores
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
  
  // Mostrar modal de estadísticas
  const statsModal = document.getElementById('stats-modal');
  if (!statsModal) return;
  
  // Actualizar estadísticas
  const answered = questions.filter(q => q.status !== 'pending').length;
  
  document.getElementById('stats-answered').textContent = `${answered}/${questions.length}`;
  document.getElementById('stats-correct').textContent = correctAnswers;
  document.getElementById('stats-incorrect').textContent = errors;
  
  // Calcular tiempo usado
  const timeUsed = timeLimit - remainingTime;
  document.getElementById('stats-time').textContent = `${formatTime(timeUsed)}`;
  
  // Crear contenido para mostrar errores y respuestas correctas
  updateErrorsAndAnswersInStats();
  
  // Actualizar el botón para ir al ranking
  const rankingBtn = document.getElementById('stats-close-btn');
  if (rankingBtn) {
    rankingBtn.onclick = function() {
      window.location.href = 'ranking.html';
    };
  }
  
  // Mostrar el modal
  statsModal.style.display = 'flex';
}

// Actualizar sección de errores y respuestas correctas en estadísticas
function updateErrorsAndAnswersInStats() {
  const statsModal = document.getElementById('stats-modal');
  const modalBody = statsModal.querySelector('.modal-body');
  
  // Buscar o crear contenedor para errores y respuestas
  let answersSection = modalBody.querySelector('.answers-section');
  if (!answersSection) {
    answersSection = document.createElement('div');
    answersSection.className = 'answers-section';
    modalBody.appendChild(answersSection);
  }
  
  // Limpiar contenido anterior
  answersSection.innerHTML = '';
  
  // Crear título para errores si hay alguno
  if (errors > 0) {
    const errorTitle = document.createElement('h3');
    errorTitle.className = 'error-title';
    errorTitle.textContent = 'Respuestas incorrectas:';
    answersSection.appendChild(errorTitle);
    
    // Mostrar respuestas incorrectas
    const errorsList = document.createElement('ul');
    errorsList.className = 'errors-list';
    
    questions.filter(q => q.status === 'incorrect').forEach(q => {
      const errorItem = document.createElement('li');
      errorItem.innerHTML = `<span class="letter">${q.letra}</span>: <strong>${q.pregunta}</strong> - Respuesta correcta: <span class="correct-answer">${q.respuesta}</span>`;
      errorsList.appendChild(errorItem);
    });
    
    answersSection.appendChild(errorsList);
  }
  
  // Crear título para respuestas correctas
  const correctTitle = document.createElement('h3');
  correctTitle.className = 'correct-title';
  correctTitle.textContent = 'Respuestas correctas:';
  answersSection.appendChild(correctTitle);
  
  // Mostrar respuestas correctas
  const correctList = document.createElement('ul');
  correctList.className = 'correct-list';
  
  questions.filter(q => q.status === 'correct').forEach(q => {
    const correctItem = document.createElement('li');
    correctItem.innerHTML = `<span class="letter">${q.letra}</span>: <strong>${q.pregunta}</strong> - <span class="correct-answer">${q.respuesta}</span>`;
    correctList.appendChild(correctItem);
  });
  
  answersSection.appendChild(correctList);
}

// Volver a la página de inicio
function returnToHome() {
  window.location.href = 'index.html';
}

// Configurar manejadores de eventos
function setupGameEventHandlers() {
  // Eventos para botones de modales
  const victoryCloseBtn = document.getElementById('victory-close-btn');
  const defeatCloseBtn = document.getElementById('defeat-close-btn');
  const statsCloseBtn = document.getElementById('stats-close-btn');
  
  if (victoryCloseBtn) victoryCloseBtn.addEventListener('click', showStats);
  if (defeatCloseBtn) defeatCloseBtn.addEventListener('click', showStats);
  if (statsCloseBtn) statsCloseBtn.addEventListener('click', returnToHome);
}

function showQuestion() {
  if (questions.length === 0) return;
  
  // Obtener la pregunta actual de la cola
  const questionIndex = queue[0];
  const currentQ = questions[questionIndex];
  
  if (!currentQ) return;
  
  // Mostrar la letra y pregunta
  const questionContainer = document.getElementById('rosco-question');
  if (questionContainer) {
    // Detener cualquier animación o transición en curso
    questionContainer.style.transition = 'none';
    
    // Asegurar la posición centrada
    questionContainer.style.top = '50%';
    questionContainer.style.left = '50%';
    questionContainer.style.transform = 'translate(-50%, -50%)';
    
    // Limpiar contenedor
    questionContainer.innerHTML = '';
    
    // Mostrar letra grande
    const letterElement = document.createElement('div');
    letterElement.className = 'question-letter';
    letterElement.textContent = currentQ.letra.toUpperCase();
    questionContainer.appendChild(letterElement);
    
    // Mostrar pregunta
    const questionElement = document.createElement('div');
    questionElement.className = 'question-text';
    questionElement.textContent = currentQ.pregunta;
    questionContainer.appendChild(questionElement);
    
    // Forzar reflow para aplicar cambios inmediatamente
    void questionContainer.offsetWidth;
  }
  
  // Actualizar la letra activa en el rosco
  updateActiveLetter();
  
  // Si ya existe una pista para esta letra, mostrarla automáticamente
  const currentLetter = currentQ.letra;
  if (lettersWithHint.includes(currentLetter)) {
    showHintForLetter(currentLetter);
  } else {
    // Si no hay pista para esta letra, ocultar el mensaje de pista anterior
    const gameMessage = document.getElementById('game-message');
    if (gameMessage && gameMessage.classList.contains('help')) {
      gameMessage.classList.add('hidden');
    }
  }
  
  // Dar foco al campo de respuesta
  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.value = '';
    answerInput.focus();
  }
}

function updateActiveLetter() {
  const letters = document.querySelectorAll(".rosco-letter");
  letters.forEach((l) => l.classList.remove("current"));
  
  if (queue.length > 0) {
    const currentIdx = queue[0];
    letters[currentIdx].classList.add("current");
  }
}

// Nueva función para mostrar la pista para una letra específica
function showHintForLetter(letter) {
  const currentIdx = queue[0];
  const currentQuestion = questions[currentIdx];
  
  if (currentQuestion && currentQuestion.letra === letter) {
    const answer = currentQuestion.respuesta;
    if (answer && answer.length >= 3) {
      const hint = answer.substring(0, 3);
      // Mostrar mensaje de pista que permanecerá visible
      const gameMessage = document.getElementById('game-message');
      if (gameMessage) {
        gameMessage.className = 'game-message help';
        gameMessage.classList.remove('hidden');
        gameMessage.textContent = `PISTA (${letter}): La respuesta comienza con "${hint}"`;
      }
    } else {
      showGameMessage('No hay pista disponible para esta pregunta', 'warning');
    }
  }
}

// Precarga de sonidos para evitar retrasos
function preloadSounds() {
  for (const sound in sounds) {
    sounds[sound].load();
    sounds[sound].volume = 0.7;
  }
}

// Función para reproducir sonidos
function playSound(sound) {
  if (soundEnabled && sounds[sound]) {
    sounds[sound].currentTime = 0;
    sounds[sound].play().catch(error => {
      console.log('Error al reproducir sonido:', error);
    });
  }
}

// Control de sonido
function setupSoundToggle() {
  const soundToggle = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  
  if (!soundToggle || !soundIcon) return;
  
  soundToggle.addEventListener('click', function() {
    soundEnabled = !soundEnabled;
    
    if (soundEnabled) {
      soundIcon.className = 'fas fa-volume-up';
      soundToggle.classList.remove('muted');
    } else {
      soundIcon.className = 'fas fa-volume-mute';
      soundToggle.classList.add('muted');
    }
    
    // Guardar preferencia en localStorage
    localStorage.setItem('soundEnabled', soundEnabled);
  });
  
  // Cargar preferencia guardada
  const savedSoundPreference = localStorage.getItem('soundEnabled');
  if (savedSoundPreference !== null) {
    soundEnabled = savedSoundPreference === 'true';
    
    if (!soundEnabled) {
      soundIcon.className = 'fas fa-volume-mute';
      soundToggle.classList.add('muted');
    }
  }
}

// ===== MEJORAS DEL TEMPORIZADOR =====
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ===== MEJORA DE FEEDBACK VISUAL =====
function showAnswerFeedback(isCorrect, letterElement) {
  if (!letterElement) return;
  
  if (isCorrect) {
    letterElement.style.animation = 'correct-answer 0.8s';
    playSound('correct');
  } else {
    letterElement.style.animation = 'incorrect-answer 0.5s';
    playSound('incorrect');
  }
  
  // Reiniciar la animación después
  setTimeout(() => {
    letterElement.style.animation = '';
  }, 800);
}

// Obtener la pregunta actual
function getCurrentQuestion() {
  if (queue.length === 0) return null;
  
  const currentIdx = queue[0];
  return questions[currentIdx];
} 