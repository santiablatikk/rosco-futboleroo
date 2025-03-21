/* main.js */

// Al inicio del archivo, agregar clase para manejar transiciones
// document.documentElement.classList.add('transitions-enabled');

const translations = {
  es: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Ingresa tu nombre para comenzar:",
    loginButton: "INGRESAR",
    rulesTitle: "Reglas del Juego",
    ruleError: "Máximo de Errores: Hasta 2 errores (al tercer error pierdes).",
    ruleHelp: "HELP: Tienes 2 oportunidades para obtener pista (primeras 3 letras).",
    ruleIncomplete: "Respuesta Incompleta: Puedes enviar respuestas incompletas hasta 2 veces.",
    ruleTimeLabel: "Tiempo:",
    ruleTimeValue: "Fácil: 300'' / Normal: 240'' / Difícil: 200''",
    ruleSpelling: "Ortografía: Se toleran errores mínimos.",
    promoMsg: "¡Más de 1000 preguntas para jugar sin parar!",
    difficultyLabel: "Dificultad:",
    difficultyHard: "Difícil",
    difficultyNormal: "Normal",
    difficultyEasy: "Fácil",
    startGameButton: "INICIAR JUEGO",
    gameTitle: "PASALA CHÉ",
    soundOn: "🔊",
    soundOff: "🔇",
    timer: "Tiempo:",
    questionPlaceholder: 'Presiona "Iniciar Juego" para comenzar',
    helpBtn: "HELP",
    passBtn: "Pasala Ché",
    checkBtn: "Comprobar",
    nav_profile: "Ver Perfil",
    share_button: "Compartir",
    selectLanguage: "Selecciona Idioma:",
  },
  en: {
    loginTitle: "PASALA CHÉ",
    loginPrompt: "Enter your name to start:",
    loginButton: "ENTER",
    rulesTitle: "Game Rules",
    ruleError: "Maximum Mistakes: Up to 2 mistakes (3rd mistake loses).",
    ruleHelp: "HELP: You have 2 chances to get a hint (first 3 letters).",
    ruleIncomplete: "Incomplete Answer: You can submit incomplete answers up to 2 times.",
    ruleTimeLabel: "Time:",
    ruleTimeValue: "Easy: 300'' / Normal: 240'' / Hard: 200''",
    ruleSpelling: "Spelling: Minor mistakes are tolerated.",
    promoMsg: "Over 1000 random questions to play non-stop!",
    difficultyLabel: "Difficulty:",
    difficultyHard: "Hard",
    difficultyNormal: "Normal",
    difficultyEasy: "Easy",
    startGameButton: "START GAME",
    gameTitle: "PASALA CHÉ",
    soundOn: "🔊",
    soundOff: "🔇",
    timer: "Time:",
    questionPlaceholder: 'Press "Start Game" to begin',
    helpBtn: "HELP",
    passBtn: "Pass",
    checkBtn: "Check",
    nav_profile: "View Profile",
    share_button: "Share",
    selectLanguage: "Select Language:",
  },
};

let currentLang = localStorage.getItem("lang") || "es";
let username = "";
let difficulty = "easy";
let currentLetter = 0;
let currentQuestionData = null;
let timer = null;
let timerValue = 130;
let remainingTime = 130;
let gameState = {
    correct: 0,
    incorrect: 0,
    remaining: 27,
    answeredLetters: {},
    helpUsed: false
};

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang] && translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

