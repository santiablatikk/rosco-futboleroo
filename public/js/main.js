/* js/main.js */

// Variables CSS para el juego
document.documentElement.style.setProperty('--white', '#ffffff');
document.documentElement.style.setProperty('--timer-start', '#4CAF50');
document.documentElement.style.setProperty('--timer-end', '#2E7D32');
document.documentElement.style.setProperty('--btn-bg', '#2196F3');
document.documentElement.style.setProperty('--btn-hover-bg', '#1976D2');
document.documentElement.style.setProperty('--help-btn-bg', '#9C27B0');
document.documentElement.style.setProperty('--help-btn-hover', '#7B1FA2');
document.documentElement.style.setProperty('--correct-color', '#4CAF50');
document.documentElement.style.setProperty('--wrong-color', '#F44336');
document.documentElement.style.setProperty('--active-glow', '0 0 15px 4px rgba(33, 150, 243, 0.7)');

// Objeto de traducciones para i18n
const translations = {
  es: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Ingresa tu nombre para comenzar:",
    loginButton: "INGRESAR",
    rulesTitle: "Reglas del Juego",
    ruleError: "Máximo de Errores: Hasta 2 errores (al tercer error pierdes).",
    ruleHelp: "HELP: Tienes 2 oportunidades para obtener pista (primeras 3 letras).",
    ruleIncomplete: "Respuesta Incompleta: Puedes enviar respuestas incompletas hasta 2 veces.",
    ruleTimeLabel: "Tiempo:",
    ruleTimeValue: "Fácil: 300'' / Normal: 240'' / Difícil: 200''",
    ruleSpelling: "Ortografía: Se toleran errores mínimos.",
    promoMsg: "¡Más de 1000 preguntas para jugar sin parar!",
    difficultyLabel: "Dificultad:",
    difficultyHard: "Difícil",
    difficultyNormal: "Normal",
    difficultyEasy: "Fácil",
    startGameButton: "INICIAR JUEGO",
    gameTitle: "PASALA CHÉ",
    soundOn: "🔊",
    soundOff: "🔇",
    timer: "Tiempo:",
    questionPlaceholder: 'Presiona "Iniciar Juego" para comenzar',
    helpBtn: "HELP",
    passBtn: "Pasala Ché",
    checkBtn: "Comprobar",
    nav_profile: "Ver Perfil",
    share_button: "Compartir",
    selectLanguage: "Selecciona Idioma:",
  },
  en: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Enter your name to start:",
    loginButton: "ENTER",
    rulesTitle: "Game Rules",
    ruleError: "Maximum Mistakes: Up to 2 mistakes (3rd mistake loses).",
    ruleHelp: "HELP: You have 2 chances to get a hint (first 3 letters).",
    ruleIncomplete: "Incomplete Answer: You can submit incomplete answers up to 2 times.",
    ruleTimeLabel: "Time:",
    ruleTimeValue: "Easy: 300'' / Normal: 240'' / Hard: 200''",
    ruleSpelling: "Spelling: Minor mistakes are tolerated.",
    promoMsg: "Over 1000 random questions to play non-stop!",
    difficultyLabel: "Difficulty:",
    difficultyHard: "Hard",
    difficultyNormal: "Normal",
    difficultyEasy: "Easy",
    startGameButton: "START GAME",
    gameTitle: "PASALA CHÉ",
    soundOn: "🔊",
    soundOff: "🔇",
    timer: "Time:",
    questionPlaceholder: 'Press "Start Game" to begin',
    helpBtn: "HELP",
    passBtn: "Pass",
    checkBtn: "Check",
    nav_profile: "View Profile",
    share_button: "Share",
    selectLanguage: "Select Language:",
  },
};

let currentLang = localStorage.getItem("lang") || "es";
let username = ""; // Se asignará al iniciar la partida
let selectedDifficulty = 'facil';
let timeLimit = 300; // valor por defecto (fácil)
let timer;
let timeRemaining;
let currentLetterIndex = 0;
let currentQuestionIndex = 0;
let helpCount = 2; // número de ayudas disponibles
let errorCount = 0; // contador de errores
let letterStatus = {}; // estado de cada letra (correcto, incorrecto, pendiente, pasado)
let gameQuestions = []; // preguntas del juego
let gameStarted = false;
let letterElements = {}; // referencia a los elementos DOM de las letras
const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang] && translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

