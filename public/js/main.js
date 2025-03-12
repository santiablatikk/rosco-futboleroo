document.addEventListener("DOMContentLoaded", async () => {
  // --- Sonidos ---
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");

  // Variable para manejar el sonido
  let soundEnabled = true;

  // Variable global para contar las oportunidades de respuesta incompleta (máximo 2)
  let globalIncompleteAttempts = 0;

  // --- Elementos de Login ---
  const loginScreen = document.getElementById("login-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const startBtn = document.getElementById("start-game");

  // --- Elementos de Juego ---
  const gameScreen = document.getElementById("game-screen");
  const userDisplay = document.getElementById("user-display");
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const actionBtn = document.getElementById("action-btn");
  const helpBtn = document.getElementById("help");
  const helpContainer = document.getElementById("help-container");
  const timerEl = document.getElementById("timer");
  const soundToggle = document.getElementById("sound-toggle");
  // Contenedor para el mensaje de respuesta incompleta
  const incompleteFeedbackContainer = document.getElementById("incomplete-feedback-container");

  // --- Variables del juego ---
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

  /* --------------------------
         LOGIN
  -------------------------- */
  loginBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (!username) {
      alert("Por favor, ingresa un nombre de usuario.");
      return;
    }
    // Ocultar el cartel de reglas al ingresar el nombre
    document.getElementById("game-rules").classList.add("hidden");
    loginBtn.classList.add("hidden");
    usernameInput.disabled = true;
    startBtn.classList.remove("hidden");
  });

  startBtn.addEventListener("click", () => {
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    userDisplay.textContent = `Jugador: ${username}`;
    startGame();
  });

  /* --------------------------
     BOTÓN DE SONIDO
  -------------------------- */
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? "🔊 Sound: On" : "🔇 Sound: Off";
  });

  /* --------------------------
     ACTUALIZAR BOTÓN DE ACCIÓN con animación sutil
  -------------------------- */
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
    // Si se comienza a escribir, se oculta cualquier mensaje de respuesta incompleta
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
  }
  answerInput.addEventListener("input", updateActionButton);

  function handleAction() {
    // Al iniciar un nuevo intento, se oculta el mensaje de respuesta incompleta (si existe)
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    const val = answerInput.value.trim();
    if (!val) {
      passQuestion();
    } else {
      checkAnswer();
    }
  }
  actionBtn.addEventListener("click", handleAction);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAction();
    }
  });

  /* --------------------------
     CARGAR PREGUNTAS
  -------------------------- */
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      if (!questions.length) {
        console.error("No se recibieron preguntas");
      }
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      questions = [];
    }
  }

  /* --------------------------
     DIBUJAR ROSCO
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    let containerSize = 350;
    let letterSize = 32;
    let radius = 140;
    if (window.innerWidth < 600) {
      containerSize = 250;
      letterSize = 25;
      radius = 100;
    }
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

  /* --------------------------
     MOSTRAR PREGUNTA con efecto fade
  -------------------------- */
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
      questionEl.textContent = `${currentQ.letra} ➜ ${currentQ.pregunta}`;
      answerInput.value = "";
      updateActionButton();
      questionEl.style.opacity = 1;
      answerInput.focus();
    }, 250);
  }

  /* --------------------------
     MARCAR LETRA ACTIVA
  -------------------------- */
  function updateActiveLetter() {
    const letters = document.querySelectorAll(".letter");
    letters.forEach(l => l.classList.remove("active"));
    if (queue.length > 0) {
      const currentIdx = queue[0];
      letters[currentIdx].classList.add("active");
      const letterActive = letters[currentIdx].textContent;
      if (helpContainer.dataset[letterActive]) {
        helpContainer.innerHTML = helpContainer.dataset[letterActive];
        helpContainer.classList.remove("hidden");
      } else {
        helpContainer.classList.add("hidden");
      }
    }
  }

  /* --------------------------
     NORMALIZAR TEXTO
  -------------------------- */
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  /* --------------------------
     FEEDBACK: mostrar mensaje de "Respuesta Incompleta" en el contenedor a la derecha del rosco
  -------------------------- */
  function showIncompleteMessage() {
    incompleteFeedbackContainer.innerHTML = "Respuesta incompleta!<br>Intente nuevamente.";
    incompleteFeedbackContainer.classList.add("show");
  }

  /* --------------------------
     FEEDBACK para respuestas correctas/incorrectas
  -------------------------- */
  function showFeedback(letterDiv, success) {
    const feedback = document.createElement("div");
    feedback.classList.add("feedback-message");
    feedback.textContent = success ? "✅" : "❌";
    feedback.style.position = "absolute";
    feedback.style.top = "-20px";
    feedback.style.left = "50%";
    feedback.style.transform = "translateX(-50%)";
    letterDiv.appendChild(feedback);
    setTimeout(() => {
      feedback.remove();
    }, 800);
  }

  /* --------------------------
     VALIDAR RESPUESTA (con control de respuestas incompletas globalmente 2 veces)
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted || queue.length === 0 || !answerInput.value.trim()) return;
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    const userAns = normalizeString(answerInput.value.trim());
    const correctAns = normalizeString(currentQ.respuesta.trim());
    const letterDiv = document.querySelectorAll(".letter")[currentIdx];
    letterDiv.classList.remove("pasapalabra");

    // Verificamos si la respuesta es incompleta (prefijo válido, pero menor que la respuesta completa)
    if (userAns !== correctAns && correctAns.startsWith(userAns) && userAns.length < correctAns.length) {
      if (globalIncompleteAttempts < 2) {
        globalIncompleteAttempts++;
        // Se muestra el mensaje de respuesta incompleta en el contenedor a la derecha del rosco
        showIncompleteMessage();
        answerInput.value = "";
        answerInput.focus();
        return; // Se le da la oportunidad de reintentar
      }
      // Si ya se usaron las 2 oportunidades, se continúa y se valida normalmente (lo contará como error si no es exacto)
    }
    totalAnswered++;
    const dist = levenshteinDistance(userAns, correctAns);
    const threshold = Math.min(1, Math.floor(correctAns.length * 0.15));
    if (dist <= threshold) {
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
    // Se remueve el mensaje de respuesta incompleta (si estuviera visible)
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    currentQ.incompleteAttempt = false;
    helpContainer.classList.add("hidden");
    helpContainer.dataset[currentQ.letra] = "";
    queue.shift();
    showQuestion();
  }

  /* --------------------------
     PASAPALABRA
  -------------------------- */
  function passQuestion() {
    if (!gameStarted || queue.length === 0) return;
    const idx = queue.shift();
    const letterDiv = document.querySelectorAll(".letter")[idx];
    letterDiv.classList.add("pasapalabra");
    queue.push(idx);
    helpContainer.classList.add("hidden");
    showQuestion();
  }

  /* --------------------------
     HELP
  -------------------------- */
  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue[0];
    const letterActive = questions[currentIdx].letra;
    if (helpUses >= 2) {
      helpContainer.innerHTML = `<p style="color:#f33;font-weight:bold;">Solo se puede usar HELP 2 veces</p>`;
      helpContainer.dataset[letterActive] = helpContainer.innerHTML;
      helpContainer.classList.remove("hidden");
      return;
    }
    helpUses++;
    const correctAns = questions[currentIdx].respuesta;
    const hint = correctAns.substring(0, 3);
    const hintHtml = `<p><strong>PISTA:</strong> <span style="color:#0f0;font-weight:bold;">"${hint}"</span></p>`;
    helpContainer.innerHTML = hintHtml;
    helpContainer.dataset[letterActive] = hintHtml;
    helpContainer.classList.remove("hidden");
  });

  /* --------------------------
     LEVENSHTEIN
  -------------------------- */
  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
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

  /* --------------------------
     FINALIZAR JUEGO
  -------------------------- */
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    actionBtn.disabled = true;
    calculateAchievements();
    showAchievementsModal(() => {
      showErrorsModal(() => {
        saveGlobalRanking();
        window.location.href = "ranking.html";
      });
    });
  }

  /* --------------------------
     INICIAR JUEGO
  -------------------------- */
  async function startGame() {
    correctCount = 0;
    wrongCount = 0;
    totalAnswered = 0;
    helpUses = 0;
    achievements = [];
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
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
    }, 1000);
    showQuestion();
  }

  /* --------------------------
     CALCULAR LOGROS
  -------------------------- */
  function calculateAchievements() {
    if (wrongCount === 0 && totalAnswered > 0) {
      achievements.push("🎉 Partida Perfecta");
    }
    if (totalAnswered >= 20 && wrongCount === 0) {
      achievements.push("🏅 20 Respuestas sin Error");
    }
  }

  /* --------------------------
     MOSTRAR CARTEL DE LOGROS
  -------------------------- */
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

  /* --------------------------
     MOSTRAR CARTEL DE ERRORES + ESTADÍSTICAS
  -------------------------- */
  function showErrorsModal(next) {
    const endTime = Date.now();
    totalTime = (endTime - startTime) / 1000;
    const averageTime = totalAnswered > 0 ? (totalTime / totalAnswered).toFixed(2) : 0;
    const letters = document.querySelectorAll(".letter");
    const modal = document.createElement("div");
    modal.classList.add("game-over-modal");

    let errorsContent = `
      <div class="modal-content">
        <h2>Estadísticas</h2>
        <p><strong>Respondidas:</strong> ${totalAnswered}</p>
        <p><strong>Correctas:</strong> ${correctCount}</p>
        <p><strong>Erróneas:</strong> ${wrongCount}</p>
        <p><strong>Tiempo promedio:</strong> ${averageTime}s</p>
        <hr>
        <h2>Errores</h2>
        <ul class="incorrect-list">
    `;
    questions.forEach((q, i) => {
      if (letters[i].classList.contains("wrong")) {
        errorsContent += `<li><strong>${q.letra}:</strong> ${q.pregunta}<br>
                          <span class="correct-answer">Resp. correcta: ${q.respuesta}</span></li>`;
      }
    });
    errorsContent += `</ul><button id="close-modal">Cerrar</button></div>`;
    modal.innerHTML = errorsContent;
    document.body.appendChild(modal);
    document.getElementById("close-modal").addEventListener("click", () => {
      modal.remove();
      next();
    });
  }

  /* --------------------------
     GUARDAR RANKING GLOBAL
  -------------------------- */
  function saveGlobalRanking() {
    const personalStats = {
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      total: totalAnswered,
      date: new Date().toLocaleString(),
      achievements: achievements
    };
    fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalStats)
    }).catch(err => console.error("Error al guardar ranking:", err));
  }
});
