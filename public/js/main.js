document.addEventListener("DOMContentLoaded", async () => {
  // --- Sonidos ---
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");

  let soundEnabled = true;
  let globalIncompleteAttempts = 0; // Máximo 2 intentos a lo largo del juego
  
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
  const timerEl = document.getElementById("timer");
  const soundToggle = document.getElementById("sound-toggle");
  
  // Contenedores laterales para mensajes
  const hintContainer = document.getElementById("hint-container");
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
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundToggle.textContent = soundEnabled ? "🔊 Sound: On" : "🔇 Sound: Off";
    });
  }
  
  /* --------------------------
     ACTUALIZAR BOTÓN DE ACCIÓN
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
    // Ocultar mensaje incompleto si el usuario empieza a escribir
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
  }
  answerInput.addEventListener("input", updateActionButton);
  
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
    let containerSize = 370;
    let letterSize = 34;
    let radius = 150;
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
     MOSTRAR PREGUNTA
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
      // Mostrar pista si existe
      if (hintContainer.dataset[letterActive]) {
        hintContainer.innerHTML = hintContainer.dataset[letterActive];
        hintContainer.classList.add("show");
      } else {
        hintContainer.innerHTML = "";
        hintContainer.classList.remove("show");
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
     MENSAJE DE RESPUESTA INCOMPLETA
  -------------------------- */
  function showIncompleteMessage() {
    incompleteFeedbackContainer.innerHTML = "¡Respuesta incompleta!<br>Intenta nuevamente.";
    incompleteFeedbackContainer.classList.add("show");
  }
  
  /* --------------------------
     FEEDBACK ACIERTO/ERROR
  -------------------------- */
  function showFeedback(letterDiv, success) {
    const feedback = document.createElement("div");
    feedback.classList.add("feedback-message");
    feedback.textContent = success ? "✅" : "❌";
    letterDiv.appendChild(feedback);
    setTimeout(() => feedback.remove(), 800);
  }
  
  /* --------------------------
     VALIDAR RESPUESTA
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted || queue.length === 0 || !answerInput.value.trim()) return;
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    const userAns = normalizeString(answerInput.value.trim());
    const correctAns = normalizeString(currentQ.respuesta.trim());
    const letterDiv = document.querySelectorAll(".letter")[currentIdx];
    letterDiv.classList.remove("pasapalabra");
  
    // Respuesta incompleta (prefijo válido)
    if (userAns !== correctAns && correctAns.startsWith(userAns) && userAns.length < correctAns.length) {
      if (globalIncompleteAttempts < 2) {
        globalIncompleteAttempts++;
        showIncompleteMessage();
        answerInput.value = "";
        answerInput.focus();
        return;
      }
    }
  
    totalAnswered++;
    // Tolerancia a errores "muy mínimos" (mayor umbral si la palabra es larga)
    // Por ejemplo, "pipo" vs "pipi": Se permite 1 error si la palabra es corta, 2 si es más larga
    const wordLen = correctAns.length;
    let maxDist = 1; 
    if (wordLen > 5) {
      maxDist = 2; 
    }
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
  
  /* --------------------------
     PASAPALABRA
  -------------------------- */
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
  
  /* --------------------------
     HELP
  -------------------------- */
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
    if (wrongCount < 3 && queue.length === 0) {
      showVictoryModal(() => {
        showAllModalsSequence();
      });
    } else {
      showAllModalsSequence();
    }
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
  
  /* MODAL VICTORIA */
  function showVictoryModal(next) {
    const victoryModal = document.createElement("div");
    victoryModal.classList.add("game-over-modal", "victory-modal");
    const modalContent = `
      <div class="modal-content">
        <h2>¡Felicidades!</h2>
        <p>Has completado el rosco con ${wrongCount} error(es).</p>
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
  
  /* INICIAR JUEGO */
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
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
    }, 1000);
    
    showQuestion();
  }
  
  /* LOGROS */
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
  
  /* CARTEL DE ERRORES + ESTADÍSTICAS (sin scroll interno) */
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
        <h2 style="color:#ff5722;">Errores</h2>
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
  
  /* RANKING */
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
});