// Initialize when the DOM is completely loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Aplicación iniciada');
  
  // Initialize UI
  initializeScreens();
  
  // Set up event handlers
  setupEventHandlers();
  
  // Check cookie consent
  setupCookieConsent();
});

// Initialize screens
function initializeScreens() {
  // Show login screen and hide the others
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('start-container').classList.add('hidden');
  document.getElementById('game-screen').classList.add('hidden');
}

// Set up event handlers
function setupEventHandlers() {
  // Event for login form submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginFormSubmit);
  }
  
  // Make sure login button triggers form submission
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', function(e) {
      // If it's not a submit button, manually trigger form submission
      if (loginBtn.type !== 'submit') {
        e.preventDefault();
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
          loginForm.dispatchEvent(new Event('submit'));
        }
      }
    });
  }
  
  // Event for game start button
  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', handleStartGameClick);
  }
  
  // Events for difficulty buttons
  const difficultyButtons = document.querySelectorAll('.difficulty-btn');
  difficultyButtons.forEach(btn => {
    btn.addEventListener('click', handleDifficultySelection);
  });
  
  // Events for game buttons
  const helpBtn = document.getElementById('help-btn');
  const pasalaBtn = document.getElementById('pasala-btn');
  const checkBtn = document.getElementById('check-btn');
  
  if (helpBtn) helpBtn.addEventListener('click', handleHelp);
  if (pasalaBtn) pasalaBtn.addEventListener('click', handlePasala);
  if (checkBtn) checkBtn.addEventListener('click', handleCheck);
  
  // Event for answer input (when pressing Enter)
  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        handleCheck();
      }
    });
  }
  
  // Events for modal close buttons
  const victoryCloseBtn = document.getElementById('victory-close-btn');
  const defeatCloseBtn = document.getElementById('defeat-close-btn');
  const statsCloseBtn = document.getElementById('stats-close-btn');
  
  if (victoryCloseBtn) victoryCloseBtn.addEventListener('click', closeVictoryModal);
  if (defeatCloseBtn) defeatCloseBtn.addEventListener('click', closeDefeatModal);
  if (statsCloseBtn) statsCloseBtn.addEventListener('click', closeStatsModal);
}

// Handle login form submission
function handleLoginFormSubmit(e) {
      e.preventDefault(); 
  
  const usernameInput = document.getElementById('username');
  if (usernameInput && usernameInput.value.trim() !== '') {
    username = usernameInput.value.trim();
    
    // Save username to session storage
    sessionStorage.setItem('username', username);
    
    console.log(`Usuario registrado: ${username}`);
    
    // Transition to game start screen
    transitionScreens('login-screen', 'start-container');
    
    // Update username in welcome message
    const welcomeUsername = document.getElementById('welcome-username');
    if (welcomeUsername) {
      welcomeUsername.textContent = username;
    }
    
    // Show success message
    showToast('¡Bienvenido, ' + username + '!', 'success');
  } else {
    showToast('Por favor, ingresa un nombre de usuario válido', 'error');
    
    // Animate input field to indicate error
    if (usernameInput) {
      usernameInput.classList.add('input-error');
      usernameInput.focus();
      
      setTimeout(() => {
        usernameInput.classList.remove('input-error');
      }, 1000);
    }
  }
}

// Handle click on start game button
function handleStartGameClick() {
  // Retrieve username if not present
  if (!username && sessionStorage.getItem('username')) {
    username = sessionStorage.getItem('username');
  }
  
  if (!username) {
    showToast('Por favor, ingresa tu nombre antes de jugar', 'error');
    transitionScreens('start-container', 'login-screen');
    return;
  }
  
  // Guardar la dificultad seleccionada en sessionStorage
  sessionStorage.setItem('selectedDifficulty', selectedDifficulty);
  
  // Mostrar mensaje de inicio
  showToast('¡El juego ha comenzado!', 'success');
  
  // Redireccionar a game.html
  setTimeout(() => {
    window.location.href = 'game.html';
  }, 300); // Pequeño retraso para que se vea el mensaje
}

