document.addEventListener("DOMContentLoaded", () => {
  // --- Sonidos (solo correct e incorrect) ---
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

  // --- Elementos del modal de pérdida ---
  const lossModal = document.getElementById("lossModal");
  const incorrectList = document.getElementById("incorrectList");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  // --- Variables del juego ---
  let questions = []; // Array de objetos { letra, pregunta, respuesta }
  let queue = [];     // Cola de índices pendientes de preguntas
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let incorrectResponses = []; // Almacena errores: { letter, question, userAnswer, correctAnswer }
  let gameStarted = false;     // Se establecerá en true al iniciar el juego

  // Aseguramos que el modal esté oculto al inicio
  lossModal.classList.add("hidden");

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
      console.log("Preguntas cargadas:", questions);
      if (questions.length === 0) {
        console.error("No se recibieron preguntas");
        return;
      }
      // Inicializar la cola con los índices de todas las preguntas
      for (let i = 0; i < questions.length; i++) {
        queue.push(i);
      }
      drawRosco();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  /* --------------------------
     DIBUJAR ROSCO
     Se usa containerSize = 400 y radius = 170 para un rosco compacto
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    const total = questions.length;
    const containerSize = 400; // Debe coincidir con el CSS (.rosco-container)
    const radius = 170;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2;
    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - 25;
      const y = centerY + radius * Math.sin(angle) - 25;
      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = questions[i].letra;
      letterDiv.setAttribute("data-index", i);
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      roscoContainer.appendChild(letterDiv);
    }
  }

  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* --------------------------
     MOSTRAR PREGUNTA
  -------------------------- */
  function showQuestion() {
    if (!gameStarted) return; // Solo si el juego ha comenzado
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

  /* --------------------------
     VALIDAR RESPUESTA
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted) return;
    if (answerInput.value.trim() === "") return; // Evitar respuestas vacías

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
      incorrectResponses.push({
        letter: currentQuestion.letra,
        question: currentQuestion.pregunta,
        userAnswer: answerInput.value.trim(),
        correctAnswer: currentQuestion.respuesta
      });
      queue.shift();
      if (wrongCount >= 3) {
        showLossModal();
        return;
      }
    }
    showQuestion();
  }

  /* --------------------------
     PASAPALABRA
  -------------------------- */
  function passQuestion() {
    if (!gameStarted) return;
    if (queue.length === 0) return;
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
    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    incorrectResponses = [];
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
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push({
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));
    // Redirigir al ranking después de 3 segundos
    setTimeout(() => {
      window.location.href = "ranking.html";
    }, 3000);
  }

  /* --------------------------
     MOSTRAR MODAL DE PÉRDIDA (3 errores)
  -------------------------- */
  function showLossModal() {
    clearInterval(timerInterval);
    gameScreen.classList.add("hidden");
    incorrectList.innerHTML = "";
    incorrectResponses.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.letter}: Tu respuesta: "${item.userAnswer}" | Correcta: "${item.correctAnswer}"`;
      incorrectList.appendChild(li);
    });
    lossModal.classList.remove("hidden");
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";
    startGame();
  });
  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);
  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  });
  modalCloseBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // Cargar las preguntas al iniciar el juego
  loadQuestions();
});
