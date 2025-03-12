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

  // --- Elementos del juego ---
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const submitBtn = document.getElementById("submit-answer");
  const passBtn = document.getElementById("pass");
  const helpBtn = document.getElementById("help");
  const startBtn = document.getElementById("start-game");
  const timerEl = document.getElementById("timer");
  const helpContainer = document.getElementById("help-container");

  // --- Variables del juego ---
  let questions = [];         // Array de objetos { letra, pregunta, respuesta }
  let queue = [];             // Cola de índices pendientes
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;
  let helpUses = 0;          // Cantidad de veces que se usó HELP (máx 2)

  /* --------------------------
     LOGIN
  -------------------------- */
  loginBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (!username) {
      alert("Por favor, ingresa un nombre de usuario.");
      return;
    }
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    userDisplay.textContent = `Jugador: ${username}`;
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

    // Ajustar para móvil si deseas
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
     OBTENER LETRAS
  -------------------------- */
  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* --------------------------
     MARCAR LETRA ACTIVA
  -------------------------- */
  function updateActiveLetter() {
    const letters = getLetterElements();
    letters.forEach(l => l.classList.remove("active"));
    if (queue.length > 0) {
      const activeIdx = queue[0];
      letters[activeIdx].classList.add("active");
    }
  }

  /* --------------------------
     MOSTRAR PREGUNTA ACTUAL
  -------------------------- */
  function showQuestion() {
    if (!gameStarted || queue.length === 0) return;
    updateActiveLetter();
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    questionEl.textContent = `${currentQuestion.letra} ➜ ${currentQuestion.pregunta}`;
    answerInput.value = "";
    answerInput.focus();
  }

  /* --------------------------
     INICIAR JUEGO
  -------------------------- */
  function startGame() {
    gameStarted = true;
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    helpUses = 0;
    answerInput.disabled = false;
    submitBtn.disabled = false;
    passBtn.disabled = false;
    helpBtn.disabled = false;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);

    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    showQuestion();
  }

  /* --------------------------
     VALIDAR RESPUESTA
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted || answerInput.value.trim() === "" || queue.length === 0) return;
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    const userAnswer = normalizeString(answerInput.value.trim());
    const correctAnswer = normalizeString(currentQuestion.respuesta.trim());
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.remove("pasapalabra");

    if (userAnswer === correctAnswer) {
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
    showQuestion();
  }

  /* --------------------------
     PASAPALABRA
  -------------------------- */
  function passQuestion() {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue.shift();
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.add("pasapalabra");
    queue.push(currentIdx);
    showQuestion();
  }

  /* --------------------------
     HELP (máx 2 veces)
  -------------------------- */
  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;

    // Si ya se usó 2 veces, mostrar cartel
    if (helpUses >= 2) {
      helpContainer.innerHTML = `
        <p style="color: #f33; font-weight: bold;">
          Solo se puede usar HELP 2 veces
        </p>
      `;
      helpContainer.classList.remove("hidden");
      setTimeout(() => {
        helpContainer.classList.add("hidden");
      }, 2000);
      return;
    }

    helpUses++;
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    const correctAnswer = currentQuestion.respuesta;
    const hint = correctAnswer.substring(0, 3);

    helpContainer.innerHTML = `
      <p>
        <strong>Pista:</strong> Las primeras 3 letras son 
        <span style="color:#0f0;font-weight:bold;">"${hint}"</span>
      </p>
    `;
    helpContainer.classList.remove("hidden");
    // Ocultar la pista después de 3s
    setTimeout(() => {
      helpContainer.classList.add("hidden");
    }, 3000);
  });

  /* --------------------------
     END GAME
  -------------------------- */
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;
    helpBtn.disabled = true;

    const modal = document.createElement("div");
    modal.classList.add("game-over-modal");

    let modalContent = `
      <div class="modal-content">
        <h2>Juego Finalizado</h2>
        <p><strong>Correctas:</strong> ${correctCount}</p>
        <p><strong>Errores:</strong> ${wrongCount}</p>
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
      // Redirigir al ranking
      window.location.href = "ranking.html";
    });

    // Guardar ranking global
    const personalStats = {
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString()
    };
    fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalStats)
    }).catch(err => console.error("Error al guardar ranking global:", err));
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none"; // Botón no se mueve, se oculta al iniciar
    startGame();
  });

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
