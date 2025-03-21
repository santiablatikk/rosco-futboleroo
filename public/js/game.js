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

// Usar URLs externas confiables para los sonidos
const sounds = {
  correct: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'),
  incorrect: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-buzz-941.mp3'),
  timeout: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-over-trombone-1940.mp3'),
  tick: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-tick-tock-clock-timer-1045.mp3'),
  complete: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3')
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
    
    updateTimerDisplay(timeLeft, maxTime);
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      skipOrTimeoutQuestion(true); // true indica timeout
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

// Dibujar el rosco con mejor espaciado entre letras
function drawRosco() {
  const roscoContainer = document.getElementById('rosco');
  if (!roscoContainer) return;
  
  roscoContainer.innerHTML = '';
  
  // Calcular el tamaño óptimo del rosco basado en el tamaño de la ventana
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Reducir la proporción de altura para mover el rosco más arriba
  const minDimension = Math.min(viewportHeight * 0.55, viewportWidth * 0.65);
  
  // Ajustar el tamaño del rosco
  const roscoElement = document.querySelector('.rosco');
  if (roscoElement) {
    roscoElement.style.width = `${minDimension}px`;
    roscoElement.style.height = `${minDimension}px`;
  }
  
  // Calcular radio con un factor de escala menor para más separación entre letras
  const totalLetters = questions.length;
  let radius = minDimension * 0.42; // Increased radius for better letter spacing
  let centerX = minDimension / 2;
  let centerY = minDimension / 2;
  
  // Crear contenedor para la pregunta en el centro
  const questionContainer = document.createElement('div');
  questionContainer.className = 'question-container';
  questionContainer.id = 'rosco-question';
  // Evitar cualquier transformación o transición no deseada
  questionContainer.style.transition = 'none';
  questionContainer.style.top = '50%';
  questionContainer.style.left = '50%';
  questionContainer.style.transform = 'translate(-50%, -50%)';
  
  roscoContainer.appendChild(questionContainer);
  
  // Crear las letras en círculo con mayor separación
  questions.forEach((question, index) => {
    // Calcular posición en círculo con un ajuste para distribuir uniformemente
    const angle = (index * 2 * Math.PI / totalLetters) - Math.PI/2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Crear elemento de letra
    const letterElement = document.createElement('div');
    letterElement.className = 'rosco-letter';
    letterElement.id = `letter-${question.letra}`;
    letterElement.textContent = question.letra.toUpperCase();
    
    // Posicionar la letra con transform para mejor rendimiento
    letterElement.style.position = 'absolute';
    letterElement.style.left = `${x}px`;
    letterElement.style.top = `${y}px`;
    letterElement.style.transform = 'translate(-50%, -50%)';
    
    // Añadir clase para letra actual
    if (index === currentLetterIndex) {
      letterElement.classList.add('current');
    } else if (question.status !== 'pending') {
      letterElement.classList.add(question.status);
    }
    
    roscoContainer.appendChild(letterElement);
  });
  
  // Actualizar información de la letra actual
  updateLetterInfo();
  
  // No hacemos ajustes dinámicos al contenedor de preguntas
  // para mantenerlo estable
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
  // Primero, eliminar la clase 'current' de todas las letras
  document.querySelectorAll('.rosco-letter').forEach(letterElement => {
    letterElement.classList.remove('current');
  });
  
  // Luego, añadir la clase 'current' a la letra actual
  const currentLetterElement = document.getElementById(`letter-${questions[currentLetterIndex].letra}`);
  if (currentLetterElement) {
    currentLetterElement.classList.add('current');
  }
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
    showAnswerFeedback(true, letterDiv);
  } else {
    // Respuesta incorrecta
    letterDiv.classList.add('incorrect');
    letterDiv.classList.add('shake');
    showGameMessage(`Respuesta incorrecta. La correcta era: ${currentQ.respuesta}`, 'error');
    errors++;
    
    // Comprobar si ha alcanzado el máximo de errores
    if (errors >= 3) {
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
  
  // Eliminar primera pregunta de la cola y mostrar la siguiente
  queue.shift();
  
  // Ocultar el mensaje de pista cuando cambia de letra
  const gameMessage = document.getElementById('game-message');
  if (gameMessage && gameMessage.classList.contains('help')) {
    gameMessage.classList.add('hidden');
  }
  
  showQuestion();
}

// Actualizar los indicadores de error en la UI
function updateErrorIndicators() {
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
  if (queue.length === 0) return;
  
  // Obtenemos el índice actual y lo movemos al final de la cola
  const idx = queue.shift();
  const letterDiv = document.querySelectorAll(".rosco-letter")[idx];
  
  // Marcar visualmente como pasapalabra
  letterDiv.classList.add("skipped");
  
  // Añadir al final de la cola para volver a preguntar después
  queue.push(idx);
  
  // Ocultar temporalmente el mensaje de pista al cambiar de letra
  const gameMessage = document.getElementById('game-message');
  if (gameMessage && gameMessage.classList.contains('help')) {
    gameMessage.classList.add('hidden');
  }
  
  // Mostrar la siguiente pregunta (que ya maneja si debe mostrar la pista)
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
  clearInterval(timer);
  
  // Mostrar modal correspondiente
  if (isVictory) {
    showVictoryModal();
  } else {
    showDefeatModal();
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
  
  // Mostrar el modal (adaptado a los nuevos estilos)
  victoryModal.style.display = 'flex';
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
      if (remainingTime <= 0) {
        modalP.textContent = `Se acabó el tiempo. Respondiste ${questions.length - pendingQuestions} de ${questions.length} preguntas. ¡Mejor suerte la próxima vez!`;
      } else {
        modalP.textContent = `Has alcanzado el máximo de ${errors} errores permitidos. Respondiste ${questions.length - pendingQuestions} de ${questions.length} preguntas.`;
      }
    }
  }
  
  // Actualizar indicadores de error
  updateErrorIndicators();
  
  // Mostrar el modal (adaptado a los nuevos estilos)
  defeatModal.style.display = 'flex';
}

// Mostrar estadísticas del juego
function showStats() {
  // Ocultar modales de victoria/derrota
  const victoryModal = document.getElementById('victory-modal');
  const defeatModal = document.getElementById('defeat-modal');
  
  if (victoryModal) victoryModal.style.display = 'none';
  if (defeatModal) defeatModal.style.display = 'none';
  
  // Mostrar modal de estadísticas
  const statsModal = document.getElementById('stats-modal');
  if (!statsModal) return;
  
  // Actualizar estadísticas
  const answered = questions.filter(q => q.status !== 'pending').length;
  
  document.getElementById('stats-answered').textContent = `${answered}/${questions.length}`;
  document.getElementById('stats-correct').textContent = correctAnswers;
  document.getElementById('stats-incorrect').textContent = errors;
  document.getElementById('stats-time').textContent = `${timeLimit - remainingTime}s`;
  
  // Mostrar el modal (adaptado a los nuevos estilos)
  statsModal.style.display = 'flex';
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