// Transition between screens with animation
function transitionScreens(fromScreenId, toScreenId) {
  const fromScreen = document.getElementById(fromScreenId);
  const toScreen = document.getElementById(toScreenId);
  
  if (fromScreen && toScreen) {
    // Apply exit animation to current screen
    fromScreen.style.opacity = '1';
    fromScreen.style.transform = 'scale(1)';
    
    // Animate out
    setTimeout(() => {
      fromScreen.style.opacity = '0';
      fromScreen.style.transform = 'scale(0.95)';
    }, 50);
    
    // Hide after animation completes
    setTimeout(() => {
      fromScreen.classList.add('hidden');
      
      // Prepare next screen for entrance
      toScreen.classList.remove('hidden');
      toScreen.style.opacity = '0';
      toScreen.style.transform = 'scale(1.05)';
      
      // Force reflow
      void toScreen.offsetWidth;
      
      // Animate in
      setTimeout(() => {
        toScreen.style.opacity = '1';
        toScreen.style.transform = 'scale(1)';
      }, 50);
    }, 300);
  }
}

function initUI() {
  console.log('UI inicializada');
  
  // Aplicar traducciones según el idioma seleccionado
  applyTranslations();
  
  // Animaciones para los elementos al cargar la página
  animateElements();
}

function animateElements() {
  // Agregar clase para animar elementos con un pequeño retraso
  setTimeout(() => {
    const elements = document.querySelectorAll('.login-form-container, .rules-card, .title-text');
    
    elements.forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 200 + (index * 180));
    });
    
    // Agregar animación especial para el título
    const title = document.querySelector('.title-text');
    if (title) {
      setTimeout(() => {
        title.style.opacity = '1';
        title.style.transform = 'translateY(0) scale(1.05)';
        
        setTimeout(() => {
          title.style.transform = 'translateY(0) scale(1)';
        }, 200);
      }, 300);
    }
  }, 100);
}

function setupCookieConsent() {
  // Comprobar si ya se dio consentimiento
  if (localStorage.getItem('cookiesAccepted')) {
    document.getElementById('cookieConsent').style.display = 'none';
  }
}

// Funciones para el banner de cookies
function acceptCookies() {
  localStorage.setItem('cookiesAccepted', 'true');
  document.getElementById('cookieConsent').style.display = 'none';
}

function declineCookies() {
  localStorage.setItem('cookiesAccepted', 'false');
  document.getElementById('cookieConsent').style.display = 'none';
}

// Maneja la selección de dificultad
function handleDifficultySelection() {
  // Quitar la clase 'selected' de todos los botones
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Añadir la clase 'selected' al botón clickeado
  this.classList.add('selected');
  
  // Guardar la dificultad seleccionada
  selectedDifficulty = this.getAttribute('data-difficulty');
  console.log(`Dificultad seleccionada: ${selectedDifficulty}`);
  
  // Establecer el tiempo según la dificultad
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
  
  // Efecto visual para confirmar la selección
  this.classList.add('pulse-animation');
    setTimeout(() => {
    this.classList.remove('pulse-animation');
  }, 600);
}

