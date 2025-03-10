document.addEventListener("DOMContentLoaded", () => {
  // Elementos de Login y Juego
  const loginScreen = document.getElementById("login-screen");
  const gameScreen = document.getElementById("game-screen");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const userDisplay = document.getElementById("user-display");

  // Elementos del juego
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const submitBtn = document.getElementById("submit-answer");
  const passBtn = document.getElementById("pass");
  const startBtn = document.getElementById("start-game");
  const timerEl = document.getElementById("timer");

  // Variables de juego
  let questions = [];         // Array de preguntas seleccionadas
  let groupedQuestions = {};  // Objeto para agrupar preguntas por letra
  let queue = [];             // Cola de índices pendientes
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";

  /* --------------------------
     PANTALLA DE LOGIN
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
     NORMALIZAR TEXTO (sin tildes)
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

      // Agrupar preguntas por letra
      data.rosco_futbolero.forEach(q => {
        const letter = q.letra.toUpperCase();
        if (!groupedQuestions[letter]) {
          groupedQuestions[letter] = [];
        }
        groupedQuestions[letter].push(q);
      });

      // Seleccionar 1 pregunta al azar por cada letra
      const letters = Object.keys(groupedQuestions).sort();
      letters.forEach(letter => {
        const arr = groupedQuestions[letter];
        const randomIndex = Math.floor(Math.random() * arr.length);
        questions.push(arr[randomIndex]);
      });

      // Ordenar las preguntas por letra (A, B, C, ...)
      questions.sort((a, b) => a.letra.localeCompare(b.letra));

      // Inicializar la cola con los índices de las preguntas
      queue = [];
      for (let i = 0; i < questions.length; i++) {
        queue.push(i);
      }

      drawRosco();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  /* --------------------------
     DIBUJAR EL ROSCO (sentido HORARIO)
     (A en la parte superior, y avanzando en sentido horario)
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    const total = questions.length;
    const radius = 220;    // Mayor radio para más separación
    const containerSize = 550;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2; // A en la parte superior

    // Usar sentido HORARIO: sumamos el ángulo
    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - 30; // 60px / 2
      const y = centerY + radius * Math.sin(angle) - 30;
      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.innerText = questions[i].letra;
      letterDiv.setAttribute("data-index", i);
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      roscoContainer.appendChild(letterDiv);
    }
  }

  /* Obtener la lista de elementos .letter (ya dibujados) */
  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* --------------------------
     MOSTRAR PREGUNTA ACTUAL (usando la cola)
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
    const letterElements = getLetterElements();
    const letterDiv = letterElements[currentIdx];

    // Quitar el estado pasapalabra si existe
    letterDiv.classList.remove("pasapalabra");

    if (userAnswer === correctAnswer) {
      letterDiv.classList.add("correct");
      correctCount++;
      // Eliminar la pregunta de la cola
      queue.shift();
    } else {
      letterDiv.classList.add("wrong");
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
     PASAPALABRA: Marcar en amarillo y mover la pregunta al final
  -------------------------- */
  function passQuestion() {
    if (queue.length === 0) return;
    const currentIdx = queue.shift(); // Eliminar de la cabeza
    const letterElements = getLetterElements();
    const letterDiv = letterElements[currentIdx];
    letterDiv.classList.add("pasapalabra");
    // Agregar el índice al final de la cola
    queue.push(currentIdx);
    showQuestion();
  }

  /* --------------------------
     TEMPORIZADOR
  -------------------------- */
  function updateTimer() {
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
    // Resetear variables
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
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;

    // Redirigir a la página de ranking (si ya la implementas)
    // window.location.href = "ranking.html";
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  startBtn.addEventListener("click", startGame);
  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);
  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  });

  // Cargar las preguntas al inicio
  loadQuestions();
});
