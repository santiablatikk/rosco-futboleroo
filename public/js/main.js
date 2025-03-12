document.addEventListener("DOMContentLoaded", () => {
  // --- Sonidos ---
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");

  // --- Elementos de Login y Juego ---
  const loginScreen = document.getElementById("login-screen");
  const gameScreen = document.getElementById("game-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const userDisplay = document.getElementById("user-display");
  const startBtn = document.getElementById("start-game");

  // --- Elementos del rosco y panel ---
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const submitBtn = document.getElementById("submit-answer");
  const passBtn = document.getElementById("pass");
  const helpBtn = document.getElementById("help");
  const timerEl = document.getElementById("timer");
  const helpContainer = document.getElementById("help-container");

  // --- Panel de Estadísticas ---
  const statsPanel = document.getElementById("stats-panel");
  const statsList = document.getElementById("stats-list");

  // --- Selector de idioma ---
  const langSelect = document.getElementById("lang-select");
  const titleText = document.getElementById("title-text");
  const loginText = document.getElementById("login-text");

  // --- Variables del juego ---
  let questions = [];         // Array de { letra, pregunta, respuesta }
  let queue = [];             // Cola de índices pendientes
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;
  let helpUses = 0;           // Máximo 2 usos de HELP

  // Estadísticas
  let totalAnswered = 0;
  let startTime = null;
  let totalTime = 0;          // Para calcular tiempo promedio

  /* --------------------------
     Cambiar idioma
  -------------------------- */
  langSelect.addEventListener("change", (e) => {
    const lang = e.target.value;
    if (lang === "en") {
      document.documentElement.lang = "en";
      titleText.textContent = "Football Rosco";
      loginText.textContent = "Enter your name to start:";
      loginBtn.textContent = "Enter";
      startBtn.textContent = "Start Game";
      helpBtn.textContent = "HELP";
    } else {
      document.documentElement.lang = "es";
      titleText.textContent = "Rosco Futbolero";
      loginText.textContent = "Ingresa tu nombre para comenzar:";
      loginBtn.textContent = "Ingresar";
      startBtn.textContent = "Iniciar Juego";
      helpBtn.textContent = "HELP";
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
    // Ocultar botón "Ingresar" y bloquear el input
    loginBtn.classList.add("hidden");
    usernameInput.disabled = true;
    // Mostrar el botón "Iniciar Juego" (fijo, sobre el rosco)
    startBtn.classList.remove("hidden");
  });

  /* --------------------------
     Botón Iniciar Juego
  -------------------------- */
  startBtn.addEventListener("click", () => {
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    userDisplay.textContent = `Jugador: ${username}`;
    startGame();
  });

  /* --------------------------
     NORMALIZAR TEXTO
  -------------------------- */
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  /* --------------------------
     CARGAR PREGUNTAS
  -------------------------- */
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      if (questions.length === 0) {
        console.error("No se recibieron preguntas");
        return;
      }
      queue = [];
      for (let i = 0; i < questions.length; i++) {
        queue.push(i);
      }
      drawRosco();
      updateActiveLetter();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  /* --------------------------
     DIBUJAR ROSCO (sentido HORARIO)
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    let containerSize = 400;
    let letterSize = 36;
    let radius = 160;
    if (window.innerWidth < 600) {
      containerSize = 300;
      letterSize = 28;
      radius = 120;
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
     Obtener letras
  -------------------------- */
  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* --------------------------
     Marcar la letra activa
  -------------------------- */
  function updateActiveLetter() {
    const letters = getLetterElements();
    letters.forEach(l => l.classList.remove("active"));
    if (queue.length > 0) {
      letters[queue[0]].classList.add("active");
    }
  }

  /* --------------------------
     Mostrar la pregunta actual
  -------------------------- */
  function showQuestion() {
    if (!gameStarted || queue.length === 0) return;
    updateActiveLetter();
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    questionEl.textContent = `${currentQuestion.letra} ➜ ${currentQuestion.pregunta}`;
    answerInput.value = "";
    answerInput.focus();
    // Si HELP fue usado para esta pregunta y aún no se ha ocultado, mantenerlo visible
    if (!helpContainer.classList.contains("hidden") && helpUses > 0) {
      helpContainer.classList.remove("hidden");
    }
  }

  /* --------------------------
     Iniciar Juego
  -------------------------- */
  function startGame() {
    gameStarted = true;
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    helpUses = 0;
    totalAnswered = 0;
    startTime = Date.now();

    answerInput.disabled = false;
    submitBtn.disabled = false;
    passBtn.disabled = false;
    helpBtn.disabled = false;

    statsPanel.classList.remove("hidden");

    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
    showQuestion();
  }

  /* --------------------------
     Validar respuesta (fuzzy matching)
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted || !answerInput.value.trim() || queue.length === 0) return;
    totalAnswered++;
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    const userAnswer = normalizeString(answerInput.value.trim());
    const correctAnswer = normalizeString(currentQuestion.respuesta.trim());
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.remove("pasapalabra");

    if (userAnswer === correctAnswer || isAnswerSimilar(userAnswer, correctAnswer)) {
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
    queue.shift();
    // Ocultar HELP al cambiar de pregunta
    helpContainer.classList.add("hidden");
    showQuestion();
  }

  /* --------------------------
     Pasapalabra
  -------------------------- */
  function passQuestion() {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue.shift();
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.add("pasapalabra");
    queue.push(currentIdx);
    // Ocultar HELP al pasar de pregunta
    helpContainer.classList.add("hidden");
    showQuestion();
  }

  /* --------------------------
     HELP (máx 2 veces)
     El cartel HELP se muestra a la derecha del rosco y permanece hasta que se responda o se pase la pregunta.
  -------------------------- */
  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    if (helpUses >= 2) {
      helpContainer.innerHTML = `<p style="color: #f33; font-weight: bold;">Solo se puede usar HELP 2 veces</p>`;
      helpContainer.classList.remove("hidden");
      return;
    }
    helpUses++;
    const currentIdx = queue[0];
    const correctAnswer = questions[currentIdx].respuesta;
    const hint = correctAnswer.substring(0, 3);
    helpContainer.innerHTML = `<p><strong>Pista:</strong> Las primeras 3 letras son <span style="color:#0f0; font-weight:bold;">"${hint}"</span></p>`;
    helpContainer.classList.remove("hidden");
  });

  /* --------------------------
     Fuzzy matching: distancia de Levenshtein
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

  function isAnswerSimilar(userAnswer, correctAnswer) {
    const distance = levenshteinDistance(userAnswer, correctAnswer);
    return distance <= 2 || distance / correctAnswer.length < 0.3;
  }

  /* --------------------------
     Finalizar Juego
     Se muestran estadísticas y un modal de errores, y se redirige automáticamente al ranking global.
  -------------------------- */
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;
    helpBtn.disabled = true;

    const endTime = Date.now();
    totalTime = (endTime - startTime) / 1000;
    const averageTime = totalAnswered > 0 ? (totalTime / totalAnswered).toFixed(2) : 0;

    const modal = document.createElement("div");
    modal.classList.add("game-over-modal");

    let modalContent = `
      <div class="modal-content">
        <h2>Juego Finalizado</h2>
        <p><strong>Correctas:</strong> ${correctCount}</p>
        <p><strong>Erróneas:</strong> ${wrongCount}</p>
        <p><strong>Preguntas respondidas:</strong> ${totalAnswered}</p>
        <p><strong>Tiempo promedio por pregunta:</strong> ${averageTime}s</p>
        <hr>
        <h3>Respuestas Incorrectas:</h3>
        <ul class="incorrect-list">
    `;
    const letters = getLetterElements();
    questions.forEach((q, i) => {
      if (letters[i].classList.contains("wrong")) {
        modalContent += `<li><strong>${q.letra}:</strong> ${q.pregunta}<br>
                         <span class="correct-answer">Respuesta correcta: ${q.respuesta}</span></li>`;
      }
    });
    modalContent += `
        </ul>
        <button id="close-modal">Cerrar</button>
      </div>
    `;
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);

    document.getElementById("close-modal").addEventListener("click", () => {
      modal.remove();
      saveGlobalRanking();
      showStats(averageTime);
      // Redirigir automáticamente al ranking global
      window.location.href = "ranking.html";
    });
  }

  /* Guardar ranking global (incluye historial básico por IP) */
  function saveGlobalRanking() {
    const personalStats = {
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      total: totalAnswered,
      date: new Date().toLocaleString(),
      ip: ""  // Se actualizará en el servidor
    };
    fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalStats)
    }).catch(err => console.error("Error al guardar ranking global:", err));
  }

  /* Mostrar estadísticas en el panel */
  function showStats(averageTime) {
    statsPanel.classList.remove("hidden");
    statsList.innerHTML = `
      <li><strong>Preguntas respondidas:</strong> ${totalAnswered}</li>
      <li><strong>Correctas:</strong> ${correctCount}</li>
      <li><strong>Erróneas:</strong> ${wrongCount}</li>
      <li><strong>Tiempo promedio por pregunta:</strong> ${averageTime}s</li>
    `;
  }

  /* EVENTOS */
  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkAnswer();
    }
  });

  loadQuestions();
});