// Configurar el juego
function setupGame(difficulty) {
  // Actualizar el nombre del jugador
  document.getElementById('player-name-display').textContent = username;
  
  // Resetear contadores
  errorCount = 0;
  helpCount = 2;
  
  // Limpiar puntos de error
  document.querySelectorAll('.error-dot').forEach(dot => {
    dot.classList.remove('error');
  });
  
  // Establecer el tiempo según la dificultad
  switch (difficulty) {
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
  
  // Inicializar tiempo restante
  timeRemaining = timeLimit;
  updateTimerDisplay();
  
  // Cargar preguntas
  loadQuestions();
  
  // Generar el rosco
  generateRosco();
  
  // Mostrar la primera pregunta
  showQuestion(0);
  
  // Iniciar el temporizador
  startTimer();
  
  // Marcar el juego como iniciado
  gameStarted = true;
  
  // Limpiar el campo de respuesta
  document.getElementById('answer-input').value = '';
  document.getElementById('answer-input').focus();
  
  // Limpiar mensaje de juego
  document.getElementById('game-message').textContent = '';
  document.getElementById('game-message').className = 'game-message';
}

// Generar el rosco de letras
function generateRosco() {
  const roscoContainer = document.getElementById('rosco');
  
  // Limpiar el contenedor
  roscoContainer.innerHTML = '';
  
  // Agregar el centro del rosco primero
  const roscoCenter = document.createElement('div');
  roscoCenter.className = 'rosco-center';
  
  const roscoTitle = document.createElement('div');
  roscoTitle.className = 'rosco-title';
  roscoTitle.textContent = 'Pasapalabra';
  
  const questionContainer = document.createElement('div');
  questionContainer.className = 'current-question-container';
  
  const questionText = document.createElement('p');
  questionText.className = 'current-question';
  questionText.id = 'current-question';
  questionText.textContent = 'Presiona "Iniciar Juego" para comenzar';
  
  questionContainer.appendChild(questionText);
  roscoCenter.appendChild(roscoTitle);
  roscoCenter.appendChild(questionContainer);
  roscoContainer.appendChild(roscoCenter);
  
  // Crear los elementos para cada letra
  const letters = ALPHABET.split('');
  const numLetters = letters.length;
  const radius = 230; // Radio del círculo
  
  letters.forEach((letter, index) => {
    // Calcular posición en el círculo
    const angle = ((index / numLetters) * 2 * Math.PI) - (Math.PI / 2); // Ángulo en radianes, empezando desde arriba
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    // Crear elemento para la letra
    const letterElement = document.createElement('div');
    letterElement.className = 'rosco-letter';
    letterElement.id = `letter-${letter}`;
    letterElement.textContent = letter;
    
    // Posicionar la letra
    letterElement.style.left = `calc(50% + ${x}px)`;
    letterElement.style.top = `calc(50% + ${y}px)`;
    
    // Guardar referencia al elemento
    letterElements[letter] = letterElement;
    
    // Añadir al contenedor
    roscoContainer.appendChild(letterElement);
  });
  
  // Marcar la primera letra como activa
  if (letterElements['A']) {
    letterElements['A'].classList.add('active');
  }
}

// Cargar preguntas desde questions.json
function loadQuestions() {
  // Resetear arreglo de preguntas
  gameQuestions = [];
  
  // Función para cargar preguntas desde el endpoint del servidor
  fetch('/questions')
    .then(response => {
      if (!response.ok) {
        throw new Error('No se pudo cargar las preguntas desde el servidor');
      }
      return response.json();
    })
    .then(data => {
      // Procesar los datos recibidos del servidor
      if (data && data.rosco_futbolero && Array.isArray(data.rosco_futbolero)) {
        data.rosco_futbolero.forEach(pregunta => {
          gameQuestions.push({
            letter: pregunta.letra,
            question: `Comienza con ${pregunta.letra}: ${pregunta.pregunta}`,
            answer: pregunta.respuesta,
            status: 'pending'
          });
        });
      } else {
        throw new Error('Formato de respuesta inválido');
      }
      
      // Si falta alguna letra, agregar preguntas predeterminadas
      ALPHABET.split('').forEach(letter => {
        if (!gameQuestions.some(q => q.letter === letter)) {
          // Pregunta por defecto para esta letra
          gameQuestions.push({
            letter: letter,
            question: `Comienza con ${letter}: Pregunta por defecto para ${letter}`,
            answer: `Respuesta${letter}`,
            status: 'pending'
          });
        }
      });
      
      // Ordenar preguntas por letra
      gameQuestions.sort((a, b) => {
        return ALPHABET.indexOf(a.letter) - ALPHABET.indexOf(b.letter);
      });
      
      // Inicializar estado de las letras
      ALPHABET.split('').forEach(letter => {
        letterStatus[letter] = 'pending';
      });
      
      console.log(`Se han cargado ${gameQuestions.length} preguntas`);
    })
    .catch(error => {
      console.error('Error al cargar las preguntas:', error);
      
      // En caso de error, usar preguntas por defecto (las que ya estaban en el código)
      ALPHABET.split('').forEach(letter => {
        gameQuestions.push({
          letter: letter,
          question: `Comienza con ${letter}: Pregunta por defecto para ${letter}`,
          answer: `Respuesta${letter}`,
          status: 'pending'
        });
        
        letterStatus[letter] = 'pending';
      });
    });
}

// Mostrar pregunta actual con animación suave
function showQuestion(index) {
  if (index >= 0 && index < gameQuestions.length) {
    currentQuestionIndex = index;
    currentLetterIndex = ALPHABET.indexOf(gameQuestions[index].letter);
    
    const currentLetterElement = document.getElementById('current-letter');
    const currentQuestionElement = document.getElementById('current-question');
    
    // Fade out animation
    if (currentLetterElement) {
      currentLetterElement.style.opacity = '0';
      currentLetterElement.style.transform = 'scale(0.8)';
    }
    
    if (currentQuestionElement) {
      currentQuestionElement.style.opacity = '0';
      currentQuestionElement.style.transform = 'translateY(-10px)';
    }
    
    // Actualizar el título del rosco
    const roscoTitle = document.querySelector('.rosco-title');
    if (roscoTitle) {
      roscoTitle.style.opacity = '0';
      roscoTitle.style.transform = 'scale(0.9)';
    }
    
    // Wait for fade out and update content
    setTimeout(() => {
      // Actualizar el elemento de la letra actual
      if (currentLetterElement) {
        currentLetterElement.textContent = gameQuestions[index].letter;
      }
      
      // Actualizar el texto de la pregunta
      if (currentQuestionElement) {
        currentQuestionElement.textContent = gameQuestions[index].question;
      }
      
      // Cambiar el título por la letra actual
      if (roscoTitle) {
        roscoTitle.textContent = gameQuestions[index].letter;
      }
      
      // Marcar la letra como activa en el rosco
      Object.keys(letterElements).forEach(letter => {
        letterElements[letter].classList.remove('active');
      });
      
      // Aplicar la clase 'active' a la letra actual
      letterElements[gameQuestions[index].letter].classList.add('active');
      
      // Fade in animation
      setTimeout(() => {
        if (currentLetterElement) {
          currentLetterElement.style.opacity = '1';
          currentLetterElement.style.transform = 'scale(1)';
        }
        
        if (currentQuestionElement) {
          currentQuestionElement.style.opacity = '1';
          currentQuestionElement.style.transform = 'translateY(0)';
        }
        
        if (roscoTitle) {
          roscoTitle.style.opacity = '1';
          roscoTitle.style.transform = 'scale(1)';
        }
      }, 50);
    }, 200);
    
    // Clear answer field and set focus
    const answerInput = document.getElementById('answer-input');
    if (answerInput) {
      answerInput.value = '';
      setTimeout(() => {
        answerInput.focus();
      }, 300);
    }
  }
}

// Iniciar el temporizador
function startTimer() {
  // Limpiar temporizador anterior si existe
  if (timer) {
    clearInterval(timer);
  }
  
  updateTimerDisplay();
  
  // Actualizar cada segundo
  timer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    // Verificar si se acabó el tiempo
    if (timeRemaining <= 0) {
      endGame(false, 'Se acabó el tiempo');
    }
  }, 1000);
}

