document.addEventListener("DOMContentLoaded", () => {
  // --- Sonidos (correcto e incorrecto) ---
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
  let questions = [];
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;

  /* LOGIN */
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

  /* NORMALIZAR TEXTO (quitar tildes y minúsculas) */
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  /* CARGAR PREGUNTAS */
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      console.log("Preguntas cargadas:", questions);
      if (questions.length === 0) {
        console.error("No se recibieron preguntas");
        return;
      }
      queue = questions.map((_, index) => index);
      drawRosco();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      questionEl.textContent = "Error al cargar las preguntas.";
    }
  }

  /* DIBUJAR ROSCO */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    const containerSize = Math.min(400, window.innerWidth * 0.8);
    const letterSize = containerSize / 12;
    const radius = (containerSize / 2) - (letterSize / 2);

    roscoContainer.style.width = `${containerSize}px`;
    roscoContainer.style.height = `${containerSize}px`;

    const totalLetters = questions.length;
    const angleStep = (2 * Math.PI) / totalLetters;

    questions.forEach((question, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = containerSize / 2 + radius * Math.cos(angle) - letterSize / 2;
      const y = containerSize / 2 + radius * Math.sin(angle) - letterSize / 2;

      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = question.letra;
      letterDiv.style.width = `${letterSize}px`;
      letterDiv.style.height = `${letterSize}px`;
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;

      roscoContainer.appendChild(letterDiv);
    });
  }

  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* MOSTRAR PREGUNTA ACTUAL */
  function showQuestion() {
    if (!gameStarted) return;
    if (queue.length === 0) {
      endGame();
      return;
    }
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    questionEl.textContent = `${currentQuestion.letra} ➜ ${currentQuestion.pregunta}`;
    answerInput.value = "";
    answerInput.focus();
  }

  /* VALIDAR RESPUESTA */
  function checkAnswer() {
    if (!gameStarted) return;
    if (answerInput.value.trim() === "") return;
    if (queue.length === 0) return;

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
      queue.shift();
      if (wrongCount >= 3) {
        endGame();
        return;
      }
    }
    showQuestion();
  }

  /* PASAPALABRA: mover la pregunta al final y marcar la letra */
  function passQuestion() {
    if (!gameStarted) return;
    if (queue.length === 0) return;
    const currentIdx = queue.shift();
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.add("pasapalabra");
    queue.push(currentIdx);
    showQuestion();
  }

  /* TEMPORIZADOR */
  function updateTimer() {
    if (!gameStarted) return;
    timeLeft--;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    if (timeLeft <= 0) {
      endGame();
    }
  }

  /* INICIAR JUEGO */
  startBtn.addEventListener("click", () => {
    gameStarted = true;
    // Reiniciar la cola de preguntas
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
  });

  /* EVENTOS */
  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);
  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkAnswer();
  });

  /* GUARDAR RESULTADO EN RANKING Y REDIRIGIR */
  function saveRanking() {
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push({
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString(),
    });
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));
    // Redirigir a ranking después de 3 segundos
    setTimeout(() => {
      window.location.href = "ranking.html";
    }, 3000);
  }

  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;
    saveRanking();
  }

  // Cargar las preguntas al iniciar
  loadQuestions();
});
