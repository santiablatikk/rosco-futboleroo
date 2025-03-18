/* js/main.js */

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
    promoMsg: "Más de 1000 preguntas para jugar sin parar!",
    difficultyLabel: "Dificultad:",
    difficultyHard: "Difícil",
    difficultyNormal: "Normal",
    difficultyEasy: "Fácil",
    startGameButton: "INICIAR JUEGO",
    gameTitle: "PASALA CHÉ",
    soundOn: "🔊 Sound: On",
    soundOff: "🔇 Sound: Off",
    timer: "Tiempo: ",
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
    soundOn: "🔊 Sound: On",
    soundOff: "🔇 Sound: Off",
    timer: "Time: ",
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

document.addEventListener("DOMContentLoaded", async () => {
  setLanguage(currentLang);

  const langSelect = document.getElementById("language");
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }

  // Configuración de sonidos
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");
  let soundEnabled = true;
  let globalIncompleteAttempts = 0;

  // Variables de control del juego
  const loginBtn = document.getElementById("login-btn");
  const startGameBtn = document.getElementById("start-game");
  const difficultySelect = document.getElementById("difficulty");
  const gameScreen = document.getElementById("game-screen");
  const userDisplay = document.getElementById("user-display");
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const actionBtn = document.getElementById("action-btn");
  const helpBtn = document.getElementById("help");
  const timerEl = document.getElementById("timer");
  const soundToggle = document.getElementById("sound-toggle");
  const hintContainer = document.getElementById("hint-container");
  const incompleteFeedbackContainer = document.getElementById("incomplete-feedback-container");
  const shareBtn = document.getElementById("share-btn");

  // Variables del juego
  let questions = [];
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let baseTime = 240;
  let timeLeft = 240;
  let timerInterval = null;
  let gameStarted = false;
  let helpUses = 0;
  let totalAnswered = 0;
  let startTime = 0;
  let totalTime = 0;
  let achievements = [];

  // Botón INGRESAR: Guarda el nombre y muestra el contenedor de "INICIAR JUEGO"
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const usernameInput = document.getElementById("username");
      const uname = usernameInput.value.trim();
      if (!uname) {
        alert("Por favor, ingresa un nombre de usuario.");
        return;
      }
      username = uname;
      sessionStorage.setItem("username", username);
      // Oculta el formulario de login y muestra el contenedor para iniciar el juego
      usernameInput.style.display = "none";
      loginBtn.style.display = "none";
      document.getElementById("login-text").style.display = "none";
      document.getElementById("game-rules").classList.add("hidden");
      document.getElementById("promo-msg").classList.remove("hidden");
      document.getElementById("start-container").classList.remove("hidden");
    });
  }

  // Botón INICIAR JUEGO: Inicia el juego
  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      document.getElementById("login-screen").classList.add("hidden");
      gameScreen.classList.remove("hidden");
      userDisplay.textContent = `JUGADOR: ${username}`;
      setDifficulty();
      startGame();
    });
  }

  function setDifficulty() {
    const diffValue = difficultySelect.value;
    if (diffValue === "easy") { baseTime = 300; }
    else if (diffValue === "hard") { baseTime = 200; }
    else { baseTime = 240; }
    timeLeft = baseTime;
  }

  answerInput.addEventListener("input", updateActionButton);
  actionBtn.addEventListener("click", handleAction);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAction(); }
  });

  function updateActionButton() {
    const val = answerInput.value.trim();
    const newText = val
      ? translations[currentLang]?.checkBtn || "Comprobar"
      : translations[currentLang]?.passBtn || "Pasala Ché";
    if (actionBtn.textContent !== newText) {
      actionBtn.classList.add("btn-change");
      setTimeout(() => {
        actionBtn.textContent = newText;
        actionBtn.classList.remove("btn-change");
      }, 150);
    }
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
  }

  function handleAction() {
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    const val = answerInput.value.trim();
    if (!val) { passQuestion(); }
    else { checkAnswer(); }
  }

  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      if (!questions.length) console.error("No se recibieron preguntas");
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      questions = [];
    }
  }

  function drawRosco() {
    roscoContainer.innerHTML = "";
    const isMobile = window.innerWidth < 600;
    let containerSize = isMobile ? 350 : 550;
    let letterSize = isMobile ? 35 : 50;
    let radius = isMobile ? 150 : 240;
    roscoContainer.style.width = containerSize + "px";
    roscoContainer.style.height = containerSize + "px";
    const total = questions.length;
    const halfLetter = letterSize / 2;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2;
    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - halfLetter;
      const y = centerY + radius * Math.sin(angle) - halfLetter;
      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = questions[i].letra;
      letterDiv.setAttribute("data-index", i);
      letterDiv.style.width = letterSize + "px";
      letterDiv.style.height = letterSize + "px";
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      roscoContainer.appendChild(letterDiv);
    }
  }

  function showQuestion() {
    questionEl.style.opacity = 0;
    setTimeout(() => {
      if (!gameStarted || queue.length === 0) { endGame(); return; }
      updateActiveLetter();
      const currentIdx = queue[0];
      const currentQ = questions[currentIdx];
      questionEl.innerHTML = `
        <div class="question-letter">${currentQ.letra}</div>
        <div class="question-text">${currentQ.pregunta}</div>
      `;
      answerInput.value = "";
      updateActionButton();
      questionEl.style.opacity = 1;
      answerInput.focus();
    }, 250);
  }

  function updateActiveLetter() {
    const letters = document.querySelectorAll(".letter");
    letters.forEach((l) => l.classList.remove("active"));
    if (queue.length > 0) {
      const currentIdx = queue[0];
      letters[currentIdx].classList.add("active");
      const letterActive = letters[currentIdx].textContent;
      if (hintContainer.dataset[letterActive]) {
        hintContainer.innerHTML = hintContainer.dataset[letterActive];
        hintContainer.classList.add("show");
      } else {
        hintContainer.innerHTML = "";
        hintContainer.classList.remove("show");
      }
    }
  }

  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function showIncompleteMessage() {
    incompleteFeedbackContainer.innerHTML =
      currentLang === "es"
        ? "¡Respuesta incompleta!<br>Intenta nuevamente."
        : "Incomplete answer!<br>Try again.";
    incompleteFeedbackContainer.classList.add("show");
  }

  function showFeedback(letterDiv, success) {
    const feedback = document.createElement("div");
    feedback.classList.add("feedback-message");
    feedback.textContent = success ? "✅" : "❌";
    letterDiv.appendChild(feedback);
    setTimeout(() => feedback.remove(), 800);
  }

  function checkAnswer() {
    if (!gameStarted || queue.length === 0 || !answerInput.value.trim()) return;
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    const userAns = normalizeString(answerInput.value.trim());
    const correctAns = normalizeString(currentQ.respuesta.trim());
    const letterDiv = document.querySelectorAll(".letter")[currentIdx];
    letterDiv.classList.remove("pasapalabra");
    if (
      userAns !== correctAns &&
      correctAns.startsWith(userAns) &&
      userAns.length < correctAns.length
    ) {
      if (globalIncompleteAttempts < 2) {
        globalIncompleteAttempts++;
        showIncompleteMessage();
        answerInput.value = "";
        answerInput.focus();
        return;
      }
    }
    totalAnswered++;
    const wordLen = correctAns.length;
    let maxDist = wordLen > 5 ? 2 : 1;
    if (difficultySelect.value === "easy") { maxDist += 1; }
    else if (difficultySelect.value === "hard") { maxDist = Math.max(maxDist - 1, 0); }
    const dist = levenshteinDistance(userAns, correctAns);
    if (dist <= maxDist) {
      letterDiv.classList.add("correct", "bounce");
      if (soundEnabled) audioCorrect.play();
      showFeedback(letterDiv, true);
      correctCount++;
    } else {
      letterDiv.classList.add("wrong", "shake");
      if (soundEnabled) audioIncorrect.play();
      showFeedback(letterDiv, false);
      wrongCount++;
      if (wrongCount >= 3) { endGame(); return; }
    }
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
    queue.shift();
    showQuestion();
  }

  function passQuestion() {
    if (!gameStarted || queue.length === 0) return;
    const idx = queue.shift();
    const letterDiv = document.querySelectorAll(".letter")[idx];
    letterDiv.classList.add("pasapalabra");
    queue.push(idx);
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
    showQuestion();
  }

  // Función para pedir pista: HELP
  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue[0];
    const letterActive = questions[currentIdx].letra;
    if (hintContainer.dataset[letterActive]) {
      hintContainer.innerHTML = hintContainer.dataset[letterActive];
      hintContainer.classList.add("show");
      return;
    }
    if (helpUses >= 2) {
      hintContainer.innerHTML = `<p style="color:#f33;font-weight:bold;">
        ${currentLang === "es" ? "Solo se puede usar HELP 2 veces" : "HELP can only be used 2 times"}
      </p>`;
      hintContainer.dataset[letterActive] = hintContainer.innerHTML;
      hintContainer.classList.add("show");
      return;
    }
    helpUses++;
    const correctAns = questions[currentIdx].respuesta;
    const hint = correctAns.substring(0, 3);
    const hintHtml = `<p><strong>PISTA:</strong> <span style="color:#0f0;font-weight:bold;">"${hint}"</span></p>`;
    hintContainer.innerHTML = hintHtml;
    hintContainer.dataset[letterActive] = hintHtml;
    hintContainer.classList.add("show");
  });

  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  async function updateProfile() {
    const gameTime = Math.floor((Date.now() - startTime) / 1000);
    const gameStats = {
      correct: correctCount,
      wrong: wrongCount,
      total: totalAnswered,
      time: gameTime,
      achievements: achievements,
    };
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameStats),
      });
      showToast("Perfil actualizado.");
    } catch (e) {
      console.error("Error al actualizar el perfil:", e);
      showToast("Error al actualizar el perfil.");
    }
  }

  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    actionBtn.disabled = true;
    sessionStorage.setItem("alreadyPlayed", "true");
    if (wrongCount >= 3) {
      showLossModal(() => {
        calculateAchievements();
        updateProfile().then(() => {
          showAllModalsSequence();
        });
      });
    } else {
      calculateAchievements();
      updateProfile().then(() => {
        if (queue.length === 0) {
          showVictoryModal(() => {
            showAllModalsSequence();
          });
        } else {
          showAllModalsSequence();
        }
      });
    }
  }

  // Modal de Derrota (centrado)
  function showLossModal(next) {
    const lossModal = document.createElement("div");
    lossModal.classList.add("game-over-modal", "loss-modal");
    const modalContent = `
      <div class="modal-content">
        <h2 style="color: #e73827;">¡PERDISTE!</h2>
        <p style="font-size: 1.2rem;">Lo siento, has alcanzado el máximo de errores.</p>
        <button id="loss-close" style="padding: 10px 20px; font-size: 1rem;">Continuar</button>
      </div>
    `;
    lossModal.innerHTML = modalContent;
    document.body.appendChild(lossModal);
    document.getElementById("loss-close").addEventListener("click", () => {
      lossModal.remove();
      next();
    });
  }

  // Modal de Victoria (centrado)
  window.showVictoryModal = function(next) {
    const victoryModal = document.createElement("div");
    victoryModal.classList.add("game-over-modal", "win-modal");
    let victoryMsg = "";
    if (wrongCount === 0)
      victoryMsg = currentLang === "es" ? "¡Ganaste sin errores! 🥳" : "You won with no mistakes! 🥳";
    else if (wrongCount === 1)
      victoryMsg = currentLang === "es" ? "Ganaste con 1 error 👍" : "You won with 1 mistake 👍";
    else if (wrongCount === 2)
      victoryMsg = currentLang === "es" ? "Ganaste con 2 errores 😲" : "You won with 2 mistakes 😲";
    const modalContent = `
      <div class="modal-content">
        <h2>${currentLang === "es" ? "¡Felicidades!" : "Congratulations!"}</h2>
        <p>${victoryMsg}</p>
        <button id="victory-close" style="padding: 10px 20px; font-size:1rem;">
          ${currentLang === "es" ? "Continuar" : "Continue"}
        </button>
      </div>
    `;
    victoryModal.innerHTML = modalContent;
    document.body.appendChild(victoryModal);
    document.getElementById("victory-close").addEventListener("click", () => {
      victoryModal.remove();
      next();
    });
  };

  function showAllModalsSequence() {
    showAchievementsModal(() => {
      showErrorsModal(() => {
        saveGlobalRanking();
        window.location.href = "ranking.html";
      });
    });
  }

  function showErrorsModal(next) {
    const endTime = Date.now();
    totalTime = (endTime - startTime) / 1000;
    const averageTime = totalAnswered > 0 ? (totalTime / totalAnswered).toFixed(2) : 0;
    const letters = document.querySelectorAll(".letter");
    const modal = document.createElement("div");
    modal.classList.add("game-over-modal");
    let errorsContent = `
      <div class="error-summary-card">
        <h2>${currentLang === "es" ? "Estadísticas" : "Statistics"}</h2>
        <p><strong>${currentLang === "es" ? "Respondidas" : "Answered"}:</strong> ${totalAnswered}</p>
        <p><strong>${currentLang === "es" ? "Correctas" : "Correct"}:</strong> ${correctCount}</p>
        <p><strong>${currentLang === "es" ? "Erróneas" : "Wrong"}:</strong> ${wrongCount}</p>
        <p><strong>${currentLang === "es" ? "Tiempo promedio" : "Avg. Time"}:</strong> ${averageTime}s</p>
        <hr>
        <h2 style="color:#ff5722;">${currentLang === "es" ? "Errores" : "Mistakes"}</h2>
        <ul class="incorrect-list">
    `;
    questions.forEach((q, i) => {
      if (letters[i] && letters[i].classList.contains("wrong")) {
        errorsContent += `<li><strong>${q.letra}:</strong> ${q.pregunta}<br>
        <span class="correct-answer">${currentLang === "es" ? "Resp. correcta" : "Correct answer"}: ${q.respuesta}</span></li>`;
      }
    });
    errorsContent += `
        </ul>
        <button id="close-modal">${currentLang === "es" ? "Cerrar" : "Close"}</button>
      </div>
    `;
    modal.innerHTML = errorsContent;
    document.body.appendChild(modal);
    document.getElementById("close-modal").addEventListener("click", () => {
      modal.remove();
      next();
    });
  }

  function saveGlobalRanking() {
    const personalStats = {
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      total: totalAnswered,
      date: new Date().toLocaleString(),
    };
    fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalStats),
    }).catch((err) => console.error("Error al guardar ranking:", err));
  }

  function calculateAchievements() {
    if (wrongCount === 0 && totalAnswered > 0) { achievements.push("🎉 Partida Perfecta"); }
    if (totalAnswered >= 20 && wrongCount === 0) { achievements.push("🏅 20 Respuestas sin Error"); }
    const elapsed = (Date.now() - startTime) / 1000;
    if (queue.length === 0 && elapsed < 60) { achievements.push("⚡ Velocidad Implacable"); }
    if (helpUses === 0 && queue.length === 0) { achievements.push("🤐 Sin Ayudas"); }
    if (globalIncompleteAttempts === 0 && queue.length === 0) { achievements.push("🔒 Sin Incompletas"); }
    if (totalAnswered >= 50) { achievements.push("💯 Has respondido 50+ preguntas"); }
  }

  async function startGame() {
    correctCount = 0;
    wrongCount = 0;
    totalAnswered = 0;
    helpUses = 0;
    achievements = [];
    globalIncompleteAttempts = 0;
    timeLeft = baseTime;
    await loadQuestions();
    if (!questions.length) { alert("No se pudieron cargar las preguntas."); return; }
    queue = questions.map((q, i) => i);
    gameStarted = true;
    startTime = Date.now();
    drawRosco();
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `${translations[currentLang]?.timer || "Tiempo:"} ${timeLeft}s`;
      let ratio = timeLeft / baseTime;
      let red = Math.floor((1 - ratio) * 255);
      let green = Math.floor(ratio * 255);
      timerEl.style.backgroundColor = `rgb(${red}, ${green}, 0)`;
      if (timeLeft <= 0) { clearInterval(timerInterval); endGame(); }
    }, 1000);
    showQuestion();
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
});
