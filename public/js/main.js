// main.js

// Variables globales
let currentLang = localStorage.getItem("lang") || "es";
let username = sessionStorage.getItem("username") || "";
let selectedDifficulty = "facil";

// Opcional: Traducciones (basadas en atributos "data-i18n")
// Nota: En el HTML actual usas "data-text". Puedes actualizar tus atributos o ampliar la función.
const translations = {
  es: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Ingresa tu nombre para comenzar el juego",
    loginButton: "Ingresar Usuario",
    rulesTitle: "Reglas del Juego",
    startGameButton: "INICIAR JUEGO",
    difficultyTitle: "Selecciona la dificultad",
    promoMsg: "¡Más de 1000 preguntas para jugar sin parar!"
  },
  en: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Enter your name to start the game",
    loginButton: "Enter",
    rulesTitle: "Game Rules",
    startGameButton: "START GAME",
    difficultyTitle: "Select Difficulty",
    promoMsg: "Over 1000 questions for endless play!"
  }
};

function applyTranslations() {
  // Si en el futuro decides usar atributos data-i18n en vez de data-text,
  // recorre los elementos y reemplaza su contenido según el idioma.
  document.querySelectorAll("[data-i18n]").forEach(el => {
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

// Función para transicionar entre pantallas
function transitionScreens(fromScreenId, toScreenId) {
  const fromScreen = document.getElementById(fromScreenId);
  const toScreen = document.getElementById(toScreenId);
  if (fromScreen && toScreen) {
    // Animación de salida de la pantalla actual
    fromScreen.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    fromScreen.style.opacity = "0";
    fromScreen.style.transform = "scale(0.95)";

    setTimeout(() => {
      // Ocultamos la pantalla origen
      fromScreen.classList.add("hidden");

      // Preparamos la pantalla destino: la removemos la clase "hidden" y la dejamos opaca
      toScreen.classList.remove("hidden");
      toScreen.style.opacity = "0";
      toScreen.style.transform = "scale(1.05)";

      // Forzamos reflow para que se apliquen las transiciones
      void toScreen.offsetWidth;

      toScreen.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      toScreen.style.opacity = "1";
      toScreen.style.transform = "scale(1)";
    }, 300);
  }
}

// Maneja el envío del formulario de login
function handleLoginFormSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username");
  if (usernameInput && usernameInput.value.trim() !== "") {
    username = usernameInput.value.trim();
    sessionStorage.setItem("username", username);
    console.log(`Usuario registrado: ${username}`);
    
    // Transición: de la pantalla de login a la de inicio
    transitionScreens("login-screen", "start-container");

    // Actualiza el mensaje de bienvenida en la pantalla de inicio
    const welcomeUsername = document.getElementById("welcome-username");
    if (welcomeUsername) {
      welcomeUsername.textContent = username;
    }
    showToast(`¡Bienvenido, ${username}!`, "success");
  } else {
    showToast("Por favor, ingresa un nombre de usuario válido", "error");
    if (usernameInput) {
      usernameInput.classList.add("input-error");
      usernameInput.focus();
      setTimeout(() => {
        usernameInput.classList.remove("input-error");
      }, 1000);
    }
  }
}

// Inicializa la interfaz y configura eventos
function initUI() {
  // Si planeas usar traducciones en el futuro:
  applyTranslations();
  animateElements();
  setupCookieConsent();

  // Si existe el formulario de login, agrega su evento
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginFormSubmit);
  }

  // Configura el botón de inicio de juego
  const startGameBtn = document.getElementById("start-game-btn");
  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      // Verifica que exista un usuario
      if (!username) {
        username = sessionStorage.getItem("username") || "";
      }
      if (!username) {
        showToast("Por favor, ingresa tu nombre antes de jugar", "error");
        transitionScreens("start-container", "login-screen");
        return;
      }
      
      // Guarda la dificultad seleccionada para usarla en el juego
      sessionStorage.setItem("selectedDifficulty", selectedDifficulty);
      showToast("¡El juego ha comenzado!", "success");
      
      // Redirecciona al juego (si está en otra página) o transiciona a otro contenedor
      setTimeout(() => {
        window.location.href = "game.html";
        // Si decides mostrar el juego en el mismo index, en lugar de redireccionar,
        // puedes usar: transitionScreens("start-container", "game-container");
      }, 300);
    });
  }

  // Maneja la selección de dificultad
  const difficultyButtons = document.querySelectorAll(".difficulty-btn");
  difficultyButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      difficultyButtons.forEach(b => b.classList.remove("selected"));
      this.classList.add("selected");
      selectedDifficulty = this.getAttribute("data-difficulty");
      console.log(`Dificultad seleccionada: ${selectedDifficulty}`);
      // Animación breve de pulsado
      this.classList.add("pulse-animation");
      setTimeout(() => {
        this.classList.remove("pulse-animation");
      }, 600);
    });
  });
}

// Anima elementos al cargar (ajusta las clases si lo requieres)
function animateElements() {
  const animatedElements = document.querySelectorAll(
    ".login-form-container, .rules-card, .title-text, .screen"
  );
  animatedElements.forEach((el, index) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 200 + index * 180);
  });
}

// Si tienes un aviso de cookies, lo oculta (en este HTML no aparece,
// pero es útil si lo agregas en el futuro)
function setupCookieConsent() {
  const cookieElem = document.getElementById("cookieConsent");
  if (cookieElem && localStorage.getItem("cookiesAccepted")) {
    cookieElem.style.display = "none";
  }
}

// Muestra notificaciones tipo "toast"
function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "error"
          ? "exclamation-circle"
          : "info-circle"
      }"></i>
    </div>
    <div class="toast-message">${message}</div>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 400);
    }, 3000);
  }, 100);
}

// Inicializa cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", initUI);
