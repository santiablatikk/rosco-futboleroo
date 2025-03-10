document.addEventListener("DOMContentLoaded", () => {
  // LOGIN
  const loginScreen = document.getElementById("login-screen");
  const gameScreen = document.getElementById("game-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const userDisplay = document.getElementById("user-display");

  // ROSCO
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const submitBtn = document.getElementById("submit-answer");
  const passBtn = document.getElementById("pass");
  const startBtn = document.getElementById("start-game");
  const timerEl = document.getElementById("timer");

  // Variables de juego
  let questions = [];         // Array final (una pregunta por letra)
  let groupedQuestions = {};  // Para agrupar por letra
  let currentIndex = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";

  // 1. LOGIN
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

  // 2. Normalizar texto (quitar tildes)
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // 3. Cargar preguntas (AJUSTA si no usas /questions)
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();

      // data.rosco_futbolero => tu array de preguntas
      data.rosco_futbolero.forEach(q => {
        const letter = q.letra.toUpperCase();
        if (!groupedQuestions[letter]) {
          groupedQuestions[letter] = [];
        }
        groupedQuestions[letter].push(q);
      });

      // Seleccionar 1 pregunta al azar por letra
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

  // 4. Dibujar el Rosco en sentido antihorario
  function drawRosco() {
    roscoContainer.innerHTML = "";
    const total = questions.length;
    const radius = 200;   // Más espacio entre letras
    const centerX = 275;  // Mitad de 550
    const centerY = 275;  // Mitad de 550
    const offsetAngle = -Math.PI / 2; // A arriba (12:00)

    // Sentido antihorario => restamos (i / total)
    questions.forEach((q, i) => {
      const angle = offsetAngle - (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - 30; // 60/2
      const y = centerY + radius * Math.sin(angle) - 30;

      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = q.letra;
      letterDiv.setAttribute("data-index", i);
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      roscoContainer.appendChild(letterDiv);
    });
  }

  // 5. Mostrar pregunta actual
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

  // 6. Validar respuesta
  function checkAnswer() {
    const userAnswer = normalizeString(answerInput.value.trim());
    const currentQuestion = questions[currentIndex];
    const correctAnswer = normalizeString(currentQuestion.respuesta.trim());

    // Seleccionar el div de la letra actual
    const letterDivs = document.querySelectorAll(".letter");
    const letterDiv = letterDivs[currentIndex];
    letterDiv.classList.remove("pasapalabra");

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

  // 7. Pasapalabra (amarillo)
  function passQuestion() {
    const letterDivs = document.querySelectorAll(".letter");
    const letterDiv = letterDivs[currentIndex];
    letterDiv.classList.add("pasapalabra");

    // Mover la pregunta actual al final
    questions.push(questions[currentIndex]);
    questions.splice(currentIndex, 1);
    showQuestion();
  }

  // 8. Temporizador
  function updateTimer() {
    timeLeft--;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    if (timeLeft <= 0) {
      endGame();
    }
  }

  // 9. Iniciar Juego
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

  // 10. Finalizar Juego (redirigir al ranking si deseas)
  function endGame() {
    clearInterval(timerInterval);
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;

    // EJEMPLO: Redirigir a ranking.html (si lo implementas)
    // window.location.href = 'ranking.html';
  }

  // Eventos
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