// Actualizar la visualización del temporizador
function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display');
  const timerProgress = document.getElementById('timer-progress');
  const timerContainer = document.querySelector('.timer');
  
  if (timerDisplay && timerProgress) {
    // Mostrar el tiempo restante
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Actualizar la barra de progreso
    const percentage = (timeRemaining / timeLimit) * 100;
    timerProgress.style.width = `${percentage}%`;
    
    // Cambiar color según el tiempo restante
    if (timeRemaining <= timeLimit * 0.25) {
      timerContainer.className = 'timer danger';
    } else if (timeRemaining <= timeLimit * 0.5) {
      timerContainer.className = 'timer warning';
    } else {
      timerContainer.className = 'timer';
    }
  }
}

// Manejar el botón de ayuda
function handleHelp() {
  if (!gameStarted) return;
  
  if (helpCount > 0) {
    // Mostrar las primeras letras de la respuesta
    const answer = gameQuestions[currentQuestionIndex].answer;
    const hint = answer.substring(0, 3) + '...';
    
    showMessage(`Pista: ${hint}`, 'warning');
    
    // Reducir el número de ayudas disponibles
    helpCount--;
    
    // Deshabilitar el botón si no quedan ayudas
    if (helpCount === 0) {
      document.getElementById('help-btn').classList.add('disabled');
    }
  } else {
    showMessage('No te quedan ayudas disponibles', 'error');
  }
}

// Manejar el botón "Pasala"
function handlePasala() {
  if (!gameStarted) return;
  
  // Marcar la letra actual como 'pasada'
  const currentLetter = gameQuestions[currentQuestionIndex].letter;
  letterStatus[currentLetter] = 'passed';
  gameQuestions[currentQuestionIndex].status = 'passed';
  
  // Actualizar la visualización usando la nueva función
  updateLetterState(currentLetter, 'passed');
  
  // Mostrar mensaje
  showMessage('Pregunta pasada', 'warning');
  
  // Pasar a la siguiente pregunta después de la animación
  setTimeout(() => {
    moveToNextQuestion();
  }, 1000);
}

