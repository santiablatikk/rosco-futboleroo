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
let incorrectList = []; // Array para almacenar las respuestas incorrectas para el modal de estadísticas

document.addEventListener("DOMContentLoaded", function() {
  function actualizarRendimiento(porcentaje) {
    var performanceFill = document.getElementById('performance-fill');
    var performanceText = document.getElementById('performance-text');
    if (!performanceFill || !performanceText) return;

    // Actualiza el ancho de la barra basado en el porcentaje
    performanceFill.style.width = porcentaje + '%';

    // Calcula el color que pasa de rojo a verde (0% = rojo, 100% = verde)
    var rojo = Math.round(255 * (1 - porcentaje / 100));
    var verde = Math.round(255 * (porcentaje / 100));
    performanceFill.style.background = `rgb(${rojo}, ${verde}, 0)`;

    // Actualiza el texto descriptivo según el porcentaje
    if (porcentaje < 50) {
      performanceText.textContent = 'Rendimiento: Malo';
    } else if (porcentaje < 75) {
      performanceText.textContent = 'Rendimiento: Regular';
    } else {
      performanceText.textContent = 'Rendimiento: Excelente';
    }
  }
  
  // Ejemplo: Actualiza la barra al 80%
  actualizarRendimiento(80);
});


// Variables para rastrear rachas y logros especiales
let consecutiveCorrect = 0;      // Contador de respuestas correctas consecutivas actual
let longestCorrectStreak = 0;    // Racha más larga de respuestas correctas en la partida
let consecutiveIncorrect = 0;    // Contador de respuestas incorrectas consecutivas actual
let longestIncorrectStreak = 0;  // Racha más larga de respuestas incorrectas en la partida

// Definir los posibles logros del juego
const achievements = {
  perfectGame: {
    id: 'perfect_game',
    title: '¡PARTIDA PERFECTA!',
    description: 'Completaste el rosco sin cometer ningún error',
    icon: 'trophy',
    color: 'gold',
    category: 'expert'
  },
  speedster: {
    id: 'speed_demon',
    title: 'VELOCISTA',
    description: 'Completaste el rosco en menos de 2 minutos',
    icon: 'bolt',
    color: '#5d9cec',
    category: 'expert'
  },
  noHelp: {
    id: 'no_help',
    title: 'SIN AYUDA',
    description: 'Completaste el rosco sin usar ninguna pista',
    icon: 'brain',
    color: '#bc5cde',
    category: 'intermediate'
  },
  noSkips: {
    id: 'no_pass',
    title: 'DIRECTO AL GRANO',
    description: 'Completaste el rosco sin saltar ninguna pregunta',
    icon: 'check-double',
    color: '#5cd6ad',
    category: 'expert'
  },
  hardDifficulty: {
    id: 'hard_mode',
    title: 'NIVEL EXPERTO',
    description: 'Ganaste el juego en dificultad difícil',
    icon: 'fire',
    color: '#ff7043',
    category: 'expert'
  },
  firstGame: {
    id: 'first_game',
    title: 'PRIMER JUEGO',
    description: 'Completaste tu primer juego de PASALA CHÉ',
    icon: 'gamepad',
    color: '#4fc3f7',
    category: 'beginner'
  },
  nightOwl: {
    id: 'night_owl',
    title: 'BÚHO NOCTURNO',
    description: 'Jugaste una partida después de medianoche',
    icon: 'moon',
    color: '#7986cb',
    category: 'special'
  },
  weekendWarrior: {
    id: 'weekend_warrior',
    title: 'GUERRERO DE FIN DE SEMANA',
    description: 'Jugaste 5 partidas durante un fin de semana',
    icon: 'calendar-weekend',
    color: '#ff9800',
    category: 'special'
  },
  comebackKing: {
    id: 'comeback_king',
    title: 'REY DE LA REMONTADA',
    description: 'Ganaste después de tener 5 respuestas incorrectas',
    icon: 'crown',
    color: '#e91e63',
    category: 'special'
  },
  streakMaster: {
    id: 'streak_master',
    title: 'MAESTRO DE RACHAS',
    description: 'Respondiste correctamente 8 preguntas consecutivas',
    icon: 'fire-alt',
    color: '#ff5722',
    category: 'intermediate'
  },
  knowledgeGuru: {
    id: 'knowledge_guru',
    title: 'GURÚ DEL CONOCIMIENTO',
    description: 'Acumulaste más de 5000 puntos en total',
    icon: 'book',
    color: '#3f51b5',
    category: 'expert'
  },
  loyalPlayer: {
    id: 'loyal_player',
    title: 'JUGADOR LEAL',
    description: 'Jugaste durante 7 días consecutivos',
    icon: 'user-check',
    color: '#26a69a',
    category: 'special'
  }
};

