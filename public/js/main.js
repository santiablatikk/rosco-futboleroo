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
  const startBtn = document.getElementById("start-game");
  const timerEl = document.getElementById("timer");

  // --- Variables del juego ---
  let questions = [];         // Array de objetos { letra, pregunta, respuesta }
  let queue = [];             // Cola de índices pendientes
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;

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
     Se espera que /questions retorne:
       { rosco_futbolero: [ { letra, pregunta, respuesta }, ... ] }
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
      // Inicializar la cola con índices de todas las preguntas
      queue = [];
      for (let i = 0; i < questions.length; i++) {
        queue.push(i);
      }
      drawRosco();
      updateActiveLetter(); // Marcar la letra activa
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  /* --------------------------
     DIBUJAR ROSCO (sentido HORARIO)
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    let containerSize, letterSize, radius;
    if (window.innerWidth >= 600) {
      containerSize = 400;
      letterSize = 40;
      radius = 210;
    } else {
      containerSize = 300;
      letterSize = 30;
      radius = 140;
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

  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* --------------------------
     ACTUALIZAR LETRA ACTIVA
     Se marca la letra correspondiente al primer índice de la cola con la clase "active"
  -------------------------- */
  function updateActiveLetter() {
    const letters = getLetterElements();
    // Remover la clase active de todas
    letters.forEach(letter => letter.classList.remove("active"));
    if (queue.length > 0) {
      const activeIdx = queue[0];
      letters[activeIdx].classList.add("active");
    }
  }

  /* --------------------------
     MOSTRAR PREGUNTA ACTUAL (usando la cola)
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
      queue.shift();
    } else {
      letterDiv.classList.add("wrong");
      audioIncorrect.play();
      wrongCount++;
      // Se guarda error si es necesario (puedes ampliar errorLog si lo requieres)
      queue.shift();
      if (wrongCount >= 3) {
        endGame();
        return;
      }
    }
    showQuestion();
  }

  /* --------------------------
     PASAPALABRA: Marcar en amarillo y mover la pregunta al final
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
     TEMPORIZADOR
  -------------------------- */
  function updateTimer() {
    if (!gameStarted) return;
    timeLeft--;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    if (timeLeft <= 0) {
      endGame();
    }
  }

  /* --------------------------
     INICIAR JUEGO
  -------------------------- */
  function startGame() {
    gameStarted = true;
    // Reiniciar la cola
    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    answerInput.disabled = false;
    submitBtn.disabled = false;
    passBtn.disabled = false;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    showQuestion();
  }

  /* --------------------------
     FINALIZAR JUEGO
  -------------------------- */
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;

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

    // Para simplificar, vamos a buscar las letras marcadas como "wrong"
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
      window.location.href = "ranking.html";
    });

    // Guardar el resultado en el ranking (localStorage)
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push({
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  // Iniciar juego con el botón (además, responder con "Enter" en keydown)
  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";
    startGame();
  });

  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);

  // Usar keydown para detectar Enter en lugar de keypress
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkAnswer();
    }
  });

  // Cargar preguntas desde el servidor
  loadQuestions();
});