// Manejar el botón de verificar respuesta
function handleCheck() {
  if (!gameStarted) return;
  
  const answerInput = document.getElementById('answer-input');
  const userAnswer = answerInput.value.trim();
  
  if (userAnswer === '') {
    showMessage('Por favor, escribe tu respuesta', 'warning');
      return;
    }
    
  // Obtener la pregunta actual
  const currentQuestion = gameQuestions[currentQuestionIndex];
  const correctAnswer = currentQuestion.answer.toLowerCase();
  
  // Verificar la respuesta (usando una comparación simple)
  const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
  
  if (isCorrect) {
    // Respuesta correcta
    letterStatus[currentQuestion.letter] = 'correct';
    currentQuestion.status = 'correct';
    
    // Actualizar visualización usando la nueva función
    updateLetterState(currentQuestion.letter, 'correct');
    
    showMessage('¡Correcto!', 'success');
    
    // Mover a la siguiente pregunta después de la animación
    setTimeout(() => {
      moveToNextQuestion();
    }, 1000);
        } else {
    // Respuesta incorrecta
    letterStatus[currentQuestion.letter] = 'incorrect';
    currentQuestion.status = 'incorrect';
    
    // Incrementar contador de errores
    errorCount++;
    
    // Actualizar visualización usando la nueva función
    updateLetterState(currentQuestion.letter, 'incorrect');
    
    // Actualizar puntos de error
    document.getElementById(`error-${errorCount}`).classList.add('error');
    
    // Mostrar mensaje con la respuesta correcta
    showMessage(`Incorrecto. La respuesta correcta era: ${correctAnswer}`, 'error');
    
    // Verificar si ha llegado al máximo de errores
    if (errorCount >= 3) {
      endGame(false, `Has alcanzado el límite de 3 errores.`);
      return;
    }
    
    // Mover a la siguiente pregunta después de la animación
    setTimeout(() => {
      moveToNextQuestion();
    }, 1500);
  }
  
  // Limpiar el campo de entrada
  answerInput.value = '';
  answerInput.focus();
}

// Mover a la siguiente pregunta pendiente
function moveToNextQuestion() {
  // Encontrar la siguiente pregunta pendiente
  let nextIndex = -1;
  let startIndex = (currentQuestionIndex + 1) % gameQuestions.length;
  
  for (let i = 0; i < gameQuestions.length; i++) {
    const checkIndex = (startIndex + i) % gameQuestions.length;
    if (gameQuestions[checkIndex].status === 'pending') {
      nextIndex = checkIndex;
      break;
    }
  }
  
  if (nextIndex !== -1) {
    // Hay preguntas pendientes
    showQuestion(nextIndex);
      } else {
    // No hay más preguntas pendientes, verificar si ganó
    const hasIncorrectAnswers = Object.values(letterStatus).includes('incorrect');
    
    if (hasIncorrectAnswers) {
      endGame(false, 'Has completado el rosco, pero con errores');
    } else {
      endGame(true, '¡Has completado el rosco correctamente!');
    }
  }
}

// Finalizar el juego
function endGame(isVictory, message) {
  // Detener el temporizador
  clearInterval(timer);
  
  // Marcar el juego como terminado
  gameStarted = false;
  
  // Mostrar mensaje
  showMessage(message, isVictory ? 'success' : 'error');
  
  // Calcular estadísticas
  const stats = calculateStats();
  
  // Actualizar modal de estadísticas
  document.getElementById('stats-answered').textContent = `${stats.answered}/${gameQuestions.length}`;
  document.getElementById('stats-correct').textContent = stats.correct;
  document.getElementById('stats-incorrect').textContent = stats.incorrect;
  document.getElementById('stats-time').textContent = `${stats.timeRemaining}s`;
  
  // Mostrar modal correspondiente
  if (isVictory) {
    showVictoryModal();
  } else {
    showDefeatModal();
  }
}

