// Módulo de Localización (Ejemplo básico para multilenguaje)
const translations = {
  es: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Ingresa tu nombre para comenzar:",
    rulesTitle: "Reglas del Juego",
    ruleError: "Máximo de Errores: Hasta 2 errores (al tercer error pierdes).",
    ruleHelp: "HELP: Tienes 2 oportunidades para obtener pista (primeras 3 letras).",
    ruleIncomplete: "Respuesta Incompleta: Puedes enviar respuestas incompletas hasta 2 veces.",
    ruleTime: "Tiempo: La partida dura 240 segundos.",
    ruleSpelling: "Ortografía: Se toleran errores mínimos.",
    questionPlaceholder: 'Presiona "Iniciar Juego" para comenzar'
  },
  en: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Enter your name to start:",
    rulesTitle: "Game Rules",
    ruleError: "Maximum Mistakes: Up to 2 mistakes (3rd mistake loses).",
    ruleHelp: "HELP: You have 2 chances to get a hint (first 3 letters).",
    ruleIncomplete: "Incomplete Answer: You can submit incomplete answers up to 2 times.",
    ruleTime: "Time: The game lasts 240 seconds.",
    ruleSpelling: "Spelling: Minor spelling errors are accepted.",
    questionPlaceholder: 'Press "Start Game" to begin'
  }
};

let currentLang = localStorage.getItem("lang") || "es";

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  const t = translations[lang];
  document.getElementById("title-text").textContent = t.loginTitle;
  document.getElementById("login-text").textContent = t.loginPrompt;
}

