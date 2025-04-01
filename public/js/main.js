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
    loginTitle: "PASALA CHE",
    loginPrompt: "Ingresa tu nombre para comenzar:",
    loginButton: "INGRESAR",
    rulesTitle: "Reglas del Juego",
    ruleError: "Máximo de Errores: Hasta 2 errores (al tercer error pierdes).",
    ruleHelp: "HELP: Tienes 2 oportunidades para obtener pista (primeras 3 letras).",
    ruleIncomplete: "Respuesta Incompleta: Puedes enviar respuestas incompletas hasta 2 veces.",
    ruleTimeLabel: "Tiempo:",
    ruleTimeValue: "Fácil: 300'' / Normal: 240'' / Difícil: 200''",
    ruleSpelling: "Ortografía: Se toleran errores mínimos.",
    ruleAnswers: "Respuestas: Si la pregunta no dice \"apellido...\" o \"nombre completo...\", la respuesta es nombre y apellido.",
    promoMsg: "¡Más de 1000 preguntas para jugar sin parar!",
    difficultyLabel: "Dificultad:",
    difficultyHard: "Difícil",
    difficultyNormal: "Normal",
    difficultyEasy: "Fácil",
    startGameButton: "INICIAR JUEGO",
    gameTitle: "PASALA CHE",
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
    loginTitle: "PASALA CHE",
    loginPrompt: "Enter your name to start:",
    loginButton: "ENTER",
    rulesTitle: "Game Rules",
    ruleError: "Maximum Mistakes: Up to 2 mistakes (3rd mistake loses).",
    ruleHelp: "HELP: You have 2 chances to get a hint (first 3 letters).",
    ruleIncomplete: "Incomplete Answer: You can submit incomplete answers up to 2 times.",
    ruleTimeLabel: "Time:",
    ruleTimeValue: "Easy: 300'' / Normal: 240'' / Hard: 200''",
    ruleSpelling: "Spelling: Minor mistakes are tolerated.",
    ruleAnswers: "Answers: If the question doesn't specify \"last name...\" or \"full name...\", the answer should be first and last name.",
    promoMsg: "Over 1000 random questions to play non-stop!",
    difficultyLabel: "Difficulty:",
    difficultyHard: "Hard",
    difficultyNormal: "Normal",
    difficultyEasy: "Easy",
    startGameButton: "START GAME",
    gameTitle: "PASALA CHE",
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

// Variables globales para el estado del juego
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

/**
 * Aplica las traducciones según el idioma seleccionado
 */
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang] && translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });
}

/**
 * Establece el idioma de la aplicación
 * @param {string} lang - Código del idioma (es, en)
 */
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

/**
 * Inicialización cuando el DOM está completamente cargado
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Aplicación iniciada');
  
  // Configurar la página según la ruta
  setupPageBasedOnPath();
  
  // Configurar eventos
  setupEventHandlers();
  
  // Verificar consentimiento de cookies
  setupCookieConsent();
  
  // Configure particles
  if (document.getElementById('particles-js')) {
    particlesJS('particles-js', particlesConfig);
  }
  
  // Game start button
  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', function() {
      window.location.href = 'game.html';
    });
  }
});

/**
 * Configura la página según la ruta actual
 */
function setupPageBasedOnPath() {
  const path = window.location.pathname;
  
  if (path.endsWith('game.html')) {
    console.log('Configurando página de juego');
    
    // Recuperar datos de sesión
    username = sessionStorage.getItem('username') || '';
    selectedDifficulty = sessionStorage.getItem('selectedDifficulty') || 'facil';
    
    // Verificar si el usuario está autenticado
    if (!username) {
      console.log('Usuario no autenticado, redirigiendo a home');
      window.location.href = 'index.html';
      return;
    }
    
    // Actualizar UI con datos del usuario
    updateUserInfo();
    
  } else if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
    console.log('Configurando página principal');
    
    // Recuperar nombre de usuario si existe en sessionStorage
    if (sessionStorage.getItem('username')) {
      username = sessionStorage.getItem('username');
      console.log('Usuario recuperado:', username);
      
      // Mostrar directamente la pantalla de opciones si ya hay un usuario
      showGameOptions();
    } else {
      // Mostrar pantalla de login
      showLoginScreen();
    }
    
    // Recuperar dificultad si existe
    if (sessionStorage.getItem('selectedDifficulty')) {
      selectedDifficulty = sessionStorage.getItem('selectedDifficulty');
      console.log('Dificultad recuperada:', selectedDifficulty);
      
      // Actualizar UI con la dificultad seleccionada
      updateSelectedDifficulty();
    }
  }
}