// Definir sonidos del juego - usar archivos locales
const sounds = {
  correct: new Audio('sounds/correct.mp3'),
  incorrect: new Audio('sounds/incorrect.mp3'),
  timeout: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-over-trombone-1940.mp3'),
  tick: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-tick-tock-clock-timer-1045.mp3'),
  complete: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3')
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado, inicializando juego...');
  
  // Verificar que todos los elementos necesarios existan
  const modalsCheck = [
    { id: 'victory-modal', name: 'Victoria' },
    { id: 'defeat-modal', name: 'Derrota' },
    { id: 'timeout-modal', name: 'Timeout' },
    { id: 'stats-modal', name: 'Estadísticas' },
    { id: 'achievement-modal', name: 'Logros' }
  ];
  
  let missingElements = [];
  
  modalsCheck.forEach(modal => {
    if (!document.getElementById(modal.id)) {
      console.error(`Modal de ${modal.name} no encontrado en el DOM`);
      missingElements.push(modal.id);
    } else {
      console.log(`Modal de ${modal.name} encontrado correctamente`);
    }
  });
  
  if (missingElements.length === 0) {
    console.log('Todos los modales verificados correctamente');
  } else {
    console.warn(`ADVERTENCIA: Faltan los siguientes modales: ${missingElements.join(', ')}`);
  }
  
  // Configurar los botones de los modales con sus respectivas acciones
  setupModalButtons();
  
  // Recuperar datos de sessionStorage
  loadGameData();
  
  // Configurar manejadores de eventos
  setupGameEventHandlers();
  
  // Inicializar el juego
  initializeGame();
  
  preloadSounds();
  setupSoundToggle();
});

// Configurar todos los botones de modales
function setupModalButtons() {
  console.log("Configurando botones de modales...");
  
  // Botón del modal de derrota
  const defeatStatsBtn = document.getElementById('defeat-stats-btn');
  if (defeatStatsBtn) {
    defeatStatsBtn.onclick = function() {
      console.log("Botón de estadísticas en derrota clickeado");
      document.getElementById('defeat-modal').style.display = 'none';
      setTimeout(() => showStatsModal(), 50);
    };
    console.log("Botón de estadísticas en derrota configurado");
  } else {
    console.error("ERROR: Botón de estadísticas en modal de derrota no encontrado");
  }
  
  // Botones del modal de timeout
  const timeoutBtn = document.getElementById('timeout-btn');
  if (timeoutBtn) {
    timeoutBtn.onclick = function() {
      console.log("Botón de timeout clickeado");
      document.getElementById('timeout-modal').style.display = 'none';
      setTimeout(() => showStatsModal(), 50);
    };
    console.log("Botón de timeout configurado");
  }
  
  // Botones de estadísticas
  const profileBtn = document.getElementById('profile-button');
  const rankingBtn = document.getElementById('ranking-button');
  const replayBtn = document.getElementById('replay-button');
  
  if (profileBtn) profileBtn.onclick = () => window.location.href = 'profile.html';
  if (rankingBtn) rankingBtn.onclick = () => window.location.href = 'ranking.html';
  if (replayBtn) replayBtn.onclick = () => location.reload();
}

