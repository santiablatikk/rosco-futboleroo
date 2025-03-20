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

document.addEventListener("DOMContentLoaded", async () => {
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
  let globalIncompleteAttempts = 0;

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
  const startGameBtn = document.getElementById("start-game");
  const difficultySelect = document.getElementById("difficulty");
  const userDisplay = document.getElementById("user-display");
  const roscoContainer = document.getElementById("rosco");
  const questionEl = document.getElementById("question");
  const answerInput = document.getElementById("answer");
  const actionBtn = document.getElementById("action-btn");
  const helpBtn = document.getElementById("help");
  const timerEl = document.getElementById("timer");
  const hintContainer = document.getElementById("hint-container");
  const incompleteFeedbackContainer = document.getElementById("incomplete-feedback-container");
  const shareBtn = document.getElementById("share-btn");

  let questions = [];
  let queue = [];
  let correctCount = 0;
  let wrongCount = 0;
  let baseTime = 240;
  let timeLeft = 240;
  let timerInterval = null;
  let gameStarted = false;
  let helpUses = 0;
  let totalAnswered = 0;
  let startTime = 0;
  let totalTime = 0;
  let achievements = [];

  // Manejar el evento de inicio de sesión
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const usernameInput = document.getElementById("username");
      if (usernameInput && usernameInput.value.trim() !== "") {
        username = usernameInput.value.trim();
        console.log("Usuario registrado:", username);
        
        // Ocultar elementos de la pantalla de login excepto el contenedor principal
        const loginForm = document.querySelector('.login-form');
        const gameRules = document.getElementById('game-rules');
        
        if (loginForm) loginForm.style.display = 'none';
        if (gameRules) gameRules.style.display = 'none';
        
        // Mostrar el contenedor de inicio (segunda pantalla)
        const startContainer = document.getElementById('start-container');
        if (startContainer) {
          startContainer.classList.remove('hidden');
          startContainer.style.display = 'block';
        }
      } else {
        alert("Por favor, ingresa un nombre de usuario");
      }
    });
  }
  
  // Manejar el evento para iniciar el juego
  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      console.log("Botón INICIAR JUEGO clickeado");
      try {
        // Obtener la dificultad seleccionada
        const difficultyInputs = document.querySelectorAll('input[name="difficulty"]');
        difficultyInputs.forEach(input => {
          if (input.checked) {
            difficulty = input.value;
          }
        });
        
        console.log("Dificultad seleccionada:", difficulty);
        
        // Ocultar pantalla de login completamente
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
          loginScreen.classList.add('hidden');
        }
        
        // Mostrar pantalla de juego
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
          gameScreen.classList.remove('hidden');
          
          // Actualizar el nombre de usuario en la pantalla
          const usernameDisplay = document.querySelector('.username-display');
          if (usernameDisplay) {
            usernameDisplay.textContent = username;
          }
        }
        
        // Iniciar el juego con un pequeño retraso para asegurar una transición suave
        setTimeout(() => {
      startGame();
        }, 200);
      } catch (error) {
        console.error("Error al iniciar el juego:", error);
      }
    });
  }

  function setDifficulty() {
    try {
      console.log("Configurando nivel de dificultad...");
      
      // Intentar obtener la dificultad de los radio buttons
      const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
      let selectedDifficulty = 'normal'; // valor por defecto
      
      if (difficultyRadios && difficultyRadios.length > 0) {
        difficultyRadios.forEach(radio => {
          if (radio.checked) {
            selectedDifficulty = radio.value;
            console.log(`Dificultad seleccionada mediante radio: ${selectedDifficulty}`);
          }
        });
      } else if (difficultySelect) {
        // Fallback al select si existe
        selectedDifficulty = difficultySelect.value;
        console.log(`Dificultad seleccionada mediante select: ${selectedDifficulty}`);
      }
      
      // Configurar tiempo basado en la dificultad
      console.log(`Configurando tiempo para dificultad: ${selectedDifficulty}`);
      if (selectedDifficulty === "easy") { 
        baseTime = 300;
        console.log("Tiempo fácil: 300 segundos");
      } else if (selectedDifficulty === "hard") { 
        baseTime = 200; 
        console.log("Tiempo difícil: 200 segundos");
      } else { 
        baseTime = 240; 
        console.log("Tiempo normal: 240 segundos");
      }
      
    timeLeft = baseTime;
      console.log(`Tiempo configurado: ${timeLeft} segundos`);
    } catch (error) {
      console.error("Error al configurar dificultad:", error);
      // Establecer valores predeterminados en caso de error
      baseTime = 240;
      timeLeft = 240;
    }
  }

  answerInput.addEventListener("input", updateActionButton);
  actionBtn.addEventListener("click", handleAction);
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { 
      e.preventDefault(); 
      handleAction(); 
    }
  });

  function updateActionButton() {
    const val = answerInput.value.trim();
    const newText = val
      ? translations[currentLang]?.checkBtn || "Comprobar"
      : translations[currentLang]?.passBtn || "Pasala Ché";
    if (actionBtn.textContent !== newText) {
      actionBtn.classList.add("btn-change");
      setTimeout(() => {
        actionBtn.textContent = newText;
        actionBtn.classList.remove("btn-change");
      }, 150);
    }
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
  }

  function handleAction() {
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    const val = answerInput.value.trim();
    if (!val) { 
      passQuestion(); 
    } else { 
      checkAnswer(); 
    }
  }

  async function loadQuestions() {
    try {
      console.log("Intentando cargar preguntas del servidor...");
      const response = await fetch(`/api/questions?difficulty=${difficulty}`);
      
      if (!response.ok) {
        console.warn("No se pudieron cargar las preguntas del servidor, usando preguntas de respaldo");
        questions = createDummyQuestions();
        return;
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data.questions) || data.questions.length < 5) {
        console.warn("Formato incorrecto o insuficientes preguntas, usando preguntas de respaldo");
        questions = createDummyQuestions();
        return;
      }
      
      questions = data.questions;
      console.log("Preguntas cargadas correctamente:", questions.length);
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      questions = createDummyQuestions();
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
      console.log("Dibujando rosco...");
      const rosco = document.getElementById('rosco');
      if (!rosco) {
        console.error("No se encontró el elemento del rosco");
        return; 
      }
      
      rosco.innerHTML = '';
      
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        console.error("No hay datos de preguntas disponibles");
        return;
      }
      
      // Lista de letras para el rosco (A-Z sin la Ñ)
      const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const totalLetters = allLetters.length;
      
      // Radio del círculo
      const radius = 180;
      
      // Crear un mapa de preguntas por letra
      const questionMap = {};
      questions.forEach(q => {
        const letter = (q.letter || q.letra || "").toUpperCase();
        if (letter) {
          questionMap[letter] = q;
        }
      });
      
      // Dibujar todas las letras del rosco
      allLetters.forEach((letter, index) => {
        // Calcular posición en círculo (empezando desde arriba)
        const angle = ((index / totalLetters) * 2 * Math.PI) - (Math.PI / 2);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        
        // Crear elemento de letra
        const letterElement = document.createElement('div');
        letterElement.className = 'letter';
        letterElement.textContent = letter;
        
        // Si hay una pregunta para esta letra, agregar el índice
        const hasQuestion = questionMap[letter] !== undefined;
        if (hasQuestion) {
          // Encontrar el índice de esta pregunta en el array original
          const questionIndex = questions.findIndex(q => 
            (q.letter || q.letra || "").toUpperCase() === letter
          );
          letterElement.dataset.position = questionIndex;
        }
        
        letterElement.dataset.letter = letter;
        
        // Posicionar elemento en el círculo
        letterElement.style.left = `calc(50% + ${x}px - 20px)`;
        letterElement.style.top = `calc(50% + ${y}px - 20px)`;
        
        // Si no hay pregunta para esta letra, darle un estilo diferente
        if (!hasQuestion) {
          letterElement.classList.add('inactive');
        }
        
        rosco.appendChild(letterElement);
      });
      
      // Actualizar la primera letra como actual
      if (queue && queue.length > 0) {
      const currentIdx = queue[0];
        const letters = document.querySelectorAll('.letter');
        // Encontrar la letra que corresponde a la pregunta actual
        const currentLetter = questions[currentIdx].letter || questions[currentIdx].letra;
        const currentLetterElement = document.querySelector(`.letter[data-letter="${currentLetter.toUpperCase()}"]`);
        
        if (currentLetterElement) {
          letters.forEach(l => l.classList.remove('current', 'active'));
          currentLetterElement.classList.add('active', 'current');
        }
      } else if (document.querySelector('.letter:not(.inactive)')) {
        // Si no hay cola, al menos marcar la primera letra activa
        document.querySelector('.letter:not(.inactive)').classList.add('current');
      }
      
      console.log("Rosco dibujado correctamente");
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
          if (hintContainer.dataset[currentLetter]) {
            hintContainer.innerHTML = hintContainer.dataset[currentLetter];
        hintContainer.classList.add("show");
      } else {
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
    if (!gameStarted || queue.length === 0 || !answerInput.value.trim()) return;
      
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
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
      
      // Avanzar a la siguiente pregunta
    queue.shift();
    showQuestion();
    } catch (error) {
      console.error("Error al comprobar respuesta:", error);
    }
  }

  function passQuestion() {
    if (!gameStarted || queue.length === 0) return;
    
    const idx = queue.shift();
    const currentQ = questions[idx];
    const currentLetter = (currentQ.letter || currentQ.letra || "").toUpperCase();
    const letterDiv = document.querySelector(`.letter[data-letter="${currentLetter}"]`);
    
    if (letterDiv) {
    letterDiv.classList.add("pasapalabra");
    }
    
    queue.push(idx);
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
    showQuestion();
  }

  helpBtn.addEventListener("click", () => {
    if (!gameStarted || queue.length === 0) return;
    const currentIdx = queue[0];
    const letterActive = questions[currentIdx].letra;
    if (hintContainer.dataset[letterActive]) {
      hintContainer.innerHTML = hintContainer.dataset[letterActive];
      hintContainer.classList.add("show");
      return;
    }
    if (helpUses >= 2) {
      hintContainer.innerHTML = `<p style="color:#f33;font-weight:bold;">
        ${currentLang === "es" ? "Solo se puede usar HELP 2 veces" : "HELP can only be used 2 times"}
      </p>`;
      hintContainer.dataset[letterActive] = hintContainer.innerHTML;
      hintContainer.classList.add("show");
      return;
    }
    helpUses++;
    const correctAns = questions[currentIdx].respuesta;
    const hint = correctAns.substring(0, 3);
    const hintHtml = `<p><strong>PISTA:</strong> <span style="color:#0f0;font-weight:bold;">"${hint}"</span></p>`;
    hintContainer.innerHTML = hintHtml;
    hintContainer.dataset[letterActive] = hintHtml;
    hintContainer.classList.add("show");
  });

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
      const passCount = document.getElementById('pass-count');
      const passedCount = parseInt(passCount.textContent || 0);
      
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
        resultTitle.style.color = "#e74c3c";
      } else if (timeLeft <= 0) {
        resultTitle.textContent = "¡Se Acabó el Tiempo!";
        resultTitle.style.color = "#f39c12";
      } else {
        resultTitle.textContent = "¡Has Completado el Rosco!";
        resultTitle.style.color = "#2ecc71";
      }
      
      // Verificar logros desbloqueados (implementación futura)
      // Por ahora, simularemos algunos logros de ejemplo
      const achievements = [];
      
      if (correctCount >= 10) achievements.push({icon: "��", text: "Preciso: 10+ respuestas correctas"});
      if (helpUses === 0) achievements.push({icon: "🧠", text: "Sabelo Todo: No usaste ninguna ayuda"});
      if (wrongCount === 0) achievements.push({icon: "💯", text: "Perfecto: Sin errores"});
      
      // Mostrar logros si existen
      const achievementsContainer = document.getElementById('achievements-container');
      const achievementsList = document.getElementById('achievements-list');
      
      if (achievements.length > 0) {
        achievementsList.innerHTML = '';
        achievements.forEach(ach => {
          const achItem = document.createElement('div');
          achItem.className = 'achievement-item';
          achItem.innerHTML = `
            <span class="achievement-icon">${ach.icon}</span>
            <span class="achievement-text">${ach.text}</span>
          `;
          achievementsList.appendChild(achItem);
        });
        achievementsContainer.classList.remove('hidden');
      } else {
        achievementsContainer.classList.add('hidden');
      }
      
      // Guardar estadísticas en el servidor
      const gameStats = {
        username: username || "Anónimo",
        correct: correctCount,
        wrong: wrongCount,
        passed: passedCount,
        time: timeUsed,
        difficulty: difficulty,
        score: totalScore,
        date: new Date().toISOString()
      };
      
      try {
        fetch('/api/ranking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gameStats)
        });
      } catch (error) {
        console.error("Error enviando estadísticas:", error);
      }
      
      // Mostrar el modal de fin de juego
      const modal = document.getElementById('game-over-modal');
      modal.classList.remove('hidden');
      modal.classList.add('show');
      
      // Configurar botones del modal
      document.getElementById('view-ranking-btn').addEventListener('click', function() {
        window.location.href = 'ranking.html';
      });
      
      document.getElementById('play-again-btn').addEventListener('click', function() {
        modal.classList.remove('show');
        setTimeout(() => {
          modal.classList.add('hidden');
          // Volver a la pantalla de selección de dificultad
          document.getElementById('game-screen').classList.add('hidden');
          document.getElementById('start-container').classList.remove('hidden');
        }, 300);
      });
      
      gameStarted = false;
    } catch (error) {
      console.error("Error al finalizar el juego:", error);
    }
  }

  function showQuestion() {
    try {
      if (!questionEl) {
        console.error("Question element not found");
        return;
      }
      
      questionEl.style.opacity = 0;
      setTimeout(() => {
        if (!gameStarted || queue.length === 0) { 
          console.log("Game ended or queue empty, ending game");
          endGame(); 
          return; 
        }
          
        // Primero actualizar la letra activa
        updateActiveLetter();
        
        const currentIdx = queue[0];
          
        if (!questions[currentIdx]) {
          console.error("Current question not found at index", currentIdx);
          return;
        }
          
        const currentQ = questions[currentIdx];
        const questionText = currentQ.pregunta || currentQ.question;
        const letterText = currentQ.letra || currentQ.letter;
        
        // Mostrar la letra en el centro del rosco
        const currentLetterDisplay = document.getElementById('current-letter-display');
        if (!currentLetterDisplay) {
          const newLetterDisplay = document.createElement('div');
          newLetterDisplay.id = 'current-letter-display';
          newLetterDisplay.textContent = letterText.toUpperCase();
          
          const roscoElement = document.getElementById('rosco');
          if (roscoElement) {
            roscoElement.appendChild(newLetterDisplay);
          }
        } else {
          currentLetterDisplay.textContent = letterText.toUpperCase();
        }
        
        // Mostrar la pregunta con animación
        questionEl.innerHTML = `
          <span class="category-badge" id="question-category">Fútbol</span>
          <div class="question-letter">${letterText.toUpperCase()}</div>
          <div class="question-text">${questionText}</div>
        `;
        
        // Actualizar la categoría si está disponible
        const categoryEl = document.getElementById('question-category');
        if (categoryEl) {
          categoryEl.textContent = currentQ.category || currentQ.categoria || "Fútbol";
        }
          
        if (answerInput) {
          answerInput.value = "";
          answerInput.focus();
        }
          
        updateActionButton();
        questionEl.style.opacity = 1;
      }, 250);
    } catch (error) {
      console.error("Error showing question:", error);
    }
  }
});