/**
 * Muestra la pantalla de login
 */
function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const gameOptionsScreen = document.getElementById('game-options-screen');
  
  if (loginScreen && gameOptionsScreen) {
    loginScreen.classList.add('active');
    gameOptionsScreen.classList.remove('active');
  }
}

/**
 * Muestra la pantalla de opciones de juego
 */
function showGameOptions() {
  const loginScreen = document.getElementById('login-screen');
  const gameOptionsScreen = document.getElementById('game-options-screen');
  
  if (loginScreen && gameOptionsScreen) {
    loginScreen.classList.remove('active');
    gameOptionsScreen.classList.add('active');
    
    // Actualizar UI con el nombre del usuario
    updateUserInfo();
  }
}

/**
 * Actualiza la información del usuario en la UI
 */
function updateUserInfo() {
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay && username) {
    usernameDisplay.textContent = username;
  }
}

/**
 * Actualiza la UI para resaltar la dificultad seleccionada
 */
function updateSelectedDifficulty() {
  const difficultyOptions = document.querySelectorAll('.difficulty-option');
  
  if (difficultyOptions.length > 0) {
    // Primero quitar selección de todas las opciones
    difficultyOptions.forEach(option => {
      option.classList.remove('selected');
    });
    
    // Seleccionar la opción correspondiente
    const targetOption = document.querySelector(`.difficulty-option[data-difficulty="${selectedDifficulty}"]`);
    if (targetOption) {
      targetOption.classList.add('selected');
    }
  }
}

/**
 * Configura los event handlers para toda la aplicación
 */
function setupEventHandlers() {
  // Formulario de login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginFormSubmit);
  }
  
  // Botón de inicio de juego
  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', handleStartGameClick);
  }
  
  // Opciones de dificultad
  const difficultyOptions = document.querySelectorAll('.difficulty-option');
  if (difficultyOptions.length > 0) {
    difficultyOptions.forEach(option => {
      option.addEventListener('click', handleDifficultySelection);
    });
  }
  
  // Botón de volver atrás
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', handleBackButtonClick);
  }
}

/**
 * Maneja el envío del formulario de login
 * @param {Event} e - Evento de submit
 */
function handleLoginFormSubmit(e) {
      e.preventDefault(); 
  
  const usernameInput = document.getElementById('username-input');
  if (usernameInput && usernameInput.value.trim() !== '') {
    // Guardar nombre de usuario
    username = usernameInput.value.trim();
    sessionStorage.setItem('username', username);
    console.log('Nombre de usuario guardado:', username);
    
    // Mostrar mensaje de bienvenida
    showToast(`¡Bienvenido, ${username}!`, 'success');
    
    // Mostrar pantalla de opciones de juego
    showGameOptions();
  } else {
    // Mostrar mensaje de error
    showToast('Por favor ingresa un nombre de usuario', 'error');
  }
}

/**
 * Maneja la selección de dificultad
 * @param {Event} e - Evento de click
 */