document.addEventListener("DOMContentLoaded", function () {
  
  // ==================== VARIABLES GLOBALES ====================
  
  // Variables del juego
  let questions = [];
  let queue = [];
  let gameStarted = false;
  let gamePaused = false;
  let timerInterval;
  let startTime;
  let initialTime = 150; // Tiempo predeterminado
  let timeLeft = initialTime;
  let totalAnswered = 0;
  let globalIncompleteAttempts = 0;
  
  // Almacenamiento del estado del juego
  let gameState = {
    answeredLetters: {},   // Letras que ya han sido respondidas
    correctLetters: [],    // Letras respondidas correctamente
    wrongLetters: [],      // Letras respondidas incorrectamente
    passedLetters: []      // Letras que se han pasado
  };
  
  // ==== Obtener elementos de la interfaz ====
  const screens = {
    welcome: document.getElementById("welcome-screen"),
    game: document.getElementById("game-screen"),
    result: document.getElementById("result-screen")
  };
  
  // Elementos de la interfaz
  const roscoContainer = document.getElementById("rosco");
  const answerInput = document.getElementById("answer-input");
  const actionBtn = document.getElementById("action-button");
  const helpBtn = document.getElementById("help-button");
  const timerEl = document.getElementById("timer");
  const hintContainer = document.getElementById("hint-container");
  const incompleteFeedbackContainer = document.getElementById("incomplete-feedback");

  // Inicializar el juego cuando se carga la página
  async function initGame() {
    // Comprobar soporte de pantalla completa
    const fullscreenSupported = document.documentElement.requestFullscreen || 
                               document.documentElement.webkitRequestFullscreen || 
                               document.documentElement.mozRequestFullScreen || 
                               document.documentElement.msRequestFullscreen;

    if (fullscreenSupported) {
      console.log("Pantalla completa soportada");
      // Agregar botón de pantalla completa si es necesario
    }
    
    // Añadir eventos de botones y controles
    setupEventListeners();
    
    // Cargar preguntas para tenerlas listas
    await loadQuestions();
    
    console.log("Juego inicializado correctamente");
  }
  
  // Configurar eventos
  function setupEventListeners() {
    // Evento para el botón de acción (pasar palabra)
    if (actionBtn) {
      actionBtn.addEventListener("click", handleAction);
    }
    
    // Evento para el botón de ayuda
    if (helpBtn) {
      helpBtn.addEventListener("click", showHint);
    }
    
    // Eventos para el campo de respuesta
    if (answerInput) {
      // Procesar respuesta cuando se presiona Enter
      answerInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          checkAnswer();
        }
      });
    }
    
    // Botón para iniciar el juego
    const startGameBtn = document.getElementById("start-game");
    if (startGameBtn) {
      startGameBtn.addEventListener("click", startGame);
    }
    
    // Botón para reiniciar el juego
    const restartBtn = document.getElementById("restart-button");
    if (restartBtn) {
      restartBtn.addEventListener("click", startGame);
    }
  }
  
  // Ocultar todas las pantallas
  function hideAllScreens() {
    Object.values(screens).forEach(screen => {
      if (screen) screen.classList.add("hidden");
    });
  }
  
  // Inicializar el juego cuando se carga la página
  initGame();

  console.log("DOM cargado, inicializando aplicación...");
  
  // Asegurémonos de que las pantallas están configuradas correctamente
  const loginScreen = document.getElementById('login-screen');
  const gameScreen = document.getElementById('game-screen');
  const startContainer = document.getElementById('start-container');
  
  if (loginScreen) {
    console.log("Login screen encontrada, haciéndola visible");
    loginScreen.classList.remove('hidden');
  } else {
    console.error("ADVERTENCIA: No se encontró la pantalla de login");
  }
  
  if (gameScreen) {
    console.log("Game screen encontrada, ocultándola inicialmente");
    gameScreen.classList.add('hidden');
  } else {
    console.error("ADVERTENCIA: No se encontró la pantalla de juego");
  }
  
  setLanguage(currentLang);

  const langSelect = document.getElementById("language");
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }

  const audioCorrect = new Audio("sounds/correct.mp3");
  const audioIncorrect = new Audio("sounds/incorrect.mp3");
  let soundEnabled = true;

  const soundToggle = document.getElementById("sound-toggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundToggle.textContent = soundEnabled
        ? translations[currentLang]?.soundOn || "🔊"
        : translations[currentLang]?.soundOff || "🔇";
      soundToggle.classList.toggle("disabled-sound", !soundEnabled);
    });
  }

  const loginBtn = document.getElementById("login-btn");
  const userDisplay = document.getElementById("user-display");
  const questionEl = document.getElementById("question");
  const passBtn = document.getElementById("pass-btn");
  const checkBtn = document.getElementById("check-btn");
  const shareBtn = document.getElementById("share-btn");

  let correctCount = 0;
  let wrongCount = 0;
  let passCount = 0;
  let baseTime = 240;
  let helpUses = 0;
  let totalTime = 0;
  let achievements = [];

  function setDifficulty() {
    try {
      console.log("Configurando nivel de dificultad...");
      
      // Obtener la dificultad guardada en localStorage (en español)
      const savedDifficulty = localStorage.getItem('difficulty') || 'normal';
      console.log(`Dificultad guardada: ${savedDifficulty}`);
      
      // Mapear dificultades en español a tiempos
      switch (savedDifficulty) {
        case 'facil':
          baseTime = 300;
          difficulty = 'easy';
          console.log("Tiempo fácil: 300 segundos");
          break;
        case 'dificil':
          baseTime = 200;
          difficulty = 'hard';
          console.log("Tiempo difícil: 200 segundos");
          break;
        case 'normal':
        default:
          baseTime = 240;
          difficulty = 'normal';
          console.log("Tiempo normal: 240 segundos");
          break;
      }
      
      timeLeft = baseTime;
      console.log(`Tiempo configurado: ${timeLeft} segundos`);
    } catch (error) {
      console.error("Error al configurar dificultad:", error);
      // Establecer valores predeterminados en caso de error
      baseTime = 240;
      timeLeft = 240;
      difficulty = 'normal';
    }
  }

  function updateActionButton() {
    if (!actionBtn) return;
    
    const val = answerInput.value.trim();
    const newText = val ? "COMPROBAR" : "PASALA CHÉ";
    
    if (actionBtn.textContent !== newText) {
      actionBtn.classList.add("btn-change");
      setTimeout(() => {
        actionBtn.textContent = newText;
        actionBtn.classList.remove("btn-change");
      }, 150);
    }
    
    // Limpiar mensajes de feedback
    if (incompleteFeedbackContainer) {
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    }
  }

  function handleAction() {
    console.log('Manejando acción');
    
    if (!gameStarted || queue.length === 0) {
      console.log('El juego no ha iniciado o no hay preguntas');
      return;
    }
    
    // Limpiar mensajes de feedback
    if (incompleteFeedbackContainer) {
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    }
    
    const val = answerInput.value.trim();
    if (!val) { 
      console.log('Input vacío, pasando palabra');
      passQuestion(); 
    } else { 
      console.log('Comprobando respuesta:', val);
      checkAnswer(); 
    }
  }

  // Función para cargar preguntas desde el servidor
  async function loadQuestions() {
    try {
      console.log("Iniciando carga de preguntas...");
      
      // Cargar preguntas desde el archivo JSON local
      const response = await fetch('/data/questions.json');
      
      if (!response.ok) {
        throw new Error(`Error al cargar preguntas: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Recibidas ${data.length} categorías de preguntas`);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron preguntas válidas');
      }
      
      // Procesar las preguntas para el formato que necesita el juego
      let processedQuestions = [];
      
      data.forEach(category => {
        const letter = category.letra;
        if (category.preguntas && category.preguntas.length > 0) {
          // Seleccionar una pregunta aleatoria para cada letra
          const randomIndex = Math.floor(Math.random() * category.preguntas.length);
          const selectedQuestion = category.preguntas[randomIndex];
          
          processedQuestions.push({
            letra: letter,
            letter: letter, // Mantener ambos formatos por compatibilidad
            pregunta: selectedQuestion.pregunta,
            respuesta: selectedQuestion.respuesta
          });
        }
      });
      
      // Ordenar preguntas alfabéticamente
      processedQuestions.sort((a, b) => a.letra.localeCompare(b.letra));
      
      console.log("Preguntas procesadas:", processedQuestions.length);
      questions = processedQuestions;
      return questions;
    } catch (error) {
      console.error("Error al cargar preguntas:", error.message);
      
      // Si hay un error, crear preguntas de prueba para que el juego funcione
      console.log("Cargando preguntas de demostración...");
      questions = createDummyQuestions();
      return questions;
    }
  }
  
  // Función para crear preguntas de respaldo
  function createDummyQuestions() {
    console.log("Creando preguntas de respaldo");
    const letters = "ABCDEFGHIJLMNOPQRSTU";
    const dummyQuestions = [];
    
    letters.split('').forEach(letter => {
      dummyQuestions.push({
        letter: letter,
        question: `Pregunta de ejemplo para la letra ${letter}`,
        answer: getDefaultAnswerForLetter(letter),
        category: "General",
        pregunta: `Pregunta de ejemplo para la letra ${letter}`,
        respuesta: getDefaultAnswerForLetter(letter),
        letra: letter
      });
    });
    
    return dummyQuestions;
  }
  
  // Función auxiliar para obtener respuestas por defecto según la letra
  function getDefaultAnswerForLetter(letra) {
    const respuestas = {
      'A': 'Argentina',
      'B': 'Brasil',
      'C': 'Colombia',
      'D': 'Dinamarca',
      'E': 'España',
      'F': 'Francia',
      'G': 'Gales',
      'H': 'Holanda',
      'I': 'Italia',
      'J': 'Japón',
      'K': 'Kenia',
      'L': 'Letonia',
      'M': 'México',
      'N': 'Nigeria',
      'O': 'Oceanía',
      'P': 'Portugal',
      'Q': 'Qatar',
      'R': 'Rusia',
      'S': 'Suiza',
      'T': 'Turquía',
      'U': 'Uruguay',
      'V': 'Venezuela',
      'W': 'Wallis y Futuna',
      'X': 'Xiamen FC',
      'Y': 'Yugoslavia',
      'Z': 'Zambia'
    };
    
    return respuestas[letra] || letra + "país";
  }

  function drawRosco() {
    try {
      if (!roscoContainer) {
        console.error("No se encontró el contenedor del rosco");
        return;
      }
      
      // Limpiar el contenedor del rosco
      roscoContainer.innerHTML = "";

      // Configurar tamaños según el dispositivo
      const isMobile = window.innerWidth <= 768;
      const containerSize = isMobile ? 280 : 400;
      const letterSize = isMobile ? 35 : 40;
      const radius = (containerSize / 2) - (letterSize / 2);

      // Verificar que tenemos preguntas
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        console.error("No hay preguntas disponibles para el rosco");
        roscoContainer.innerHTML = "<div class='error'>Error: No hay preguntas disponibles</div>";
        return;
      }
      
      console.log(`Dibujando rosco con ${questions.length} letras`);
      
      // Obtener todas las letras únicas de las preguntas
      const uniqueLetters = [...new Set(questions.map(q => (q.letter || q.letra || "").toUpperCase()))];
      uniqueLetters.sort(); // Ordenar alfabéticamente
      
      // Crear elementos para cada letra
      uniqueLetters.forEach((letter, index) => {
        if (!letter) return; // Omitir si la letra es inválida
        
        // Calcular posición en el círculo
        const angle = (index / uniqueLetters.length) * 2 * Math.PI;
        const x = radius * Math.cos(angle - Math.PI / 2) + containerSize / 2 - letterSize / 2;
        const y = radius * Math.sin(angle - Math.PI / 2) + containerSize / 2 - letterSize / 2;
        
        // Crear el elemento div para la letra
        const letterDiv = document.createElement("div");
        letterDiv.className = "letter";
        letterDiv.textContent = letter;
        letterDiv.dataset.letter = letter;
        letterDiv.dataset.index = index.toString();
        letterDiv.style.left = `${x}px`;
        letterDiv.style.top = `${y}px`;
        letterDiv.style.width = `${letterSize}px`;
        letterDiv.style.height = `${letterSize}px`;
        
        // Si ya se respondió esta letra, actualizar su estado
        if (gameState.answeredLetters && gameState.answeredLetters[letter]) {
          const isCorrect = gameState.correctLetters && gameState.correctLetters.includes(letter);
          const isPassed = gameState.passedLetters && gameState.passedLetters.includes(letter);
          
          if (isCorrect) {
            letterDiv.classList.add("correct");
          } else if (isPassed) {
            letterDiv.classList.add("pasapalabra");
          } else {
            letterDiv.classList.add("wrong");
          }
        }
        
        roscoContainer.appendChild(letterDiv);
      });
      
      // Crear el display para la letra actual
      const currentLetterDisplay = document.createElement("div");
      currentLetterDisplay.id = "current-letter-display";
      roscoContainer.appendChild(currentLetterDisplay);

      // Si hay preguntas, mostrar la primera pregunta activa
      if (queue && queue.length > 0) {
        updateActiveLetter();
        showQuestion();
      }
      
    } catch (error) {
      console.error("Error al dibujar el rosco:", error);
    }
  }

  function updateActiveLetter() {
    try {
    const letters = document.querySelectorAll(".letter");
      letters.forEach((l) => l.classList.remove("active", "current"));
      
      if (queue && queue.length > 0) {
      const currentIdx = queue[0];
        const currentQ = questions[currentIdx];
        const currentLetter = (currentQ.letter || currentQ.letra || "").toUpperCase();
        
        // Encontrar el elemento de letra que corresponde a la letra actual
        const currentLetterElement = document.querySelector(`.letter[data-letter="${currentLetter}"]`);
        
        if (currentLetterElement) {
          currentLetterElement.classList.add("active", "current");
          
          // Mostrar pista si existe
          if (hintContainer && hintContainer.dataset && hintContainer.dataset[currentLetter]) {
            hintContainer.innerHTML = hintContainer.dataset[currentLetter];
        hintContainer.classList.add("show");
          } else if (hintContainer) {
        hintContainer.innerHTML = "";
        hintContainer.classList.remove("show");
      }
        }
      }
    } catch (error) {
      console.error("Error al actualizar letra activa:", error);
    }
  }

  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function showIncompleteMessage() {
    incompleteFeedbackContainer.innerHTML =
      currentLang === "es"
        ? "¡Respuesta incompleta!<br>Intenta nuevamente."
        : "Incomplete answer!<br>Try again.";
    incompleteFeedbackContainer.classList.add("show");
  }

  function showFeedback(letterDiv, success) {
    const feedback = document.createElement("div");
    feedback.classList.add("feedback-message");
    feedback.textContent = success ? "✅" : "❌";
    letterDiv.appendChild(feedback);
    setTimeout(() => feedback.remove(), 800);
  }

  function checkAnswer() {
    try {
      if (!gameStarted || queue.length === 0 || !answerInput || !answerInput.value.trim()) return;
      
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    const userAns = normalizeString(answerInput.value.trim());
      const correctAns = normalizeString(currentQ.respuesta || currentQ.answer || "");
      const currentLetter = (currentQ.letter || currentQ.letra || "").toUpperCase();
      
      if (!correctAns) {
        console.error("No hay respuesta definida para la pregunta:", currentQ);
        return;
      }
      
      console.log("Comprobando respuesta:", userAns, "vs", correctAns);
      
      // Encontrar el elemento de letra que corresponde a la letra actual
      const letterDiv = document.querySelector(`.letter[data-letter="${currentLetter}"]`);
      
      if (!letterDiv) {
        console.error("No se encontró el elemento de letra para:", currentLetter);
        return;
      }
      
    letterDiv.classList.remove("pasapalabra");
      
      // Guardar la respuesta del usuario para esta letra
      if (!gameState.answeredLetters) {
        gameState.answeredLetters = {};
      }
      gameState.answeredLetters[currentLetter] = userAns;
      
      // Manejar respuestas incompletas
    if (userAns !== correctAns && correctAns.includes(userAns) && userAns.length < correctAns.length) {
      if (globalIncompleteAttempts < 2) {
        globalIncompleteAttempts++;
        showIncompleteMessage();
        answerInput.value = "";
        answerInput.focus();
        return;
      }
    }
      
    totalAnswered++;
      
      // Calcular la tolerancia a errores según la longitud y dificultad
    const wordLen = correctAns.length;
    let maxDist = wordLen > 5 ? 2 : 1;
      
      if (difficulty === "easy") { 
        maxDist += 1; 
      } else if (difficulty === "hard") { 
        maxDist = Math.max(maxDist - 1, 0); 
      }
      
    const dist = levenshteinDistance(userAns, correctAns);
      
      // Actualizar contadores en la interfaz
      const correctCountEl = document.getElementById('correct-count');
      const wrongCountEl = document.getElementById('wrong-count');
      
    if (dist <= maxDist) {
        letterDiv.classList.add("correct");
      if (soundEnabled) audioCorrect.play();
      showFeedback(letterDiv, true);
      correctCount++;
        if (correctCountEl) correctCountEl.textContent = correctCount;
    } else {
        letterDiv.classList.add("wrong");
      if (soundEnabled) audioIncorrect.play();
      showFeedback(letterDiv, false);
      wrongCount++;
        if (wrongCountEl) wrongCountEl.textContent = wrongCount;
        
        // Verificar si se alcanzó el máximo de errores
      if (wrongCount >= 3) { 
        endGame(); 
        return; 
      }
    }
      
      // Limpiar mensajes de feedback
      if (incompleteFeedbackContainer) {
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
      }
      if (hintContainer) {
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
      }
      
      // Avanzar a la siguiente pregunta
    queue.shift();
    showQuestion();
    } catch (error) {
      console.error("Error al comprobar respuesta:", error);
    }
  }

  function passQuestion() {
    try {
    if (!gameStarted || queue.length === 0) return;
      
    const idx = queue.shift();
      const currentQ = questions[idx];
      const currentLetter = (currentQ.letter || currentQ.letra || "").toUpperCase();
      const letterDiv = document.querySelector(`.letter[data-letter="${currentLetter}"]`);
      
      if (letterDiv) {
    letterDiv.classList.add("pasapalabra");
      }
      
      // Incrementar contador de pasapalabra
      passCount++;
      const passCountEl = document.getElementById('pass-count');
      if (passCountEl) passCountEl.textContent = passCount;
      
      // Mover la pregunta al final de la cola
    queue.push(idx);
      
      // Limpiar pistas
      if (hintContainer) {
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
      }
      
      // Mostrar siguiente pregunta
      showQuestion();
    } catch (error) {
      console.error("Error al pasar pregunta:", error);
    }
  }

  function showHint() {
    try {
      if (queue.length === 0) return;
      
      // Verificar si aún tiene usos de pista disponibles
    if (helpUses >= 2) {
        console.log("No more hints available");
        // Mostrar mensaje de que no quedan más pistas
        hintContainer.innerHTML = 
          currentLang === "es" 
            ? "¡Ya has usado tus 2 pistas disponibles!" 
            : "You've used your 2 available hints!";
        hintContainer.classList.add("show", "error");
        setTimeout(() => {
          hintContainer.classList.remove("show", "error");
        }, 3000);
      return;
    }
      
      // Incrementar contador de pistas
    helpUses++;
      
      // Obtener respuesta correcta para la letra actual
      const currentIdx = queue[0];
      const currentAnswer = questions[currentIdx].respuesta || questions[currentIdx].answer;
      
      // Tomar las primeras 3 letras como pista
      const hint = currentAnswer.substring(0, 3).toUpperCase();
      
      // Mostrar la pista
      hintContainer.innerHTML = 
        currentLang === "es"
          ? `Pista: La respuesta comienza con <strong>${hint}</strong>`
          : `Hint: The answer starts with <strong>${hint}</strong>`;
      hintContainer.dataset[currentLetter] = hintContainer.innerHTML;
    hintContainer.classList.add("show");
      
      console.log("Hint used:", hint);
    } catch (error) {
      console.error("Error showing hint:", error);
    }
  }

  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  async function updateProfile() {
    const gameTime = Math.floor((Date.now() - startTime) / 1000);
    const gameStats = {
      correct: correctCount,
      wrong: wrongCount,
      total: totalAnswered,
      time: gameTime,
      achievements: achievements,
    };
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameStats),
      });
      showToast("Perfil actualizado.");
    } catch (e) {
      console.error("Error al actualizar el perfil:", e);
      showToast("Error al actualizar el perfil.");
    }
  }

  function endGame() {
    try {
      // Limpiar cualquier timer
      if (timerInterval) clearInterval(timerInterval);
      
      // Calcular tiempo jugado
      const gameEndTime = Date.now();
      const timeUsed = baseTime - timeLeft;
      
      // Contabilizar respuestas
      const passCountEl = document.getElementById('pass-count');
      const passedCount = parseInt(passCountEl.textContent || 0);
      
      // Calcular puntuación
      const baseScore = correctCount * 10;
      const timeBonus = Math.max(0, timeLeft > 0 ? timeLeft / 2 : 0);
      const totalScore = Math.round(baseScore + timeBonus);
      
      console.log("Juego finalizado", {
        correct: correctCount,
        wrong: wrongCount,
        passed: passedCount,
        time: timeUsed,
        score: totalScore
      });
      
      // Guardar resultados para estadísticas
      saveGameResults(correctCount, wrongCount, passedCount, timeUsed, totalScore);
      
      // Verificar logros conseguidos
      const newAchievements = checkAchievements(correctCount, wrongCount, passedCount, timeUsed, totalScore);
      
      // Actualizar el contenido del modal con los resultados
      document.getElementById('final-correct').textContent = correctCount;
      document.getElementById('final-wrong').textContent = wrongCount;
      document.getElementById('final-pass').textContent = passedCount;
      document.getElementById('final-time').textContent = `${timeUsed}s`;
      document.getElementById('final-score').textContent = totalScore;
      
      // Determinar mensaje según el resultado
      const resultTitle = document.getElementById('game-result-title');
      if (wrongCount >= 3) {
        resultTitle.textContent = "¡Has Perdido!";
        resultTitle.style.color = "#f87171";
      } else if (timeLeft <= 0) {
        resultTitle.textContent = "¡Se Acabó el Tiempo!";
        resultTitle.style.color = "#f59e0b";
      } else {
        resultTitle.textContent = "¡Has Completado el Rosco!";
        resultTitle.style.color = "#34d399";
      }
      
      // Mostrar logros desbloqueados
      const achievementsContainer = document.getElementById('achievements-container');
      const achievementsList = document.getElementById('achievements-list');
      
      if (newAchievements && newAchievements.length > 0) {
        achievementsList.innerHTML = '';
        newAchievements.forEach(ach => {
          const achItem = document.createElement('div');
          achItem.className = 'achievement-item';
          achItem.innerHTML = `
            <span class="achievement-icon">${ach.icon}</span>
            <span class="achievement-text">${ach.name}</span>
          `;
          achievementsList.appendChild(achItem);
        });
        achievementsContainer.classList.remove('hidden');
        
        // Mostrar notificaciones para los nuevos logros
        showAchievementNotification(newAchievements);
      } else {
        // Si no hay nuevos logros, mostrar algunos logros de ejemplo para motivar
        const nextGoals = [];
        
        if (correctCount < 10) nextGoals.push({icon: "🎯", text: "Preciso: Consigue 10+ respuestas correctas"});
        if (helpUses > 0) nextGoals.push({icon: "🧠", text: "Sabelo Todo: Completa sin usar ninguna ayuda"});
        if (wrongCount > 0) nextGoals.push({icon: "💯", text: "Perfecto: Completa sin errores"});
        
        if (nextGoals.length > 0) {
          achievementsList.innerHTML = '<h4>Próximos objetivos:</h4>';
          nextGoals.forEach(goal => {
            const goalItem = document.createElement('div');
            goalItem.className = 'achievement-item goal';
            goalItem.innerHTML = `
              <span class="achievement-icon">${goal.icon}</span>
              <span class="achievement-text">${goal.text}</span>
            `;
            achievementsList.appendChild(goalItem);
          });
          achievementsContainer.classList.remove('hidden');
        } else {
          achievementsContainer.classList.add('hidden');
        }
      }
      
      // Recopilar y mostrar respuestas incorrectas
      const wrongAnswers = [];
      const allLetters = document.querySelectorAll('.letter.wrong');
      
      allLetters.forEach(letterEl => {
        const letter = letterEl.textContent.trim();
        const questionObj = questions.find(q => (q.letter || q.letra || "").toUpperCase() === letter);
        
        if (questionObj) {
          wrongAnswers.push({
            letter: letter,
            question: questionObj.pregunta || questionObj.question,
            correctAnswer: questionObj.respuesta || questionObj.answer,
            userAnswer: gameState.answeredLetters[letter] || "Sin respuesta"
          });
        }
      });
      
      // Agregar sección de respuestas incorrectas al modal
      const modalBody = document.querySelector('.modal-body');
      
      // Eliminar sección anterior si existe
      const existingWrongAnswersSection = document.querySelector('.wrong-answers-section');
      if (existingWrongAnswersSection) {
        existingWrongAnswersSection.remove();
      }
      
      if (wrongAnswers.length > 0) {
        const wrongAnswersSection = document.createElement('div');
        wrongAnswersSection.className = 'wrong-answers-section';
        
        wrongAnswersSection.innerHTML = `
          <h3>Respuestas incorrectas</h3>
          <div class="wrong-answers-list"></div>
        `;
        
        const wrongAnswersList = wrongAnswersSection.querySelector('.wrong-answers-list');
        
        wrongAnswers.forEach(wrong => {
          const wrongItem = document.createElement('div');
          wrongItem.className = 'wrong-answer-item';
          wrongItem.innerHTML = `
            <div class="wrong-question">
              <strong>${wrong.letter}:</strong> ${wrong.question}
            </div>
            <div class="wrong-answer">
              <span class="user-answer">Tu respuesta: ${wrong.userAnswer}</span>
              <span class="correct-answer">Respuesta correcta: ${wrong.correctAnswer}</span>
      </div>
    `;
          wrongAnswersList.appendChild(wrongItem);
        });
        
        modalBody.appendChild(wrongAnswersSection);
      }
      
      // Mostrar modal de resultados
      const modal = document.getElementById('results-modal');
      modal.classList.remove('hidden');
      
    } catch (error) {
      console.error("Error al finalizar el juego:", error);
      showToast("Ocurrió un error al finalizar el juego.");
    }
  }

  // Función para verificar y guardar logros conseguidos
  function checkAchievements(correctCount, wrongCount, passedCount, timeUsed, totalScore) {
    // Obtener logros existentes o iniciar array vacío
    let achievements = JSON.parse(localStorage.getItem('achievements')) || [];
    const gameResults = JSON.parse(localStorage.getItem('gameResults')) || [];
    const totalGames = gameResults.length;
    let newAchievements = [];
    
    // Mapeo de nombres de logros para evitar duplicados
    const achievementNames = achievements.map(a => a.name);
    
    // Logro: Primera victoria (completar el juego)
    if (totalGames <= 1 && !achievementNames.includes('¡Primera Victoria!')) {
        newAchievements.push({
            name: '¡Primera Victoria!',
            description: 'Completaste tu primera partida',
            icon: '🎮',
            type: 'complete',
            date: new Date().toISOString()
        });
    }
    
    // Logro: Velocista (completar en menos de 2 minutos)
    if (timeUsed < 120 && correctCount > 10 && !achievementNames.includes('Velocista')) {
        newAchievements.push({
            name: 'Velocista',
            description: 'Completaste una partida en menos de 2 minutos',
            icon: '⚡',
            type: 'speed',
            date: new Date().toISOString()
        });
    }
    
    // Logro: Precisión perfecta (sin errores)
    if (wrongCount === 0 && correctCount > 10 && !achievementNames.includes('Precisión Perfecta')) {
        newAchievements.push({
            name: 'Precisión Perfecta',
            description: 'Respondiste más de 10 preguntas sin errores',
            icon: '🎯',
            type: 'accuracy',
            date: new Date().toISOString()
        });
    }
    
    // Logro: Maestro del Rosco (más de 20 correctas)
    if (correctCount >= 20 && !achievementNames.includes('Maestro del Rosco')) {
        newAchievements.push({
            name: 'Maestro del Rosco',
            description: 'Respondiste correctamente a 20 o más preguntas',
            icon: '🏆',
            type: 'complete',
            date: new Date().toISOString()
        });
    }
    
    // Logro: Jugador Dedicado (5 o más partidas)
    if (totalGames >= 5 && !achievementNames.includes('Jugador Dedicado')) {
        newAchievements.push({
            name: 'Jugador Dedicado',
            description: 'Has jugado 5 o más partidas',
            icon: '📚',
            type: 'dedicated',
            date: new Date().toISOString()
        });
    }
    
    // Logro: Sabelo Todo (sin usar pistas)
    if (helpUses === 0 && correctCount > 10 && !achievementNames.includes('Sabelo Todo')) {
        newAchievements.push({
            name: 'Sabelo Todo',
            description: 'Completaste una partida sin usar ninguna pista',
            icon: '🧠',
            type: 'noHints',
            date: new Date().toISOString()
        });
    }
    
    // Logro: Puntuación Elite (más de 200 puntos)
    if (totalScore > 200 && !achievementNames.includes('Puntuación Elite')) {
        newAchievements.push({
            name: 'Puntuación Elite',
            description: 'Conseguiste más de 200 puntos en una partida',
            icon: '🌟',
            type: 'perfectRound',
            date: new Date().toISOString()
        });
    }
    
    // Si hay nuevos logros, añadirlos y guardarlos
    if (newAchievements.length > 0) {
        // Guardar logros
        achievements = [...achievements, ...newAchievements];
        localStorage.setItem('achievements', JSON.stringify(achievements));
    }
    
    return newAchievements;
  }

  // Función para mostrar notificación de logros conseguidos
  function showAchievementNotification(achievements) {
    if (!achievements || achievements.length === 0) return;
    
    // Buscar o crear contenedor de notificaciones
    let notificationContainer = document.getElementById('achievement-notifications');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'achievement-notifications';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.right = '20px';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }
    
    // Mostrar notificación para cada logro
    achievements.forEach((achievement, index) => {
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';
            notification.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">¡Logro Desbloqueado!</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
            
            // Estilo para la notificación
            notification.style.display = 'flex';
            notification.style.alignItems = 'center';
            notification.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            notification.style.borderRadius = '10px';
            notification.style.padding = '15px';
            notification.style.marginBottom = '10px';
            notification.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            notification.style.transition = 'all 0.5s ease';
            notification.style.border = '2px solid #3b82f6';
            notification.style.width = '300px';
            
            // Estilos para el icono
            const icon = notification.querySelector('.achievement-icon');
            icon.style.fontSize = '40px';
            icon.style.marginRight = '15px';
            icon.style.backgroundColor = '#3b82f6';
            icon.style.borderRadius = '50%';
            icon.style.width = '60px';
            icon.style.height = '60px';
            icon.style.display = 'flex';
            icon.style.justifyContent = 'center';
            icon.style.alignItems = 'center';
            icon.style.flexShrink = '0';
            
            // Estilos para info del logro
            const title = notification.querySelector('.achievement-title');
            title.style.fontWeight = 'bold';
            title.style.color = '#3b82f6';
            title.style.fontSize = '14px';
            
            const name = notification.querySelector('.achievement-name');
            name.style.fontWeight = 'bold';
            name.style.fontSize = '18px';
            name.style.color = 'white';
            
            const desc = notification.querySelector('.achievement-desc');
            desc.style.fontSize = '14px';
            desc.style.color = 'rgba(255, 255, 255, 0.7)';
            
            // Añadir al contenedor y animar entrada
            notificationContainer.appendChild(notification);
            
            // Trick para forzar el reflow y que la animación funcione
            notification.offsetHeight;
            
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
            
            // Quitar después de 5 segundos
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                
                // Eliminar del DOM después de la animación
                setTimeout(() => {
                    notification.remove();
                }, 500);
            }, 5000);
        }, index * 1000); // Mostrar cada logro con 1 segundo de diferencia
    });
  }

  // Función para guardar los resultados de la partida
  function saveGameResults(correctCount, wrongCount, passedCount, timeUsed, totalScore) {
    // Obtener resultados anteriores o inicializar array
    const gameResults = JSON.parse(localStorage.getItem('gameResults')) || [];
    
    // Añadir resultado actual
    gameResults.push({
        date: new Date().toISOString(),
        correctCount,
        wrongCount,
        passedCount,
        timeSpent: timeUsed,
        score: totalScore,
        difficulty: difficulty,
        hintsUsed: helpUses || 0
    });
    
    // Guardar en localStorage
    localStorage.setItem('gameResults', JSON.stringify(gameResults));
    
    // Actualizar mejor puntuación si es necesario
    const bestScore = localStorage.getItem('bestScore') || 0;
    if (totalScore > bestScore) {
        localStorage.setItem('bestScore', totalScore);
    }
    
    console.log('Resultados guardados:', gameResults[gameResults.length - 1]);
  }

  function showQuestion() {
    try {
      if (!gameStarted || !questions || !queue || queue.length === 0) {
        console.log("No se puede mostrar la pregunta: el juego no está listo o no hay preguntas pendientes");
        return;
      }

      // Obtener el índice de la pregunta actual
      const currentQuestionIndex = queue[0];
      const currentQuestion = questions[currentQuestionIndex];
      
      if (!currentQuestion) {
        console.error("No se encontró la pregunta con índice", currentQuestionIndex);
        return;
      }
      
      // Asegurarse de que la pregunta tenga todos los campos necesarios
      const letter = (currentQuestion.letter || currentQuestion.letra || "").toUpperCase();
      const questionText = currentQuestion.pregunta || currentQuestion.question || "";
      
      if (!letter || !questionText) {
        console.error("La pregunta no tiene letra o texto válido:", currentQuestion);
        return;
      }
      
      // Limpiar la entrada anterior
      if (answerInput) {
        answerInput.value = "";
        answerInput.focus();
      }
      
      // Actualizar la pregunta en la interfaz
      const questionContainer = document.querySelector(".question-container");
      if (!questionContainer) {
        console.error("No se encontró el contenedor de la pregunta");
        return;
      }
      
      // Actualizar el contenido de la pregunta
      const letterElement = questionContainer.querySelector(".question-letter");
      const textElement = questionContainer.querySelector(".question-text");
      
      if (letterElement) letterElement.textContent = letter;
      if (textElement) textElement.textContent = questionText;
      
      // Actualizar el display de letra central
      const currentLetterDisplay = document.getElementById("current-letter-display");
      if (currentLetterDisplay) {
        currentLetterDisplay.textContent = letter;
      }
      
      // Actualizar la letra activa en el rosco
      updateActiveLetter();
      
      console.log(`Mostrando pregunta: ${letter} - ${questionText}`);
      globalIncompleteAttempts = 0;
      
    } catch (error) {
      console.error("Error al mostrar la pregunta:", error);
    }
  }

  // Función para iniciar el juego
  async function startGame() {
    try {
      // Mostrar pantalla de juego
      hideAllScreens();
      document.getElementById("game-screen").classList.remove("hidden");
      
      console.log("Iniciando juego...");
      
      // Reiniciar el estado del juego
      gameState = {
        answeredLetters: {},
        correctLetters: [],
        wrongLetters: [],
        passedLetters: []
      };
      
      gameStarted = true;
      gamePaused = false;
      totalAnswered = 0;
      startTime = Date.now();
      
      // Cargar preguntas
      await loadQuestions();
      
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        console.error("No se pudieron cargar las preguntas");
        alert("Error: No se pudieron cargar las preguntas del juego");
        return;
      }
      
      console.log(`Juego iniciado con ${questions.length} preguntas`);
      
      // Inicializar la cola de preguntas
      queue = Array.from({ length: questions.length }, (_, i) => i);
      
      // Dibujar el rosco
      drawRosco();
      
      // Mostrar la primera pregunta
      showQuestion();
      
      // Iniciar el temporizador
      startTimer();
      
      // Actualizar la interfaz
      if (answerInput) {
        answerInput.value = "";
        answerInput.focus();
      }
      
      if (actionBtn) {
        actionBtn.textContent = "Pasapalabra";
        actionBtn.classList.remove("disabled");
      }
      
      console.log("Juego iniciado correctamente");
    } catch (error) {
      console.error("Error al iniciar el juego:", error);
      alert("Error: No se pudo iniciar el juego correctamente");
    }
  }

  function startTimer() {
    // Limpiar cualquier timer anterior
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Inicializar temporizador según la dificultad
    timeLeft = initialTime || 120; // Valor por defecto de 120 segundos
    
    // Actualizar el timer en la interfaz
    if (timerEl) {
      timerEl.textContent = `${timeLeft}s`;
      timerEl.classList.remove("time-low", "time-critical");
    }
    
    // Iniciar intervalo
    timerInterval = setInterval(() => {
      timeLeft--;
      
      if (timerEl) {
        timerEl.textContent = `${timeLeft}s`;
        
        // Actualizar clases según el tiempo restante
        if (timeLeft <= 30) {
          timerEl.classList.add("time-low");
        }
        if (timeLeft <= 10) {
          timerEl.classList.add("time-critical");
        }
      }
      
      // Finalizar el juego si se acaba el tiempo
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
    }, 1000);
  }
});

// Expose functions to window for external use
window.startGame = startGame;
window.showHint = showHint;
window.checkAnswer = checkAnswer;
window.passQuestion = passQuestion;
window.handleAction = handleAction;