document.addEventListener("DOMContentLoaded", async () => {
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");
  let soundEnabled = true;
  let globalIncompleteAttempts = 0;

  const loginScreen = document.getElementById("login-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const startBtn = document.getElementById("start-game");

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

  let questions = [];
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;
  let helpUses = 0;
  let totalAnswered = 0;
  let startTime = 0;
  let totalTime = 0;
  let achievements = [];

  loginBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (!username) {
      alert("Por favor, ingresa un nombre de usuario.");
      return;
    }
    usernameInput.style.display = "none";
    loginBtn.style.display = "none";
    document.getElementById("login-text").style.display = "none";
    document.getElementById("game-rules").classList.add("hidden");
    startBtn.classList.remove("hidden");
  });

  startBtn.addEventListener("click", () => {
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    userDisplay.textContent = `JUGADOR: ${username}`;
    startGame();
  });

  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundToggle.textContent = soundEnabled ? "🔊 Sound: On" : "🔇 Sound: Off";
    });
  }

  answerInput.addEventListener("input", updateActionButton);
  actionBtn.addEventListener("click", handleAction);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAction();
    }
  });
  function updateActionButton() {
    const val = answerInput.value.trim();
    const newText = val ? "Comprobar" : "Pasapalabra";
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
    if (!val) {
      passQuestion();
    } else {
      checkAnswer();
    }
  }

  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      if (!questions.length)
        console.error("No se recibieron preguntas");
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
      if (!gameStarted || queue.length === 0) {
        endGame();
        return;
      }
      updateActiveLetter();
      const currentIdx = queue[0];
      const currentQ = questions[currentIdx];
      questionEl.innerHTML = `
        <div class="question-letter">${currentQ.letra}</div>
        <div class="question-arrow">↓</div>
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
    incompleteFeedbackContainer.innerHTML = "¡Respuesta incompleta!<br>Intenta nuevamente.";
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
      if (wrongCount >= 3) {
        endGame();
        return;
      }
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
  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue[0];
    const letterActive = questions[currentIdx].letra;
    if (helpUses >= 2) {
      hintContainer.innerHTML = `<p style="color:#f33;font-weight:bold;">Solo se puede usar HELP 2 veces</p>`;
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
      achievements: achievements
    };
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameStats)
      });
      showToast("Perfil actualizado.");
    } catch (e) {
      console.error("Error al actualizar el perfil:", e);
      showToast("Error al actualizar el perfil.");
    }
  }
  function showVictoryModal(next) {
    const victoryModal = document.createElement("div");
    victoryModal.classList.add("game-over-modal", "victory-modal");
    let victoryMsg = "";
    if (wrongCount === 0) victoryMsg = "¡Ganaste sin errores! 🥳";
    else if (wrongCount === 1) victoryMsg = "Ganaste con 1 error 👍";
    else if (wrongCount === 2) victoryMsg = "Ganaste con 2 errores 😲";
    const modalContent = `
      <div class="modal-content">
        <h2>¡Felicidades!</h2>
        <p>${victoryMsg}</p>
        <button id="victory-close" style="padding: 10px 20px; font-size:1rem;">Continuar</button>
      </div>
    `;
    victoryModal.innerHTML = modalContent;
    document.body.appendChild(victoryModal);
    document.getElementById("victory-close").addEventListener("click", () => {
      victoryModal.remove();
      next();
    });
  }
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    actionBtn.disabled = true;
    updateProfile().then(() => {
      if (wrongCount < 3 && queue.length === 0) {
        showVictoryModal(() => {
          showAllModalsSequence();
        });
      } else {
        showAllModalsSequence();
      }
    });
  }
  function showAllModalsSequence() {
    calculateAchievements();
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
        <h2>Estadísticas</h2>
        <p><strong>Respondidas:</strong> ${totalAnswered}</p>
        <p><strong>Correctas:</strong> ${correctCount}</p>
        <p><strong>Erróneas:</strong> ${wrongCount}</p>
        <p><strong>Tiempo promedio:</strong> ${averageTime}s</p>
        <hr>
        <h2 style="color:#ff5722;">Errores</h2>
        <ul class="incorrect-list">
    `;
    questions.forEach((q, i) => {
      if (letters[i] && letters[i].classList.contains("wrong")) {
        errorsContent += `<li><strong>${q.letra}:</strong> ${q.pregunta}<br>
        <span class="correct-answer">Resp. correcta: ${q.respuesta}</span></li>`;
      }
    });
    errorsContent += `
        </ul>
        <button id="close-modal">Cerrar</button>
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
      date: new Date().toLocaleString()
    };
    fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalStats)
    }).catch(err => console.error("Error al guardar ranking:", err));
  }
  function calculateAchievements() {
    if (wrongCount === 0 && totalAnswered > 0) {
      achievements.push("🎉 Partida Perfecta");
    }
    if (totalAnswered >= 20 && wrongCount === 0) {
      achievements.push("🏅 20 Respuestas sin Error");
    }
  }
  function showAchievementsModal(next) {
    if (achievements.length === 0) {
      next();
      return;
    }
    let index = 0;
    function showNextAchievement() {
      if (index >= achievements.length) {
        next();
        return;
      }
      const modal = document.createElement("div");
      modal.classList.add("game-over-modal");
      const modalContent = `
        <div class="modal-content">
          <h2>¡Logro Obtenido!</h2>
          <p style="font-size:1.2rem;">${achievements[index]}</p>
        </div>
      `;
      modal.innerHTML = modalContent;
      document.body.appendChild(modal);
      setTimeout(() => {
        modal.remove();
        index++;
        showNextAchievement();
      }, 1500);
    }
    showNextAchievement();
  }

  async function startGame() {
    correctCount = 0;
    wrongCount = 0;
    totalAnswered = 0;
    helpUses = 0;
    achievements = [];
    globalIncompleteAttempts = 0;
    timeLeft = 240;
    await loadQuestions();
    if (!questions.length) {
      alert("No se pudieron cargar las preguntas.");
      return;
    }
    queue = questions.map((q, i) => i);
    gameStarted = true;
    startTime = Date.now();
    drawRosco();
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      let ratio = timeLeft / 240;
      let red = Math.floor((1 - ratio) * 255);
      let green = Math.floor(ratio * 255);
      timerEl.style.backgroundColor = `rgb(${red}, ${green}, 0)`;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
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

  setLanguage(currentLang);
});
