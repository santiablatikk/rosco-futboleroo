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

  // --- Elementos del modal (de pérdida por 3 errores) ---
  const lossModal = document.getElementById("lossModal");
  const incorrectList = document.getElementById("incorrectList");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  // --- Variables del juego ---
  let questions = []; // Array de objetos { letra, pregunta, respuesta }
  let queue = [];     // Cola de índices de las preguntas pendientes
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let incorrectResponses = []; // Se almacenarán los errores: { letter, question, userAnswer, correctAnswer }

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
     Se espera que el endpoint /questions retorne:
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
      // Inicializar la cola con índices de cada pregunta
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
    const containerSize = 400; // Coincide con max-width en CSS (.rosco-container)
    const radius = 170;        // Valor ajustado para que las letras queden distribuidas sin superponerse
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2;
    
    // Para cada letra, calcular su posición
    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - 25; // 25: mitad del tamaño de la letra (50/2)
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
      // Si se han contestado todas las preguntas, terminar el juego normalmente
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
      // Registrar el error solo si la respuesta es incorrecta
      incorrectResponses.push({
        letter: currentQuestion.letra,
        question: currentQuestion.pregunta,
        userAnswer: answerInput.value.trim(),
        correctAnswer: currentQuestion.respuesta
      });
      queue.shift();
      if (wrongCount >= 3) {
        // Si se acumulan 3 errores, mostrar el modal de pérdida (con listado de respuestas incorrectas)
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
    if (queue.length === 0) return;
    const currentIdx = queue.shift();
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.add("pasapalabra");
    // No reproducir sonido para pasapalabra en esta versión
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
    // Reinicializar la cola con índices de todas las preguntas
    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    incorrectResponses = []; // Reiniciar la lista de errores
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
     (Si se agota el tiempo o se responden todas las preguntas)
  -------------------------- */
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;
    questionEl.textContent = `Fin del juego. Correctas: ${correctCount}, Errores: ${wrongCount}`;
    
    // Guardar el puntaje para el ranking en localStorage
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push({
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      date: new Date().toLocaleString()
    });
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));
    
    // Luego de 3 segundos, redirigir a la página de ranking
    setTimeout(() => {
      window.location.href = "ranking.html";
    }, 3000);
  }

  /* --------------------------
     MOSTRAR MODAL DE PÉRDIDA POR 3 ERRORES
  -------------------------- */
  function showLossModal() {
    // Detener el temporizador y ocultar la pantalla de juego
    clearInterval(timerInterval);
    gameScreen.classList.add("hidden");
    
    // Llenar la lista del modal con los errores registrados
    incorrectList.innerHTML = "";
    incorrectResponses.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.letter}: Tu respuesta: "${item.userAnswer}" | Correcta: "${item.correctAnswer}"`;
      incorrectList.appendChild(li);
    });
    
    // Mostrar el modal
    lossModal.classList.remove("hidden");
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  // Iniciar el juego cuando se haga click en el botón centrado sobre el rosco
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
  
  // Reiniciar el juego desde el modal al hacer click en "Volver a Jugar"
  modalCloseBtn.addEventListener("click", () => {
    // Puedes recargar la página o redirigir a index.html para reiniciar
    window.location.href = "index.html";
  });

  // Cargar las preguntas desde el servidor
  loadQuestions();
});