// Calcular estadísticas del juego
function calculateStats() {
  const answered = gameQuestions.filter(q => q.status !== 'pending').length;
  const correct = gameQuestions.filter(q => q.status === 'correct').length;
  const incorrect = gameQuestions.filter(q => q.status === 'incorrect').length;
  
  return {
    answered,
    correct,
    incorrect,
    timeRemaining
  };
}

// Mostrar mensaje en el juego
function showMessage(text, type) {
  const messageElement = document.getElementById('game-message');
  
  if (messageElement) {
    messageElement.textContent = text;
    messageElement.className = 'game-message';
    messageElement.classList.add(type);
  }
}

// Mostrar toast notification
function showToast(message, type) {
  // Crear elemento toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        </div>
    <div class="toast-message">${message}</div>
  `;
  
  // Añadir al DOM
    document.body.appendChild(toast);
  
  // Mostrar con animación
      setTimeout(() => {
    toast.classList.add('show');
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      
      // Eliminar del DOM después de la animación
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 400);
    }, 3000);
  }, 100);
}

// Funciones para modales
function showVictoryModal() {
  const modal = document.getElementById('victory-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function showDefeatModal() {
  const modal = document.getElementById('defeat-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function showStatsModal() {
  const modal = document.getElementById('stats-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeVictoryModal() {
  const modal = document.getElementById('victory-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  showStatsModal();
}

function closeDefeatModal() {
  const modal = document.getElementById('defeat-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  showStatsModal();
}

function closeStatsModal() {
  const modal = document.getElementById('stats-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  
  // Volver a la pantalla de inicio
  transitionScreens('game-screen', 'start-container');
}

// Apply state to letter in the rosco
function updateLetterState(letterKey, state) {
  const letter = document.getElementById(`letter-${letterKey}`);
  if (!letter) return;
  
  // Remove all existing state classes
  letter.classList.remove('active', 'correct', 'incorrect', 'passed');
  
  // Add animation class based on state
  if (state === 'correct') {
    letter.classList.add('correct-animation');
    // Play correct sound
    playSound('correct');
    
    // Crear un efecto de brillo temporal
    const glowEffect = document.createElement('div');
    glowEffect.className = 'letter-glow correct-glow';
    letter.appendChild(glowEffect);
    
    setTimeout(() => {
      letter.classList.remove('correct-animation');
      letter.classList.add('correct');
      
      // Remover el efecto de brillo después de un tiempo
      setTimeout(() => {
        if (glowEffect && glowEffect.parentNode === letter) {
          letter.removeChild(glowEffect);
        }
      }, 500);
    }, 1000);
  } else if (state === 'incorrect') {
    letter.classList.add('incorrect-animation');
    // Play incorrect sound
    playSound('incorrect');
    
    // Crear un efecto de vibración/sacudida adicional
    letter.style.animationIterationCount = '3';
    
    setTimeout(() => {
      letter.classList.remove('incorrect-animation');
      letter.classList.add('incorrect');
      letter.style.animationIterationCount = '';
    }, 1000);
  } else if (state === 'passed') {
    letter.classList.add('passed-animation');
    // Play pass sound
    playSound('pass');
    
    // Añadir efecto de movimiento hacia arriba y abajo
    letter.style.transition = 'transform 0.5s ease-in-out';
    
    setTimeout(() => {
      letter.classList.remove('passed-animation');
      letter.classList.add('passed');
      letter.style.transition = '';
    }, 1000);
  } else {
    // Para el estado 'active', añadir un efecto de pulse mejorado
    if (state === 'active') {
      // Asegurar un efecto de transición suave cuando se activa
      letter.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      setTimeout(() => {
        letter.style.transition = '';
      }, 300);
    }
    
    letter.classList.add(state);
  }
}

// Play sound effects
function playSound(type) {
  const sounds = {
    correct: 'sounds/correct.mp3',
    incorrect: 'sounds/incorrect.mp3',
    pass: 'sounds/pass.mp3',
    victory: 'sounds/victory.mp3',
    defeat: 'sounds/defeat.mp3'
  };
  
  const soundPath = sounds[type];
  if (soundPath) {
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.3;
      audio.play().catch(e => {
        console.log(`Error reproduciendo sonido ${type}: ${e.message}`);
        // No se bloquea la ejecución si hay error de audio
      });
    } catch (error) {
      console.log(`Error creando objeto de audio para ${type}: ${error.message}`);
    }
  } else {
    console.log(`Tipo de sonido no encontrado: ${type}`);
  }
}