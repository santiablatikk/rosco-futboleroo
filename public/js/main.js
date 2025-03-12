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
  const themeSelector = document.getElementById("theme-selector");

  // --- Elementos del juego ---
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const submitBtn = document.getElementById("submit-answer");
  const passBtn = document.getElementById("pass");
  const helpBtn = document.getElementById("help");
  const startBtn = document.getElementById("start-game");
  const timerEl = document.getElementById("timer");

  // --- Variables del juego ---
  let questions = [];         // Array de objetos { letra, pregunta, respuesta }
  let queue = [];             // Cola de índices pendientes
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = 240;
  let timerInterval = null;
  let username = "";
  let gameStarted = false;
  let achievements = {
    perfectGame: false,       // Sin errores
    twentyCorrect: false      // 20 respuestas correctas en total
  };
  let totalAnswered = 0;

  /* --------------------------
     CALCULAR DISTANCIA DE LEVENSHTEIN (para fuzzy matching)
  -------------------------- */
  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // sustitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function isAnswerSimilar(userAnswer, correctAnswer) {
    const distance = levenshteinDistance(userAnswer, correctAnswer);
    // Si la distancia es menor o igual a 2 o es menos del 30% de la longitud, consideramos similar
    return distance <= 2 || distance / correctAnswer.length < 0.3;
  }

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
      queue = [];
      for (let i = 0; i < questions.length; i++) {
        queue.push(i);
      }
      drawRosco();
      updateActiveLetter();
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }

  /* --------------------------
     DIBUJAR ROSCO (sentido HORARIO)
  -------------------------- */
  function drawRosco() {
    roscoContainer.innerHTML = "";
    let containerSize, letterSize, radius;
    if (window.innerWidth >= 600) {
      containerSize = 400;
      letterSize = 36;
      radius = 210;
    } else {
      containerSize = 300;
      letterSize = 28;
      radius = 140;
    }
    roscoContainer.style.width = containerSize + "px";
    roscoContainer.style.height = containerSize + "px";
    const total = questions.length;
    const halfLetter = letterSize / 2;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const offsetAngle = -Math.PI / 2;
    for (let i = 0; i < total; i++) {
      const angle = offsetAngle + (i / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) - halfLetter;
      const y = centerY + radius * Math.sin(angle) - halfLetter;
      const letterDiv = document.createElement("div");
      letterDiv.classList.add("letter");
      letterDiv.textContent = questions[i].letra;
      letterDiv.setAttribute("data-index", i);
      letterDiv.style.width = letterSize + "px";
      letterDiv.style.height = letterSize + "px";
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      roscoContainer.appendChild(letterDiv);
    }
  }

  function getLetterElements() {
    return document.querySelectorAll(".letter");
  }

  /* --------------------------
     MARCAR LETRA ACTIVA
  -------------------------- */
  function updateActiveLetter() {
    const letters = getLetterElements();
    letters.forEach(l => l.classList.remove("active"));
    if (queue.length > 0) {
      const activeIdx = queue[0];
      letters[activeIdx].classList.add("active");
    }
  }

  /* --------------------------
     MOSTRAR PREGUNTA ACTUAL
  -------------------------- */
  function showQuestion() {
    if (!gameStarted || queue.length === 0) return;
    updateActiveLetter();
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    questionEl.textContent = `${currentQuestion.letra} ➜ ${currentQuestion.pregunta}`;
    answerInput.value = "";
    answerInput.focus();
  }

  /* --------------------------
     BOTÓN HELP (mostrar pista: primeras 3 letras)
  -------------------------- */
  let helpCount = 0;

helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    if (helpCount < 2) {
        const currentIdx = queue[0];
        const currentQuestion = questions[currentIdx];
        const hint = currentQuestion.respuesta.substring(0, 3);
        alert(`Pista: Las primeras 3 letras son "${hint}"`);
        helpCount++;
        if (helpCount >= 2) {
            helpBtn.disabled = true; // Deshabilitar después de la segunda ayuda
        }
    } else {
        alert("Ya has usado todas tus ayudas.");
    }
});

  /* --------------------------
     VALIDAR RESPUESTA
     Utiliza fuzzy matching para respuestas similares
  -------------------------- */
  function checkAnswer() {
    if (!gameStarted || answerInput.value.trim() === "" || queue.length === 0) return;
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    const userAnswer = normalizeString(answerInput.value.trim());
    const correctAnswer = normalizeString(currentQuestion.respuesta.trim());
    const letterDiv = getLetterElements()[currentIdx];
    letterDiv.classList.remove("pasapalabra");
    
    // Validar: exacto o similar
    if (userAnswer === correctAnswer || isAnswerSimilar(userAnswer, correctAnswer)) {
      letterDiv.classList.add("correct");
      audioCorrect.play();
      correctCount++;
    } else {
      letterDiv.classList.add("wrong");
      audioIncorrect.play();
      wrongCount++;
      if (wrongCount >= 3) {
        endGame();
        return;
      }
    }
    totalAnswered++;
    queue.shift();
    showQuestion();
  }

  /* --------------------------
     PASAPALABRA
  -------------------------- */
  function passQuestion() {
    if (!gameStarted || queue.length === 0) return;
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
    // Reiniciar la cola sin mover el rosco (se conserva la posición)
    queue = [];
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    correctCount = 0;
    wrongCount = 0;
    timeLeft = 240;
    totalAnswered = 0;
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
     Se muestran estadísticas personales y un modal con los errores.
  -------------------------- */
  function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;

    // Modal de fin de juego con errores
    const modal = document.createElement("div");
    modal.classList.add("game-over-modal");

    let modalContent = `
      <div class="modal-content">
        <h2>Juego Finalizado</h2>
        <p><strong>Correctas:</strong> ${correctCount}</p>
        <p><strong>Errores:</strong> ${wrongCount}</p>
        <p><strong>Partidas jugadas:</strong> ${totalAnswered}</p>
        <hr>
        <h3>Respuestas Incorrectas:</h3>
        <ul class="incorrect-list">
    `;

    const letters = getLetterElements();
    questions.forEach((q, i) => {
      if (letters[i].classList.contains("wrong")) {
        modalContent += `<li><strong>${q.letra}:</strong> ${q.pregunta}<br>
                         <span class="correct-answer">Respuesta correcta: ${q.respuesta}</span></li>`;
      }
    });
    modalContent += `
        </ul>
        <button id="close-modal">Cerrar</button>
      </div>
    `;
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);

    document.getElementById("close-modal").addEventListener("click", () => {
      modal.remove();
      // Guardar en ranking global y redirigir al ranking
      savePersonalStats();
      window.location.href = "ranking.html";
    });

    // Guardar estadísticas personales en localStorage
    savePersonalStats();
  }

  function savePersonalStats() {
    const personalStats = {
      name: username,
      correct: correctCount,
      wrong: wrongCount,
      total: totalAnswered,
      date: new Date().toLocaleString()
    };
    // Se puede guardar en localStorage o enviarlo al servidor para ranking global
    // Aquí lo guardamos en localStorage además de enviarlo al servidor
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    rankingData.push(personalStats);
    localStorage.setItem("roscoRanking", JSON.stringify(rankingData));

    // Enviar al servidor para ranking global (si el endpoint está configurado)
    fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personalStats)
    }).catch(err => console.error("Error al guardar ranking global:", err));
  }

  /* --------------------------
     EVENTOS
  -------------------------- */
  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none"; // El botón permanece fijo, se oculta al iniciar
    startGame();
  });

  submitBtn.addEventListener("click", checkAnswer);
  passBtn.addEventListener("click", passQuestion);

  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkAnswer();
    }
  });

  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue[0];
    const currentQuestion = questions[currentIdx];
    const hint = currentQuestion.respuesta.substring(0, 3);
    alert(`Pista: Las primeras 3 letras son "${hint}"`);
  });

  // Cambio de tema
  const themeselector = document.getElementById("theme-selector");
  themeSelector.addEventListener("change", (e) => {
    document.body.className = ""; // Resetear clases
    const theme = e.target.value;
    if (theme === "claro") {
      document.body.classList.add("theme-claro");
    } else if (theme === "futbol") {
      document.body.classList.add("theme-futbol");
    } else {
      // por defecto, oscuro (no se agrega clase)
    }
  });

  loadQuestions();
});
