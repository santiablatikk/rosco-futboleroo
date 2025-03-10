document.addEventListener("DOMContentLoaded", () => {
  // Elementos de Login y Juego
  const loginScreen = document.getElementById("login-screen");
  const gameScreen = document.getElementById("game-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const userDisplay = document.getElementById("user-display");

  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const submitBtn = document.getElementById("submit-answer");
  const passBtn = document.getElementById("pass");
  const startBtn = document.getElementById("start-game");
  const timerEl = document.getElementById("timer");

  // Variables del juego
  let questions = [];         // Array final (una pregunta por letra)
  let groupedQuestions = {};  // Objeto para agrupar por letra
  let currentIndex = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";

  // --------------------------
  //  Pantalla de Login
  // --------------------------
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

  // --------------------------
  //  Normalizar texto (sin tildes)
  // --------------------------
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // --------------------------
  //  Cargar Preguntas
  // --------------------------
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();

      // Agrupar por letra
      data.rosco_futbolero.forEach(q => {
        const letter = q.letra.toUpperCase();
        if (!groupedQuestions[letter]) {
          groupedQuestions[letter] = [];
        }
        groupedQuestions[letter].push(q);
      });

      // Para cada letra, elegir una al azar
      const letters = Object.keys(groupedQuestions).sort();
      letters.forEach(letter => {
        const arr = groupedQuestions[letter];
        const randomIndex = Math.floor(Math.random() * arr.length);
        questions.push(arr[randomIndex]);
      });

      // Ordenar por letra
      questions.sort((a, b) => a.letra.localeCompare(b.letra));

      drawRosco();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  // --------------------------
  //  Dibujar Rosco (sentido anti-horario)
  // --------------------------
  function drawRosco() {
    roscoContainer.innerHTML = "";
    const total = questions.length;
    const radius = 240;      // Aumentamos el radio para más separación
    const centerX = 325;     // Mitad de 650px
    const centerY = 325;     // Mitad de 650px
    // Para sentido anti-horario, restamos el ángulo desde -90°
    const offsetAngle = -Math.PI / 2;

    questions.forEach((q, i) => {
      // Sentido anti-horario: restamos el ángulo
      const angle = offsetAngle - (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - 40; // 80px/2
      const y = centerY + radius * Math.sin(angle) - 40;
      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = q.letra;
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      letterDiv.setAttribute("id", `letter-${i}`);
      roscoContainer.appendChild(letterDiv);
    });
  }

  // --------------------------
  //  Mostrar Pregunta Actual
  // --------------------------
  function showQuestion() {
    if (currentIndex >= questions.length) {
      endGame();
      return;
    }
    const currentQuestion = questions[currentIndex];
    questionEl.textContent = `${currentQuestion.letra} ➜ ${currentQuestion.pregunta}`;
    answerInput.value = "";
    answerInput.focus();
  }

  // --------------------------
  //  Validar Respuesta
  // --------------------------
  function checkAnswer() {
    const userAnswer = normalizeString(answerInput.value.trim());
    const currentQuestion = questions[currentIndex];
    const correctAnswer = normalizeString(currentQuestion.respuesta.trim());
    const letterDiv = document.getElementById(`letter-${currentIndex}`);
    letterDiv.classList.remove("pass");

    if (userAnswer === correctAnswer) {
      letterDiv.classList.add("correct");
      correctCount++;
    } else {
      letterDiv.classList.add("wrong");
      wrongCount++;
      if (wrongCount >= 3) {
        endGame();
        return;
      }
    }
    currentIndex++;
    showQuestion();
  }

  // --------------------------
  //  Pasapalabra: Saltar Pregunta
  // --------------------------
  function passQuestion() {
    const letterDiv = document.getElementById(`letter-${currentIndex}`);
    letterDiv.classList.add("pass");
    questions.push(questions[currentIndex]);
    questions.splice(currentIndex, 1);
    showQuestion();
  }

  // --------------------------
  //  Actualizar Temporizador
  // --------------------------
  function updateTimer() {
    timeLeft--;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    if (timeLeft <= 0) {
      endGame();
    }
  }

  // --------------------------
  //  Iniciar Juego
  // --------------------------
  function startGame() {
    currentIndex = 0;
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

  // --------------------------
  //  Finalizar Juego
  // --------------------------
  function endGame() {
    clearInterval(timerInterval);
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;
  }

  // --------------------------
  //  Eventos
  // --------------------------
  startBtn.addEventListener("click", startGame);
  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);
  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  });

  // Cargar preguntas al inicio
  loadQuestions();
});
