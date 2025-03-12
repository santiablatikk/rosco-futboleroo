document.addEventListener("DOMContentLoaded", () => {
  // --- Sonidos ---
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");

  // --- Elementos de Pantalla Login ---
  const loginScreen = document.getElementById("login-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const startBtn = document.getElementById("start-game");

  // --- Elementos de Pantalla Juego ---
  const gameScreen = document.getElementById("game-screen");
  const userDisplay = document.getElementById("user-display");
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const actionBtn = document.getElementById("action-btn");
  const timerEl = document.getElementById("timer");
  const helpContainer = document.getElementById("help-container");

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

  // --- i18n ---
  const langSelect = document.getElementById("lang-select");
  const titleText = document.getElementById("title-text");
  const loginText = document.getElementById("login-text");

  // Cambiar idioma
  langSelect.addEventListener("change", (e) => {
    const lang = e.target.value;
    if (lang === "en") {
      document.documentElement.lang = "en";
      titleText.textContent = "Football Rosco";
      loginText.textContent = "Enter your name to start:";
      loginBtn.textContent = "Enter";
      startBtn.textContent = "Start Game";
      actionBtn.textContent = "Pasapalabra";
    } else {
      document.documentElement.lang = "es";
      titleText.textContent = "Rosco Futbolero";
      loginText.textContent = "Ingresa tu nombre para comenzar:";
      loginBtn.textContent = "Ingresar";
      startBtn.textContent = "Iniciar Juego";
      actionBtn.textContent = "Pasapalabra";
    }
  });

  /* --------------------------
     LOGIN
  -------------------------- */
  loginBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (!username) {
      alert("Por favor, ingresa un nombre de usuario.");
      return;
    }
    // Ocultar el botón "Ingresar"
    loginBtn.classList.add("hidden");
    usernameInput.disabled = true;
    // Mostrar "Iniciar Juego"
    startBtn.classList.remove("hidden");
  });

  // Botón Iniciar Juego
  startBtn.addEventListener("click", () => {
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    userDisplay.textContent = `Jugador: ${username}`;
    startGame();
  });

  /* --------------------------
     ACTUALIZAR BOTÓN (PASAPALABRA / COMPROBAR)
  -------------------------- */
  function updateActionButton() {
    const val = answerInput.value.trim();
    if (!val) {
      actionBtn.textContent = "Pasapalabra";
    } else {
      actionBtn.textContent = "Comprobar";
    }
  }
  answerInput.addEventListener("input", updateActionButton);

  /* --------------------------
     MANEJAR ACCIÓN (PASAR O COMPROBAR)
  -------------------------- */
  function handleAction() {
    const val = answerInput.value.trim();
    if (!val) {
      passQuestion();
    } else {
      checkAnswer();
    }
  }

  /* --------------------------
     CARGAR PREGUNTAS
  -------------------------- */
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      // Ya tenemos questions cargadas, dibujamos rosco
      drawRosco();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
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
     START GAME
  -------------------------- */
  function startGame() {
    // Reiniciar variables
    gameStarted = true;
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    helpUses = 0;
    totalAnswered = 0;
    achievements = [];
    startTime = Date.now();

    // Reiniciar queue
    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }

    // Timer
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);

    // Ocultar help
    helpContainer.classList.add("hidden");
    // Pistas vacías
    helpContainer.dataset = {}; // Limpia el dataset

    showQuestion();
  }

  /* --------------------------
     MOSTRAR PREGUNTA
  -------------------------- */
  function showQuestion() {
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
    answerInput.focus();
  }

  /* --------------------------
     VALIDAR RESPUESTA
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted || !answerInput.value.trim() || queue.length === 0) return;
    totalAnswered++;
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    const userAns = normalizeString(answerInput.value.trim());
    const correctAns = normalizeString(currentQ.respuesta.trim());
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.remove("pasapalabra");

    // Fuzzy
    const dist = levenshteinDistance(userAns, correctAns);
    const threshold = Math.min(1, Math.floor(correctAns.length * 0.15));
    if (dist <= threshold) {
      letterDiv.classList.add("correct");
      audioCorrect.play();
      correctCount++;
    } else {
      letterDiv.classList.add("wrong");
      audioIncorrect.play();
      wrongCount++;
      if (wrongCount >= 3) {
        endGame();
        return;
      }
    }
    // Ocultar help
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
    const letterDiv = getLetterElements()[idx];
    letterDiv.classList.add("pasapalabra");
    queue.push(idx);

    // Ocultar help
    const letterActive = questions[idx].letra;
    helpContainer.classList.add("hidden");
    helpContainer.dataset[letterActive] = "";

    showQuestion();
  }

  /* --------------------------
     HELP
  -------------------------- */
  const helpBtn = document.getElementById("help");
  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue[0];
    const letterActive = questions[currentIdx].letra;

    if (helpUses >= 2) {
      helpContainer.innerHTML = `<p style="color: #f33; font-weight: bold;">Solo se puede usar HELP 2 veces</p>`;
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
     END GAME
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

  /* CALCULAR LOGROS */
  function calculateAchievements() {
    // Partida Perfecta
    if (wrongCount === 0 && totalAnswered > 0) {
      achievements.push("🎉 Partida Perfecta");
    }
    // 20 sin error
    if (totalAnswered >= 20 && wrongCount === 0) {
      achievements.push("🏅 20 Respuestas sin Error");
    }
  }

  /* MOSTRAR CARTEL DE LOGROS (1.5s cada uno) */
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

  /* MOSTRAR CARTEL DE ERRORES + ESTADÍSTICAS */
  function showErrorsModal(next) {
    const endTime = Date.now();
    totalTime = (endTime - startTime) / 1000;
    const averageTime = totalAnswered > 0 ? (totalTime / totalAnswered).toFixed(2) : 0;

    const letters = getLetterElements();
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

  /* GUARDAR RANKING */
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

  /* EVENTOS */
  actionBtn.addEventListener("click", handleAction);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAction();
    }
  });

  // Cargar preguntas UNA VEZ al iniciar la app
  loadQuestions();
});
