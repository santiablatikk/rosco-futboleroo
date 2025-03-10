document.addEventListener("DOMContentLoaded", () => {
  // --- Sonidos ---
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");
  const audioPasapalabra = new Audio("sounds/pasapalabra.mp3");
  const audioTimerBeep = new Audio("sounds/timer-beep.mp3");

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
  let groupedQuestions = {};
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";

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
      data.rosco_futbolero.forEach(q => {
        const letter = q.letra.toUpperCase();
        if (!groupedQuestions[letter]) {
          groupedQuestions[letter] = [];
        }
        groupedQuestions[letter].push(q);
      });

      // Seleccionar 1 pregunta por letra
      const letters = Object.keys(groupedQuestions).sort();
      letters.forEach(letter => {
        const arr = groupedQuestions[letter];
        const randIndex = Math.floor(Math.random() * arr.length);
        questions.push(arr[randIndex]);
      });

      // Ordenar preguntas por letra
      questions.sort((a, b) => a.letra.localeCompare(b.letra));

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
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    const total = questions.length;
    // Ajustar los valores para un rosco más pequeño
    const containerSize = 400; // Se corresponde con el max-width en CSS (.rosco-container)
    const radius = 170;        // Valor ajustado para que visualmente se vea bien
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2;
    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - 25; // 25 = 50/2, mitad del tamaño de la letra
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

  /* --------------------------
     PASAPALABRA
  -------------------------- */
  function passQuestion() {
    if (queue.length === 0) return;
    const currentIdx = queue.shift();
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.add("pasapalabra");
    audioPasapalabra.play();
    queue.push(currentIdx);
    showQuestion();
  }

  /* --------------------------
     TEMPORIZADOR
  -------------------------- */
  function updateTimer() {
    timeLeft--;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    if (timeLeft % 30 === 0 && timeLeft > 0) {
      audioTimerBeep.play();
    }
    if (timeLeft <= 0) {
      endGame();
    }
  }

  /* --------------------------
     INICIAR JUEGO
  -------------------------- */
  function startGame() {
    // Reinicializar la cola con los índices de todas las preguntas
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
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;

    // Guardar datos para el ranking en localStorage
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push({
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));

    setTimeout(() => {
      window.location.href = "ranking.html";
    }, 3000);
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  // Al hacer click en el botón "Iniciar Juego" (centrado sobre el rosco) se oculta y arranca el juego.
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

  // Cargar preguntas desde el servidor
  loadQuestions();
});