// Cargar datos guardados
function loadGameData() {
  // Recuperar nombre de usuario
  username = sessionStorage.getItem('username');
  if (!username) {
    // Si no hay nombre de usuario, redirigir a la página de inicio
    window.location.href = 'index.html';
    return;
  }
  
  // Mostrar nombre de usuario en diferentes elementos de la interfaz
  const playerNameDisplay = document.getElementById('player-name-display');
  if (playerNameDisplay) {
    playerNameDisplay.textContent = username;
  }
  
  // Mostrar nombre de usuario en el header
  const playerNameElement = document.getElementById('player-name');
  if (playerNameElement) {
    playerNameElement.textContent = username;
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
  let timer = duration;
  remainingTime = timer;
  
  const timerElement = document.getElementById('timer');
  updateTimerDisplay(timer, duration);
  
  clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    if (gameEnded) {
      clearInterval(timerInterval);
      return;
    }
    
    timer--;
    remainingTime = timer;
    
    // Actualizar display
    updateTimerDisplay(timer, duration);
    
    // Verificar si el tiempo se acabó
    if (timer <= 0) {
      clearInterval(timerInterval);
      gameEnded = true;
      gameOver(false); // Llamar a gameOver cuando el tiempo se acaba
    }
    
    // Sonido de tick en los últimos 10 segundos
    if (timer <= 10 && timer > 0) {
      playSound('tick');
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
    const letterDiv = document.getElementById(`letter-${currentQuestion.letra}`);
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
  
  // Verificar si existe el contenedor de preguntas para layouts clásicos
  let questionContainer = document.getElementById('rosco-question');
  
  // Detectar si estamos en versión móvil por la URL o por la clase en el body
  const isMobile = window.location.href.includes('game-mobile.html') || 
                   document.body.classList.contains('mobile-device') ||
                   window.innerWidth <= 768;
  
  if (!isMobile && !questionContainer) {
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
  
  let minDimension, roscoSize;
  
  if (isMobile) {
    // Para móviles, hacer el rosco más pequeño
    minDimension = Math.min(viewportWidth * 0.9, viewportHeight * 0.45);
    roscoSize = Math.min(minDimension, 300);
  } else {
    // Tamaño para desktop
    minDimension = Math.min(viewportWidth, viewportHeight * 0.55);
    roscoSize = Math.min(minDimension, 380);
  }
  
  // Aplicar el tamaño calculado
  roscoContainer.style.width = `${roscoSize}px`;
  roscoContainer.style.height = `${roscoSize}px`;
  
  // Radio del rosco ajustado
  const radius = roscoSize * 0.45;
  
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
    
    // Tamaño de letra diferente para móvil
    if (isMobile) {
      letterElement.style.width = '32px';
      letterElement.style.height = '32px';
      letterElement.style.fontSize = '1.2rem';
    }
    
    // Posicionar la letra
    letterElement.style.left = `${x}px`;
    letterElement.style.top = `${y}px`;
    
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
  // Detectar si estamos en versión móvil
  const isMobile = window.location.href.includes('game-mobile.html') || 
                   document.body.classList.contains('mobile-device') ||
                   window.innerWidth <= 768;
                   
  if (isMobile) {
    // Aplicar ajustes específicos para móvil
    const currentLetterElement = document.getElementById('current-letter');
    const currentQuestionElement = document.getElementById('current-question');
    
    if (currentLetterElement && currentQuestionElement) {
      // Actualizar contenido con la pregunta actual
      if (queue.length > 0) {
        const questionIndex = queue[0];
        const currentQ = questions[questionIndex];
        if (currentQ) {
          currentLetterElement.textContent = currentQ.letra.toUpperCase();
          currentQuestionElement.textContent = currentQ.pregunta;
        }
      }
    }
  }
  
  // Redibujar el rosco con el tamaño actualizado
  drawRosco();
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
    
    // Añadir la clase según el estado
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
function showGameMessage(message, type = '', duration = 3000) {
  const gameMessage = document.getElementById('game-message');
  if (!gameMessage) return;
  
  // Para mensajes genéricos o "Tu turno...", mantener oculto
  if (message === 'Tu turno...' || message === '¡Empieza el juego! Responde las preguntas para cada letra.' || 
      message === '¡Respuesta correcta!' || message.includes('Respuesta incorrecta')) {
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
  
  // No ocultamos automáticamente los mensajes importantes
  // Solo los mensajes de pista se mantienen visibles
  if (!type.includes('help')) {
    setTimeout(() => {
      gameMessage.classList.add('hidden');
    }, duration);
  }
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
  if (questions.length === 0 || queue.length === 0) return;
  
  const questionIndex = queue[0];
  const currentQ = questions[questionIndex];
  
  if (!currentQ || !currentQ.letra) return;
  
  // Mostrar la pista para la letra actual
  showHintForLetter(currentQ.letra);
  
  // Reproducir sonido (si está habilitado)
  playSound('hint');
}

function showHintForLetter(letter) {
  // Buscar la pista para esta letra específica
  const letterIndex = questions.findIndex(q => q.letra === letter);
  if (letterIndex === -1) return;
  
  const question = questions[letterIndex];
  if (!question.pista) return;
  
  // Añadir esta letra a las que ya tienen pista mostrada
  if (!lettersWithHint.includes(letter)) {
    lettersWithHint.push(letter);
  }
  
  // Detectar si estamos en versión móvil
  const isMobile = window.location.href.includes('game-mobile.html') || 
                   document.body.classList.contains('mobile-device') ||
                   window.innerWidth <= 768;
                   
  // Usar la función showGameMessage para mostrar la pista
  if (typeof window.showGameMessage === 'function') {
    // Si existe la función global, usarla (especialmente para móvil)
    window.showGameMessage(question.pista, 'warning', 5000);
  } else {
    // Mostrar el mensaje de manera tradicional
    const gameMessage = document.getElementById('game-message');
    if (gameMessage) {
      gameMessage.textContent = question.pista;
      gameMessage.className = 'game-message warning visible';
      
      // Ocultar automáticamente después de 5 segundos
      setTimeout(() => {
        gameMessage.classList.remove('visible');
      }, 5000);
    }
  }
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
    // No mostrar mensaje, solo feedback visual
    correctAnswers++;
    currentQ.status = 'correct';
    showAnswerFeedback(true, letterDiv);
    
    // Actualizar contadores de racha
    consecutiveCorrect++;
    consecutiveIncorrect = 0;
    
    // Actualizar racha más larga
    if (consecutiveCorrect > longestCorrectStreak) {
      longestCorrectStreak = consecutiveCorrect;
    }
    
    // Reproducir sonido de respuesta correcta
    playSound('correct');
  } else {
    // Respuesta incorrecta
    letterDiv.classList.add('incorrect');
    letterDiv.classList.add('shake');
    // No mostrar mensaje, solo feedback visual
    errors++;
    incorrectAnswers++;
    currentQ.status = 'incorrect';
    
    // Actualizar contadores de racha
    consecutiveIncorrect++;
    consecutiveCorrect = 0;
    
    // Actualizar racha más larga
    if (consecutiveIncorrect > longestIncorrectStreak) {
      longestIncorrectStreak = consecutiveIncorrect;
    }
    
    // Guardar el error para el modal de estadísticas
    incorrectList.push({
      letra: currentQ.letra,
      pregunta: currentQ.pregunta,
      respuestaCorrecta: currentQ.respuesta
    });
    // Reproducir sonido de respuesta incorrecta
    playSound('incorrect');
    
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
  // Verificar si existe el contenedor de error-counter
  const errorCounter = document.getElementById('error-counter');
  if (!errorCounter) {
    console.error('No se encontró el elemento error-counter');
    return;
  }
  
  // Limpiar el contenedor
  errorCounter.innerHTML = '';
  
  // Crear los 3 puntos de error
  for (let i = 1; i <= 3; i++) {
    const errorDot = document.createElement('div');
    errorDot.className = 'error-dot';
    errorDot.id = `error-${i}`;
    
    // Marcar como activo si corresponde
    if (i <= errors) {
      errorDot.classList.add('active');
    }
    
    errorCounter.appendChild(errorDot);
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

// Función para pasar a la siguiente pregunta (pasapalabra)
function passQuestion() {
  if (gameEnded) return;
  
  // Verificar si hay elementos en la cola
  if (queue.length === 0) return;
  
  const currentIdx = queue[0];
  const currentQuestion = questions[currentIdx];
  
  if (currentQuestion) {
    // Marcar como saltada
    currentQuestion.status = 'skipped';
    skippedAnswers++;
    
    // Actualizar UI de la letra
    const letterElement = document.getElementById(`letter-${currentQuestion.letra}`);
    if (letterElement) {
      letterElement.classList.remove('current');
      letterElement.classList.add('skipped');
    }
    
    // Resetear racha de respuestas correctas consecutivas
    consecutiveCorrect = 0;
    
    // Reproducir sonido
    playSound('skip');
    
    // Quitar la pregunta actual de la cola y ponerla al final
    const skippedQuestion = queue.shift();
    queue.push(skippedQuestion);
    
    // Mostrar la siguiente pregunta
    showQuestion();
  }
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
  
  console.log(`Juego finalizado. Victoria: ${isVictory}, Tiempo restante: ${remainingTime}`);
  
  // Calcular y asignar logros
  calculateAchievements(isVictory);
  
  // Enviar datos al servidor para actualizar el ranking y perfil
  updatePlayerStats();
  
  // Mostrar modal correspondiente
  if (isVictory) {
    showVictoryModal();
  } else if (remainingTime <= 0) {
    showTimeoutModal();
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

// Función para enviar los datos de la partida al servidor
function updatePlayerStats() {
  // Obtener el nombre de usuario del DOM o localStorage
  let playerName = document.getElementById('player-name')?.textContent || 'Jugador';
  
  // Si no hay un nombre específico, usar el del localStorage
  if (playerName === 'Jugador') {
    playerName = localStorage.getItem('username') || 'Jugador';
  }
  
  // Preparar datos para enviar
  const gameData = {
    player: playerName,
    score: calculateScore(),
    correctAnswers: correctAnswers,
    errors: errors,
    timeUsed: timeLimit - remainingTime,
    difficulty: selectedDifficulty,
    achievements: playerAchievements.map(a => a.id),
    completed: gameEnded,
    victory: correctAnswers === questions.length - errors
  };
  
  console.log('Enviando estadísticas al servidor:', gameData);
  
  // Guardar nombre para futuras sesiones
  localStorage.setItem('username', playerName);
  
  // Enviar datos al servidor
  fetch('/api/update-stats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al actualizar estadísticas');
    }
    return response.json();
  })
  .then(data => {
    console.log('Estadísticas actualizadas correctamente:', data);
    
    // Actualizar posición en el ranking si está disponible
    if (data.ranking_position) {
      localStorage.setItem('playerRankingPosition', data.ranking_position);
    }
  })
  .catch(error => {
    console.error('Error al actualizar estadísticas:', error);
  });
}

// Calcular puntaje basado en respuestas correctas, tiempo y dificultad
function calculateScore() {
  const basePoints = correctAnswers * 100;
  const timeBonus = remainingTime > 0 ? Math.floor(remainingTime / 2) : 0;
  
  // Multiplicador basado en dificultad
  let difficultyMultiplier = 1;
  if (selectedDifficulty === 'normal') difficultyMultiplier = 1.5;
  if (selectedDifficulty === 'dificil') difficultyMultiplier = 2;
  
  return Math.floor((basePoints + timeBonus) * difficultyMultiplier);
}

// Función para mostrar el modal de victoria
function showVictoryModal() {
  console.log("Mostrando modal de victoria");
  
  // Ocultar otros modales primero
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  const victoryModal = document.getElementById('victory-modal');
  
  if (!victoryModal) {
    console.error("ERROR: No se encontró el modal de victoria");
    return;
  }
  
  // Actualizar contenido
  const victoryMessage = document.querySelector('#victory-modal .modal-body p');
  if (victoryMessage) {
    victoryMessage.textContent = `¡Felicidades! Has completado el rosco con ${correctAnswers} aciertos y ${incorrectAnswers} errores.`;
  }
  
  // Limpiar cualquier función onclick anterior
  victoryModal.onclick = null;
  
  // Agregar evento para cerrar al hacer clic en cualquier lugar
  victoryModal.onclick = function(event) {
    // Si hay logros, mostrarlos primero
    if (playerAchievements.length > 0) {
      victoryModal.style.display = 'none';
      showNextAchievement(0);
      } else {
      // Si no hay logros, ir directamente a estadísticas
      victoryModal.style.display = 'none';
      showStatsModal();
      }
  };
  
  // Mostrar el modal
  document.body.style.overflow = 'hidden'; // Prevenir scroll
  victoryModal.style.display = 'flex';
  victoryModal.style.alignItems = 'center';
  victoryModal.style.justifyContent = 'center';
  
  // Asegurar visibilidad
  ensureModalVisibility(victoryModal);
  
  // Reproducir sonido
  if (soundEnabled) {
    playSound('complete');
  }
}

// Función para mostrar el modal de derrota
function showDefeatModal() {
  console.log("Mostrando modal de derrota");
  
  // Ocultar otros modales primero
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  const defeatModal = document.getElementById('defeat-modal');
  
  if (!defeatModal) {
    console.error("ERROR: No se encontró el modal de derrota");
    return;
  }
  
  // Actualizar contenido
  const defeatMessage = document.querySelector('#defeat-modal .modal-body p');
  if (defeatMessage) {
    defeatMessage.textContent = `Has agotado los 3 errores permitidos. Conseguiste ${correctAnswers} aciertos.`;
  }
  
  // Configurar botón para ver estadísticas
  const defeatFooter = document.querySelector('#defeat-modal .modal-footer');
  const continueButton = document.querySelector('#defeat-modal .modal-footer button');
  
  if (continueButton) {
    // Eliminar eventos previos
    const newButton = continueButton.cloneNode(true);
    if (continueButton.parentNode) {
      continueButton.parentNode.replaceChild(newButton, continueButton);
    }
    
    // Configurar el nuevo botón
    newButton.addEventListener('click', function() {
      console.log("Botón de continuar en derrota clickeado");
      defeatModal.style.display = 'none';
      
      // Pequeño retraso para asegurar que el modal anterior se cierre completamente
      setTimeout(function() {
        showStatsModal();
      }, 50);
    });
  } else {
    console.error("ERROR: No se encontró el botón de continuar en el modal de derrota");
  }
  
  // Asegurar que el modal no se cierre al hacer clic en él
  defeatModal.onclick = function(event) {
    // Evitar que se propague el clic si es en el fondo
    if (event.target === defeatModal) {
      event.stopPropagation();
    }
  };
  
  // Mostrar el modal
  document.body.style.overflow = 'hidden'; // Prevenir scroll
  defeatModal.style.display = 'block';
  
  // Asegurar visibilidad
  ensureModalVisibility(defeatModal);
  
  // Reproducir sonido
  if (soundEnabled) {
    playSound('incorrect');
  }
}

// Función para mostrar el modal de tiempo agotado
function showTimeoutModal() {
  console.log("Mostrando modal de timeout");
  
  // Ocultar otros modales primero
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // Obtener el modal de timeout
  const timeoutModal = document.getElementById('timeout-modal');
  
  if (!timeoutModal) {
    console.error("ERROR: No se encontró el modal de timeout");
    return;
  }
  
  // Actualizar mensaje según las respuestas contestadas
  const modalBody = timeoutModal.querySelector('.modal-body p');
  if (modalBody) {
    if (correctAnswers + incorrectAnswers > 0) {
      modalBody.textContent = `Se acabó el tiempo. Has respondido ${correctAnswers + incorrectAnswers} preguntas.`;
    } else {
      modalBody.textContent = 'Se acabó el tiempo sin que respondieras ninguna pregunta.';
    }
  }
  
  // Limpiar cualquier función onclick anterior
  timeoutModal.onclick = null;
  
  // Agregar evento para cerrar al hacer clic en cualquier lugar
  timeoutModal.onclick = function(event) {
    // Si hay logros, mostrarlos primero
    if (playerAchievements.length > 0) {
      timeoutModal.style.display = 'none';
      showNextAchievement(0);
      } else {
      // Si no hay logros, ir directamente a estadísticas
      timeoutModal.style.display = 'none';
      showStatsModal();
    }
  };
  
  // Mostrar el modal
  document.body.style.overflow = 'hidden'; // Prevenir scroll
  timeoutModal.style.display = 'flex';
  timeoutModal.style.alignItems = 'center';
  timeoutModal.style.justifyContent = 'center';
  
  // Asegurar visibilidad
  ensureModalVisibility(timeoutModal);
  
  // Reproducir sonido
  if (soundEnabled) {
    playSound('timeout');
  }
}

// Función para mostrar logros uno por uno
function showNextAchievement(index) {
  if (index >= playerAchievements.length) {
    // Se han mostrado todos los logros, mostrar estadísticas
    showStatsModal();
    return;
  }
  
  // Ocultar otros modales primero
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // Obtener el modal de logros
  const achievementModal = document.getElementById('achievement-modal');
  
  if (!achievementModal) {
    console.error("ERROR: No se encontró el modal de logros");
    showStatsModal();
    return;
  }
  
  // Obtener el logro actual
  const achievement = playerAchievements[index];
  
  // Actualizar contenido del modal
  achievementModal.querySelector('.modal-content').innerHTML = `
    <div class="achievement-container">
      <div class="achievement-icon" style="background-color: ${achievement.color || '#ffc107'}">
        <i class="fas fa-${achievement.icon}"></i>
      </div>
      <h2 class="achievement-title">${achievement.title}</h2>
      <p class="achievement-description">${achievement.description}</p>
      <div class="achievement-info">Categoría: ${achievement.category || 'General'}</div>
    </div>
  `;
  
  // Limpiar cualquier función onclick anterior
  achievementModal.onclick = null;
  
  // Agregar evento para mostrar el siguiente logro al hacer clic
  achievementModal.onclick = function() {
    achievementModal.style.display = 'none';
    showNextAchievement(index + 1);
  };
  
  // Mostrar el modal
  document.body.style.overflow = 'hidden'; // Prevenir scroll
  achievementModal.style.display = 'flex';
  achievementModal.style.alignItems = 'center';
  achievementModal.style.justifyContent = 'center';
  
  // Asegurar visibilidad
  ensureModalVisibility(achievementModal);
  
  // Reproducir sonido
  if (soundEnabled) {
    playSound('complete');
  }
}

// Volver a la página de inicio
function returnToHome() {
  window.location.href = 'index.html';
}

// Configurar manejadores de eventos
function setupGameEventHandlers() {
  // Botones principales
  const checkBtn = document.getElementById('check-btn');
  const pasalaBtn = document.getElementById('pasala-btn');
  const helpBtn = document.getElementById('help-btn');
  const answerInput = document.getElementById('answer-input');
  const soundToggle = document.getElementById('sound-toggle');
  
  // Detectar si estamos en versión móvil
  const isMobile = window.location.href.includes('game-mobile.html') || 
                   document.body.classList.contains('mobile-device') ||
                   window.innerWidth <= 768;
  
  // Eventos para botones del juego
  if (checkBtn) checkBtn.addEventListener('click', checkAnswer);
  if (pasalaBtn) pasalaBtn.addEventListener('click', passQuestion);
  if (helpBtn) helpBtn.addEventListener('click', showHint);
  
  // Eventos para campo de respuesta
  if (answerInput) {
    answerInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
      }
    });
    
    // Enfocar el campo de respuesta automáticamente
    setTimeout(() => {
      answerInput.focus();
    }, 500);
  }
  
  // Control de sonido
  if (soundToggle) {
    soundToggle.addEventListener('click', function() {
      soundEnabled = !soundEnabled;
      const soundIcon = document.getElementById('sound-icon');
      
      if (soundIcon) {
        if (soundEnabled) {
          soundIcon.className = 'fas fa-volume-up';
          soundToggle.classList.remove('muted');
          playSound('click');
        } else {
          soundIcon.className = 'fas fa-volume-mute';
          soundToggle.classList.add('muted');
        }
      }
      
      // Guardar preferencia de sonido
      localStorage.setItem('soundEnabled', soundEnabled);
    });
  }
  
  // Botones de modales
  const victoryStatsBtn = document.getElementById('victory-stats-btn');
  const defeatStatsBtn = document.getElementById('defeat-stats-btn');
  const timeoutBtn = document.getElementById('timeout-btn');
  const replayButton = document.getElementById('replay-button');
  const profileButton = document.getElementById('profile-button');
  const rankingButton = document.getElementById('ranking-button');
  
  if (victoryStatsBtn) victoryStatsBtn.addEventListener('click', showStatsModal);
  if (defeatStatsBtn) defeatStatsBtn.addEventListener('click', showStatsModal);
  if (timeoutBtn) timeoutBtn.addEventListener('click', showStatsModal);
  if (replayButton) replayButton.addEventListener('click', function() {
    window.location.reload();
  });
  if (profileButton) profileButton.addEventListener('click', function() {
    window.location.href = 'profile.html';
  });
  if (rankingButton) rankingButton.addEventListener('click', function() {
    window.location.href = 'ranking.html';
  });
  
  // Evento de redimensión para ajustar tamaño del rosco
  window.addEventListener('resize', adjustRoscoSize);
  
  // Cargar preferencias de sonido
  let savedSoundPreference = localStorage.getItem('soundEnabled');
  if (savedSoundPreference !== null) {
    soundEnabled = savedSoundPreference === 'true';
    if (!soundEnabled && soundToggle) {
      const soundIcon = document.getElementById('sound-icon');
      if (soundIcon) {
        soundIcon.className = 'fas fa-volume-mute';
        soundToggle.classList.add('muted');
      }
    }
  }
}

function showQuestion() {
  if (questions.length === 0) return;
  
  // Obtener la pregunta actual de la cola
  const questionIndex = queue[0];
  const currentQ = questions[questionIndex];
  
  if (!currentQ) return;
  
  // Detectar si estamos en versión móvil
  const isMobile = window.location.href.includes('game-mobile.html') || 
                   document.body.classList.contains('mobile-device') ||
                   window.innerWidth <= 768;
  
  if (isMobile) {
    // Actualizar elementos específicos de la versión móvil
    const currentLetterElement = document.getElementById('current-letter');
    const currentQuestionElement = document.getElementById('current-question');
    
    if (currentLetterElement && currentQuestionElement) {
      currentLetterElement.textContent = currentQ.letra.toUpperCase();
      currentQuestionElement.textContent = currentQ.pregunta;
    }
  } else {
    // Mostrar la letra y pregunta en layout desktop
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
  letters.forEach((l) => {
    l.classList.remove("current");
    
    // Restaurar estilos por defecto en caso de que se hayan modificado manualmente
    l.style.width = "";
    l.style.height = "";
    l.style.fontSize = "";
    l.style.background = "";
    l.style.border = "";
    l.style.boxShadow = "";
    l.style.zIndex = "";
  });
  
  // Detectar si estamos en versión móvil
  const isMobile = window.location.href.includes('game-mobile.html') || 
                   document.body.classList.contains('mobile-device') ||
                   window.innerWidth <= 768;
  
  if (queue.length > 0) {
    const currentIdx = queue[0];
    const currentLetter = letters[currentIdx];
    
    if (currentLetter) {
      currentLetter.classList.add("current");
      
      // Aplicar estilos adicionales para la versión móvil
      if (isMobile) {
        currentLetter.style.width = '40px';
        currentLetter.style.height = '40px';
        currentLetter.style.fontSize = '1.4rem';
        currentLetter.style.background = 'transparent';
        currentLetter.style.border = '2px solid #f59e0b';
        currentLetter.style.boxShadow = '0 0 10px #f59e0b';
        currentLetter.style.zIndex = '10';
      }
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

// Función para garantizar que los modales sean visibles
function ensureModalVisibility(targetModal) {
  if (!targetModal) {
    console.error("Error: Se llamó a ensureModalVisibility sin un modal válido");
    return;
  }
  
  console.log(`Asegurando visibilidad para modal: ${targetModal.id}`);
  
  // Forzar estilos directamente en el modal
  targetModal.style.display = 'block';
  targetModal.style.visibility = 'visible';
  targetModal.style.opacity = '1';
  targetModal.style.zIndex = '999999';
  targetModal.style.pointerEvents = 'auto';
  
  // Forzar estilos en el contenido del modal
  const modalContent = targetModal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.visibility = 'visible';
    modalContent.style.opacity = '1';
    modalContent.style.zIndex = '1000000';
    modalContent.style.pointerEvents = 'auto';
    
    // Asegurar que el contenido esté bien posicionado
    modalContent.style.position = 'absolute';
    modalContent.style.top = '50%';
    modalContent.style.left = '50%';
    modalContent.style.transform = 'translate(-50%, -50%)';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflowY = 'auto';
  } else {
    console.warn(`No se encontró .modal-content dentro de ${targetModal.id}`);
  }
  
  // Crear un estilo global para asegurar visibilidad de modales
  let modalFixStyle = document.getElementById('modal-fix-style');
  
  if (!modalFixStyle) {
    modalFixStyle = document.createElement('style');
    modalFixStyle.id = 'modal-fix-style';
    document.head.appendChild(modalFixStyle);
  }
  
  // Actualizar el estilo con reglas específicas para este modal
  modalFixStyle.innerHTML = `
    #${targetModal.id} {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
    }
    #${targetModal.id} .modal-content {
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 1000000 !important;
      pointer-events: auto !important;
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      max-height: 90vh !important;
      overflow-y: auto !important;
    }
  `;
}

function hideAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// Actualizar la función showStatsModal para trabajar con el nuevo diseño
function showStatsModal() {
  console.log("Mostrando modal de estadísticas");
  
  // Ocultar otros modales primero
  hideAllModals();
  
  const statsModal = document.getElementById('stats-modal');
  if (!statsModal) {
    console.error("No se encontró el modal de estadísticas");
    return;
  }
  
  // Asegurar que el modal será visible
  ensureModalVisibility(statsModal);
  
  // Actualizar las estadísticas
  const totalQuestionsEl = document.getElementById('total-questions');
  const correctAnswersEl = document.getElementById('correct-answers');
  const incorrectAnswersEl = document.getElementById('incorrect-answers');
  const timeUsedEl = document.getElementById('time-used');
  const errorsList = document.getElementById('errors-list');
  
  if (totalQuestionsEl) totalQuestionsEl.textContent = correctAnswers + incorrectAnswers;
  if (correctAnswersEl) correctAnswersEl.textContent = correctAnswers;
  if (incorrectAnswersEl) incorrectAnswersEl.textContent = incorrectAnswers;
  if (timeUsedEl) timeUsedEl.textContent = formatTime(timeLimit - remainingTime);
  
  // Eliminar referencia a la barra de rendimiento ya que fue removida del CSS
  // Ahora vamos directamente a la gestión de errores que fue lo que se mantuvo
  
  // Limpiar lista de errores
  if (errorsList) {
    errorsList.innerHTML = '';
    
    // Si no hay errores, mostrar mensaje
    if (incorrectList.length === 0) {
      const perfectGameDiv = document.createElement('div');
      perfectGameDiv.className = 'perfect-game';
      perfectGameDiv.innerHTML = '<i class="fas fa-star"></i> ¡Partida perfecta! No has cometido ningún error.';
      errorsList.appendChild(perfectGameDiv);
    } else {
      // Mostrar errores con el formato simplificado
      const maxErrorsToShow = Math.min(incorrectList.length, 10);
      
      // Agregar título para conteo de errores
      const errorCountTitle = document.createElement('div');
      errorCountTitle.className = 'errors-count-title';
      errorCountTitle.textContent = `Mostrando ${maxErrorsToShow} de ${incorrectList.length} errores`;
      errorsList.appendChild(errorCountTitle);
      
      for (let i = 0; i < maxErrorsToShow; i++) {
        const error = incorrectList[i];
        const li = document.createElement('li');
        
        // Estructura simplificada para cada error
        const letterDiv = document.createElement('div');
        letterDiv.className = 'letter';
        letterDiv.textContent = error.letra.toUpperCase();
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-text';
        questionDiv.textContent = error.pregunta;
        
        const answerDiv = document.createElement('div');
        answerDiv.className = 'correct-answer';
        answerDiv.textContent = error.respuestaCorrecta;
        
        // Añadir elementos al li
        li.appendChild(letterDiv);
        li.appendChild(questionDiv);
        li.appendChild(answerDiv);
        
        errorsList.appendChild(li);
      }
      
      // Si hay más errores de los que se muestran, añadir mensaje
      if (incorrectList.length > maxErrorsToShow) {
        const remainingErrors = incorrectList.length - maxErrorsToShow;
        const moreErrorsDiv = document.createElement('div');
        moreErrorsDiv.className = 'more-errors';
        moreErrorsDiv.textContent = `+ ${remainingErrors} error${remainingErrors > 1 ? 'es' : ''} más`;
        errorsList.appendChild(moreErrorsDiv);
      }
    }
  }
  
  console.log("Modal de estadísticas configurado, errores mostrados:", incorrectList.length);
  
  // Botones para navegar
  const profileButton = document.getElementById('profile-button');
  const rankingButton = document.getElementById('ranking-button');
  const replayButton = document.getElementById('replay-button');
  
  if (profileButton) profileButton.onclick = () => window.location.href = 'profile.html';
  if (rankingButton) rankingButton.onclick = () => window.location.href = 'ranking.html';
  if (replayButton) replayButton.onclick = () => window.location.reload();
  
  // Mostrar el modal
  statsModal.style.display = 'flex';
  console.log("Modal de estadísticas visible:", statsModal.style.display);
}