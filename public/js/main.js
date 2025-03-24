// main.js

// Variables globales
let currentLang = localStorage.getItem("lang") || "es";
let username = "";
let selectedDifficulty = "facil";

// Traducciones
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
    ruleAnswers: "Respuestas: Salvo que se solicite \"Apellido de…\" o \"Nombre completo de…\", la respuesta es NOMBRE Y APELLIDO.",
    promoMsg: "¡Más de 1000 preguntas para jugar sin parar!",
    difficultyLabel: "Dificultad:",
    difficultyHard: "Difícil",
    difficultyNormal: "Normal",
    difficultyEasy: "Fácil",
    startGameButton: "INICIAR JUEGO",
    soundOn: "🔊",
    soundOff: "🔇"
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
    ruleAnswers: "Answers: If the question doesn't specify \"last name...\" or \"full name...\", the answer is first and last name.",
    promoMsg: "Over 1000 random questions to play non-stop!",
    difficultyLabel: "Difficulty:",
    difficultyHard: "Hard",
    difficultyNormal: "Normal",
    difficultyEasy: "Easy",
    startGameButton: "START GAME",
    soundOn: "🔊",
    soundOff: "🔇"
  }
};

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

function transitionScreens(fromScreenId, toScreenId) {
  const fromScreen = document.getElementById(fromScreenId);
  const toScreen = document.getElementById(toScreenId);
  if (fromScreen && toScreen) {
    fromScreen.style.opacity = "1";
    fromScreen.style.transform = "scale(1)";
    setTimeout(() => {
      fromScreen.style.opacity = "0";
      fromScreen.style.transform = "scale(0.95)";
    }, 50);
    setTimeout(() => {
      fromScreen.classList.add("hidden");
      toScreen.classList.remove("hidden");
      toScreen.style.opacity = "0";
      toScreen.style.transform = "scale(1.05)";
      void toScreen.offsetWidth;
      setTimeout(() => {
        toScreen.style.opacity = "1";
        toScreen.style.transform = "scale(1)";
      }, 50);
    }, 300);
  }
}

function handleLoginFormSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username");
  if (usernameInput && usernameInput.value.trim() !== "") {
    username = usernameInput.value.trim();
    sessionStorage.setItem("username", username);
    console.log(`Usuario registrado: ${username}`);
    transitionScreens("login-screen", "start-container");
    const welcomeUsername = document.getElementById("welcome-username");
    if (welcomeUsername) welcomeUsername.textContent = username;
    showToast(`¡Bienvenido, ${username}!`, "success");
  } else {
    showToast("Por favor, ingresa un nombre de usuario válido", "error");
    usernameInput.classList.add("input-error");
    usernameInput.focus();
    setTimeout(() => {
      usernameInput.classList.remove("input-error");
    }, 1000);
  }
}

function initUI() {
  console.log("UI inicializada");
  applyTranslations();
  animateElements();
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginFormSubmit);
  }
  const startGameBtn = document.getElementById("start-game-btn");
  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      if (!username && sessionStorage.getItem("username")) {
        username = sessionStorage.getItem("username");
      }
      if (!username) {
        showToast("Por favor, ingresa tu nombre antes de jugar", "error");
        transitionScreens("start-container", "login-screen");
        return;
      }
      sessionStorage.setItem("selectedDifficulty", selectedDifficulty);
      showToast("¡El juego ha comenzado!", "success");
      setTimeout(() => {
        window.location.href = "game.html";
      }, 300);
    });
  }
  const difficultyButtons = document.querySelectorAll(".difficulty-btn");
  difficultyButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      difficultyButtons.forEach((b) => b.classList.remove("selected"));
      this.classList.add("selected");
      selectedDifficulty = this.getAttribute("data-difficulty");
      console.log(`Dificultad seleccionada: ${selectedDifficulty}`);
      this.classList.add("pulse-animation");
      setTimeout(() => {
        this.classList.remove("pulse-animation");
      }, 600);
    });
  });
  setupCookieConsent();
  animateElements();
}

function animateElements() {
  setTimeout(() => {
    const elements = document.querySelectorAll('.login-form-container, .rules-card, .title-text');
    elements.forEach((el, index) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(30px)";
      el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 200 + (index * 180));
    });
  }, 100);
}

function setupCookieConsent() {
  if (localStorage.getItem("cookiesAccepted")) {
    document.getElementById("cookieConsent").style.display = "none";
  }
}

function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
    </div>
    <div class="toast-message">${message}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 400);
    }, 3000);
  }, 100);
}

document.addEventListener("DOMContentLoaded", initUI);
