document.addEventListener("DOMContentLoaded", () => {
  // =============================
  // Sonidos
  // =============================
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");

  // =============================
  // Elementos del DOM
  // =============================
  // Pantallas y Login
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

  // =============================
  // Variables del juego
  // =============================
  let questions = [];
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;

  // =============================
  // Funciones Utilitarias
  // =============================
  // Normaliza un string (quita acentos, convierte a minúsculas)
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // =============================
  // Funciones del Login
  // =============================
  function handleLogin() {
    username = usernameInput.value.trim();
    if (!username) {
      alert("Por favor, ingresa un nombre de usuario.");
      return;
    }
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    userDisplay.textContent = `Jugador: ${username}`;
  }

  loginBtn.addEventListener("click", handleLogin);
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  });

  // =============================
  // Cargar Preguntas
  // =============================
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      if (!Array.isArray(questions) || questions.length === 0) {
        console.error("No se recibieron preguntas");
        return;
      }
      // Inicializamos la cola con los índices de cada pregunta.
      queue = questions.map((_, i) => i);
      drawRosco();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  // =============================
  // Dibujar el Rosco (se ejecuta solo una vez)
  // =============================
  function getDimensions() {
    const isDesktop = window.innerWidth >= 600;
    return {
      containerSize: isDesktop ? 400 : 300,
      letterSize: isDesktop ? 40 : 30,
      radius: isDesktop ? 175 : 135,
    };
  }

  function drawRosco() {
    const { containerSize, letterSize, radius } = getDimensions();
    roscoContainer.innerHTML = "";
    roscoContainer.style.width = `${containerSize}px`;
    roscoContainer.style.height = `${containerSize}px`;

    const total = questions.length;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2;

    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - letterSize / 2;
      const y = centerY + radius * Math.sin(angle) - letterSize / 2;

      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = questions[i].letra;
      letterDiv.dataset.index = i;
      letterDiv.style.width = `${letterSize}px`;
      letterDiv.style.height = `${letterSize}px`;
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      roscoContainer.appendChild(letterDiv);
    }
  }

  // Obtiene la letra (div) correspondiente a un índice.
  function getLetterElementByIndex(index) {
    return document.querySelector(`.letter[data-index="${index}"]`);
  }

  // Elimina la clase "active" de todas las letras.
  function clearActiveLetter() {
    const letters = document.querySelectorAll(".letter");
    letters.forEach(letter => letter.classList.remove("active"));
  }

  // =============================
  // Mostrar y Validar Preguntas
  // =============================
  function showQuestion() {
    if (!gameStarted || queue.length === 0) return;
    const currentIndex = queue[0];
    const currentQuestion = questions[currentIndex];
    questionEl.textContent = `${currentQuestion.letra} ➜ ${currentQuestion.pregunta}`;
    answerInput.value = "";
    answerInput.focus();
    // Establece el efecto activo en la letra correspondiente.
    clearActiveLetter();
    const activeLetter = getLetterElementByIndex(currentIndex);
    if (activeLetter) {
      activeLetter.classList.add("active");
    }
  }

  function checkAnswer() {
    if (!gameStarted || answerInput.value.trim() === "" || queue.length === 0)
      return;

    const currentIndex = queue[0];
    const currentQuestion = questions[currentIndex];
    const userAnswer = normalizeString(answerInput.value.trim());
    const correctAnswer = normalizeString(currentQuestion.respuesta.trim());
    const letterDiv = getLetterElementByIndex(currentIndex);

    // Se remueve cualquier marca de "active" (la letra actual ya no estará en foco)
    letterDiv.classList.remove("active");

    if (userAnswer === correctAnswer) {
      letterDiv.classList.add("correct");
      audioCorrect.play();
      correctCount++;
    } else {
      letterDiv.classList.add("wrong");
      audioIncorrect.play();
      wrongCount++;
    }

    // Se elimina la pregunta actual de la cola.
    queue.shift();

    // Finaliza el juego si se acumulan 3 errores o se agotan las preguntas.
    if (wrongCount >= 3 || queue.length === 0) {
      endGame();
    } else {
      showQuestion();
    }
  }

  // =============================
  // Timer
  // =============================
  function startTimer() {
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  // =============================
  // Inicio y Fin del Juego
  // =============================
  function startGame() {
    startBtn.style.display = "none";
    gameStarted = true;
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    answerInput.disabled = false;
    submitBtn.disabled = false;
    passBtn.disabled = false;
    startTimer();
    showQuestion();
  }

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
        <h3>Respuestas incorrectas:</h3>
        <ul class="incorrect-list">
    `;

    const wrongAnswers = questions.filter((q, idx) => {
      const letterEl = getLetterElementByIndex(idx);
      return letterEl && letterEl.classList.contains("wrong");
    });

    if (wrongAnswers.length > 0) {
      wrongAnswers.forEach(q => {
        modalContent += `<li>
          <strong>${q.letra}:</strong> ${q.pregunta}<br>
          <span class="correct-answer">✔ Respuesta correcta: ${q.respuesta}</span>
        </li>`;
      });
    } else {
      modalContent += `<li>¡No hubo errores! 🎉</li>`;
    }

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

    // Enviar el resultado al ranking global del servidor.
    fetch("/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username,
        correct: correctCount,
        wrong: wrongCount,
        date: new Date().toLocaleString()
      })
    })
      .then(response => {
        if (!response.ok) {
          console.error("Error guardando el ranking global.");
        }
      })
      .catch(error => {
        console.error("Error enviando ranking:", error);
      });
  }

  // =============================
  // Eventos del Juego
  // =============================
  startBtn.addEventListener("click", startGame);

  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  });

  submitBtn.addEventListener("click", checkAnswer);

  passBtn.addEventListener("click", () => {
    if (queue.length > 0) {
      // Rotar la pregunta actual al final de la cola sin redibujar el rosco.
      queue.push(queue.shift());
      showQuestion();
    }
  });

  // Cargar todas las preguntas al iniciar la aplicación.
  loadQuestions();
});
