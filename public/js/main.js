document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const timerEl = document.getElementById("timer");
  const startBtn = document.getElementById("start-game");

  // Variables globales
  let questions = [];
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;

  // Sonidos para feedback
  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");

  // Cargar preguntas del servidor
  async function loadQuestions() {
    try {
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      queue = questions.map((_, index) => index);
      drawRosco();
      showQuestion();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      questionEl.textContent = "Error al cargar las preguntas.";
    }
  }

  // Dibujar el rosco
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

  // Mostrar pregunta
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

  // Validar respuesta
  function checkAnswer() {
    if (!answerInput.value.trim()) return;

    const currentIdx = queue[0];
    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswer = questions[currentIdx].respuesta.toLowerCase();

    const letterDiv = document.querySelectorAll(".letter")[currentIdx];

    if (userAnswer === correctAnswer) {
      correctCount++;
      letterDiv.classList.add("correct");
      audioCorrect.play();
    } else {
      wrongCount++;
      letterDiv.classList.add("wrong");
      audioIncorrect.play();
    }

    queue.shift();
    showQuestion();
  }

  // Temporizador
  function startTimer() {
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `Tiempo: ${timeLeft}s`;
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  // Finalizar juego
  function endGame() {
    clearInterval(timerInterval);
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Incorrectas: ${wrongCount}`;
    answerInput.disabled = true;
  }

  // Iniciar juego
  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";
    answerInput.disabled = false;
    loadQuestions();
    startTimer();
  });

  // Responder al presionar Enter
  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkAnswer();
  });
});