function handleDifficultySelection(e) {
  // Obtener el elemento clickeado
  const selectedOption = e.currentTarget;
  
  // Quitar selección de todas las opciones
  document.querySelectorAll('.difficulty-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // Añadir selección a la opción clickeada
  selectedOption.classList.add('selected');
  
  // Guardar dificultad seleccionada
  selectedDifficulty = selectedOption.getAttribute('data-difficulty');
  sessionStorage.setItem('selectedDifficulty', selectedDifficulty);
  console.log('Dificultad seleccionada:', selectedDifficulty);
  
  // Actualizar tiempo límite según dificultad
  switch (selectedDifficulty) {
    case 'dificil':
      timeLimit = 200;
      break;
    case 'normal':
      timeLimit = 240;
      break;
    case 'facil':
    default:
      timeLimit = 300;
      break;
  }
  
  // Guardar tiempo límite
  sessionStorage.setItem('timeLimit', timeLimit);
  
  // Añadir efecto visual
  selectedOption.classList.add('pulse-animation');
  setTimeout(() => {
    selectedOption.classList.remove('pulse-animation');
  }, 600);
}

/**
 * Maneja el clic en el botón de iniciar juego
 */
function handleStartGameClick() {
  // Verificar si hay un nombre de usuario
  if (!username) {
    showToast('Por favor ingresa tu nombre primero', 'error');
    showLoginScreen();
    return;
  }
  
  // Verificar si se ha seleccionado una dificultad
  if (!selectedDifficulty) {
    selectedDifficulty = 'facil'; // Valor por defecto
    sessionStorage.setItem('selectedDifficulty', selectedDifficulty);
  }
  
  // Mostrar mensaje de inicio
  showToast('¡Comenzando el juego!', 'success');
  
  // Redirigir a la página de juego
  setTimeout(() => {
    window.location.href = 'game.html';
  }, 500);
}

/**
 * Maneja el clic en el botón de volver atrás
 */
function handleBackButtonClick() {
  // Volver a la pantalla de login
  showLoginScreen();
}

/**
 * Configura el banner de consentimiento de cookies
 */
function setupCookieConsent() {
  // Verificar si ya se ha dado consentimiento
  if (localStorage.getItem('cookieConsent')) {
    return;
  }
  
  // Mostrar el banner de cookies
  const cookieConsentBanner = document.getElementById('cookieConsent');
  if (cookieConsentBanner) {
    cookieConsentBanner.style.display = 'block';
    
    // Configurar eventos para los botones
    const acceptButton = cookieConsentBanner.querySelector('.cookie-accept');
    const declineButton = cookieConsentBanner.querySelector('.cookie-decline');
    
    if (acceptButton) {
      acceptButton.addEventListener('click', () => {
        acceptCookies();
        cookieConsentBanner.style.display = 'none';
      });
    }
    
    if (declineButton) {
      declineButton.addEventListener('click', () => {
        declineCookies();
        cookieConsentBanner.style.display = 'none';
      });
    }
  }
}

/**
 * Acepta las cookies
 */
function acceptCookies() {
  localStorage.setItem('cookieConsent', 'accepted');
  showToast('Has aceptado las cookies', 'info');
}

/**
 * Rechaza las cookies
 */
function declineCookies() {
  localStorage.setItem('cookieConsent', 'declined');
  showToast('Has rechazado las cookies', 'info');
}

/**
 * Muestra un toast notification
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de toast (success, error, info)
 */
function showToast(message, type = 'info') {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  
  // Configurar contenido
  const toastIcon = toast.querySelector('.toast-icon');
  const toastMessage = toast.querySelector('.toast-message');
  
  if (toastIcon) {
    // Asignar icono según el tipo
    switch (type) {
      case 'success':
        toastIcon.innerHTML = '✓';
        break;
      case 'error':
        toastIcon.innerHTML = '✗';
        break;
      case 'info':
      default:
        toastIcon.innerHTML = 'ℹ';
      break;
    }
  }
  
  if (toastMessage) {
    toastMessage.textContent = message;
  }
  
  // Configurar clase de tipo
  toast.className = 'toast';
  toast.classList.add(type);
  
  // Mostrar toast
  toast.style.display = 'flex';
      setTimeout(() => {
    toast.classList.add('show');
  }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
    }, 3000);
}

// Exportar funciones que serán utilizadas por otros módulos
window.PASALACHEE = {
  showToast,
  getUsername: () => username,
  getDifficulty: () => selectedDifficulty,
  getTimeLimit: () => timeLimit
};