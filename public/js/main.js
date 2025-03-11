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
  let questions = [];
  let queue = [];
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
      for (let i = 0; i < questions.length; i++) queue.push(i);
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
    let containerSize = window.innerWidth >= 600 ? 400 : 300;
    let letterSize = window.innerWidth >= 600 ? 40 : 30;
    let radius = window.innerWidth >= 600 ? 175 : 135;

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
      letterDiv.setAttribute("data-index", i);
      letterDiv.style.width = `${letterSize}px`;
      letterDiv.style.height = `${letterSize}px`;
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
    if (!gameStarted || queue.length === 0) return;
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
    } else {
      letterDiv.classList.add("wrong");
      audioIncorrect.play();
      wrongCount++;
    }

    queue.shift();
    if (wrongCount >= 3) endGame();
    else showQuestion();
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
            <h3>Respuestas incorrectas:</h3>
            <ul class="incorrect-list">
    `;

    let wrongAnswers = questions.filter((q, index) =>
      getLetterElements()[index].classList.contains("wrong")
    );

    if (wrongAnswers.length > 0) {
      wrongAnswers.forEach(q => {
        modalContent += `<li><strong>${q.letra}:</strong> ${q.pregunta} <br> 
                         <span class="correct-answer">✔ Respuesta correcta: ${q.respuesta}</span></li>`;
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

    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push({
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString(),
    });
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";
    gameStarted = true;
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    answerInput.disabled = false;
    submitBtn.disabled = false;
    passBtn.disabled = false;
    timerEl.textContent = `Tiempo: ${timeLeft}s`;
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      if (timeLeft <= 0) endGame();
    }, 1000);
    showQuestion();
  });

  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", () => {
    if (queue.length > 0) queue.push(queue.shift());
    showQuestion();
  });

  loadQuestions();
});
