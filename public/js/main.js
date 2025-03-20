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
      console.log("Fetching questions from server...");
    try {
      const res = await fetch("/questions");
      const data = await res.json();
        
        if (!data || !data.rosco_futbolero) {
          console.error("Invalid data structure received:", data);
          return createDummyQuestions();
        }
        
      questions = data.rosco_futbolero;
        
      if (!questions || !questions.length) {
        console.error("No se recibieron preguntas");
          return createDummyQuestions();
      }
        
      console.log("Preguntas cargadas correctamente:", questions.length);
      return true;
      } catch (fetchError) {
        console.error("Error en fetch de preguntas:", fetchError);
        return createDummyQuestions();
      }
    } catch (error) {
      console.error("Error general al cargar preguntas:", error);
      return createDummyQuestions();
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
      
      // Filtrar preguntas válidas (que tengan letra)
      const lettersWithDefinitions = questions.filter(q => q.letter || q.letra);
      console.log(`Dibujando rosco con ${lettersWithDefinitions.length} letras`);
      
      const totalLetters = lettersWithDefinitions.length;
      const radius = 180; // Aumentamos el radio para un círculo más grande
      
      lettersWithDefinitions.forEach((question, index) => {
        const letter = question.letter || question.letra;
        
        // Calcular posición en círculo
        const angle = ((index / totalLetters) * 2 * Math.PI) - (Math.PI / 2); // Comenzar desde arriba
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        
        // Crear elemento de letra
        const letterElement = document.createElement('div');
        letterElement.className = 'letter';
        letterElement.textContent = letter.toUpperCase();
        letterElement.dataset.position = index;
        letterElement.dataset.letter = letter.toUpperCase();
        
        // Posicionar elemento en el círculo
        letterElement.style.left = `calc(50% + ${x}px - 20px)`;
        letterElement.style.top = `calc(50% + ${y}px - 20px)`;
        
        rosco.appendChild(letterElement);
      });
      
      // Actualizar la primera letra como actual
      if (queue && queue.length > 0) {
        const currentIdx = queue[0];
        const letters = document.querySelectorAll('.letter');
        if (letters.length > currentIdx) {
          letters.forEach(l => l.classList.remove('current', 'active'));
          letters[currentIdx].classList.add('active', 'current');
        }
      } else if (document.querySelector('.letter')) {
        // Si no hay cola, al menos marcar la primera letra
        document.querySelector('.letter').classList.add('current');
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
        if (letters.length > currentIdx) {
          const currentLetter = letters[currentIdx];
          currentLetter.classList.add("active", "current");
          
          // Centrar la letra activa en el rosco
          currentLetter.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Mostrar pista si existe
          const letterActive = currentLetter.textContent;
          if (hintContainer.dataset[letterActive]) {
            hintContainer.innerHTML = hintContainer.dataset[letterActive];
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
      
      if (!correctAns) {
        console.error("No hay respuesta definida para la pregunta:", currentQ);
        return;
      }
      
      console.log("Comprobando respuesta:", userAns, "vs", correctAns);
      
      const letterDiv = document.querySelectorAll(".letter")[currentIdx];
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
      
      if (difficultySelect.value === "easy") { 
        maxDist += 1; 
      } else if (difficultySelect.value === "hard") { 
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
    const letterDiv = document.querySelectorAll(".letter")[idx];
    letterDiv.classList.add("pasapalabra");
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
      console.log("Ending game...");
      
      if (timerInterval) {
    clearInterval(timerInterval);
      }
      
      gameStarted = false;
      
      // Calculate final score and stats
      const score = correctCount * 10;
      const currentStreak = 0;
      const maxStreak = 0;
      const fastAnswersCount = 0;
      const passedLetters = document.querySelectorAll(".letter.pasapalabra");
      const worldCupAnswers = 0;
      const historyAnswers = 0;
      const clubAnswers = 0;
      
      // Calculate final game stats
      const endTime = new Date();
      const gameDuration = Math.floor((endTime - startTime) / 1000);
      const gameStats = {
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        passedAnswers: questions.length - correctCount - wrongCount,
        gameCompleted: true,
        gameDuration: gameDuration,
        maxStreak: currentStreak > maxStreak ? currentStreak : maxStreak,
        fastAnswers: fastAnswersCount || 0,
        helpUsed: helpUses,
        noPassUsed: passedLetters.length === 0,
        difficulty: difficultySelect ? difficultySelect.value : 'normal',
        categoryStats: {
          worldCup: worldCupAnswers || 0,
          history: historyAnswers || 0,
          clubs: clubAnswers || 0
        },
        points: score,
        comebackWin: (wrongCount >= 5 && correctCount > wrongCount),
        date: new Date().toISOString()
      };
      
      console.log("Game stats:", gameStats);
      
      // Update user statistics and check for achievements
      const unlockedAchievements = updateUserStats(gameStats);
      
      // Show modals sequence
      console.log("Showing results screen...");
      showAllModalsSequence(gameStats, unlockedAchievements);
      
      // Update profile data in the background
      updateProfileAndRanking();
      
      console.log("Game ended successfully");
    } catch (error) {
      console.error("Error ending game:", error);
    }
  }

  function updateProfileAndRanking() {
    updateProfile();
    saveGlobalRanking();
  }
  
  // Update user statistics
  function updateUserStats(gameStats) {
    // Get saved stats or initialize
    let savedStats = localStorage.getItem('userStats');
    let userStats = {
      gamesPlayed: 0,
      gamesCompleted: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      totalPoints: 0,
      totalAnswers: 0,
      maxStreak: 0,
      fastAnswers: 0,
      hardModeCompleted: 0,
      worldCupAnswers: 0,
      historyAnswers: 0,
      clubAnswers: 0,
      helpUsed: 0,
      dailyChallengesCompleted: 0,
      daysPlayed: {},
      daysInARow: 0,
      lastPlayed: null
    };
    
    try {
      if (savedStats) {
        userStats = JSON.parse(savedStats);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
    
    // Update stats with current game data
    userStats.gamesPlayed++;
    userStats.correctAnswers += gameStats.correctAnswers || 0;
    userStats.wrongAnswers += gameStats.wrongAnswers || 0;
    userStats.totalAnswers += (gameStats.correctAnswers || 0) + (gameStats.wrongAnswers || 0);
    userStats.totalPoints += gameStats.points || 0;
    
    if (gameStats.gameCompleted) {
      userStats.gamesCompleted++;
    }
    
    // Update max streak
    if (gameStats.maxStreak > userStats.maxStreak) {
      userStats.maxStreak = gameStats.maxStreak;
    }
    
    // Update fast answers count
    if (gameStats.fastAnswers) {
      userStats.fastAnswers += gameStats.fastAnswers;
    }
    
    // Update hard mode completion
    if (gameStats.difficulty === 'hard' && gameStats.gameCompleted) {
      userStats.hardModeCompleted++;
    }
    
    // Update category stats
    if (gameStats.categoryStats) {
      if (gameStats.categoryStats.worldCup) {
        userStats.worldCupAnswers += gameStats.categoryStats.worldCup;
      }
      if (gameStats.categoryStats.history) {
        userStats.historyAnswers += gameStats.categoryStats.history;
      }
      if (gameStats.categoryStats.clubs) {
        userStats.clubAnswers += gameStats.categoryStats.clubs;
      }
    }
    
    // Update help usage
    if (gameStats.helpUsed) {
      userStats.helpUsed += gameStats.helpUsed;
    }
    
    // Update daily streak
    const today = new Date().toISOString().split('T')[0];
    if (!userStats.daysPlayed) {
      userStats.daysPlayed = {};
    }
    userStats.daysPlayed[today] = true;
    
    // Calculate consecutive days played
    if (userStats.lastPlayed) {
      const lastDate = new Date(userStats.lastPlayed);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
        userStats.daysInARow++;
      } else if (lastDate.toISOString().split('T')[0] !== today) {
        // If not played yesterday and not first time playing today, reset streak
        userStats.daysInARow = 1;
      }
    } else {
      userStats.daysInARow = 1;
    }
    
    userStats.lastPlayed = today;
    
    // Save updated stats
    localStorage.setItem('userStats', JSON.stringify(userStats));
    
    // Check achievements with updated stats
    return checkAchievements(userStats);
  }
  
  // Check achievements
  function checkAchievements(stats) {
    const achievements = [
      {
        id: 'first_game',
        condition: stats => stats.gamesCompleted >= 1,
        title: 'Primer Juego',
        icon: 'fas fa-gamepad'
      },
      {
        id: 'perfect_game',
        condition: stats => stats.correctAnswers >= 27 && stats.wrongAnswers === 0,
        title: 'Juego Perfecto',
        icon: 'fas fa-star'
      },
      {
        id: 'fast_answer',
        condition: stats => stats.fastAnswers >= 1,
        title: 'Respuesta Rápida',
        icon: 'fas fa-bolt'
      },
      {
        id: 'streak_5',
        condition: stats => stats.maxStreak >= 5,
        title: 'Racha Caliente',
        icon: 'fas fa-fire'
      },
      {
        id: 'streak_10',
        condition: stats => stats.maxStreak >= 10,
        title: 'Racha Imparable',
        icon: 'fas fa-fire-alt'
      },
      {
        id: 'no_pass',
        condition: stats => stats.noPassUsed && stats.gamesCompleted >= 1,
        title: 'Sin Pasar',
        icon: 'fas fa-trophy'
      },
      {
        id: 'world_cup_expert',
        condition: stats => stats.worldCupAnswers >= 20,
        title: 'Experto en Mundiales',
        icon: 'fas fa-globe'
      },
      {
        id: 'speed_demon',
        condition: stats => stats.gameCompleted && stats.gameDuration < 120,
        title: 'Demonio de la Velocidad',
        icon: 'fas fa-tachometer-alt'
      },
      {
        id: 'comeback_king',
        condition: stats => stats.comebackWin,
        title: 'Rey de la Remontada',
        icon: 'fas fa-crown'
      },
      {
        id: 'night_owl',
        condition: () => {
          const now = new Date();
          const hour = now.getHours();
          return hour >= 0 && hour < 6;
        },
        title: 'Búho Nocturno',
        icon: 'fas fa-moon'
      },
      {
        id: 'daily_streak',
        condition: stats => stats.daysInARow >= 7,
        title: 'Racha Diaria',
        icon: 'fas fa-calendar-check'
      },
      {
        id: 'history_buff',
        condition: stats => stats.historyAnswers >= 15,
        title: 'Aficionado a la Historia',
        icon: 'fas fa-book'
      },
      {
        id: 'club_legend',
        condition: stats => stats.clubAnswers >= 25,
        title: 'Leyenda de Clubes',
        icon: 'fas fa-shield-alt'
      },
      {
        id: 'help_master',
        condition: stats => stats.helpUsed >= 20,
        title: 'Maestro de la Ayuda',
        icon: 'fas fa-hands-helping'
      },
      {
        id: 'hard_mode',
        condition: stats => stats.hardModeCompleted >= 1,
        title: 'Modo Difícil',
        icon: 'fas fa-skull'
      },
      {
        id: 'challenge_accepted',
        condition: stats => stats.dailyChallengesCompleted >= 1,
        title: 'Desafío Aceptado',
        icon: 'fas fa-flag'
      }
    ];
  
    // Get saved achievements or start empty list
    let savedAchievements = localStorage.getItem('userAchievements');
    let userAchievements = [];
    
    try {
      if (savedAchievements) {
        userAchievements = JSON.parse(savedAchievements);
      }
    } catch (error) {
      console.error('Error al cargar logros:', error);
    }
    
    // List to store newly unlocked achievements
    const newlyUnlocked = [];
    
    // Check each achievement
    achievements.forEach(achievement => {
      // Check if condition is met
      if (achievement.condition(stats)) {
        // Find if achievement already exists in user's list
        const existingAchievement = userAchievements.find(a => a.id === achievement.id);
        
        if (!existingAchievement) {
          // If doesn't exist, add it to the list
          userAchievements.push({
            id: achievement.id,
            unlocked: true,
            count: 1,
            date: new Date().toISOString()
          });
          
          // Add to newly unlocked list
          newlyUnlocked.push({
            id: achievement.id,
            title: achievement.title,
            icon: achievement.icon
          });
        } else if (!existingAchievement.unlocked) {
          // If exists but not unlocked, update it
          existingAchievement.unlocked = true;
          existingAchievement.count = 1;
          existingAchievement.date = new Date().toISOString();
          
          // Add to newly unlocked list
          newlyUnlocked.push({
            id: achievement.id,
            title: achievement.title,
            icon: achievement.icon
          });
        } else {
          // If already unlocked, increment counter if applicable
          if (existingAchievement.count !== undefined) {
            existingAchievement.count++;
          }
        }
      }
    });
    
    // Save updated achievements
    localStorage.setItem('userAchievements', JSON.stringify(userAchievements));
    
    // Show achievement notifications
    if (newlyUnlocked.length > 0) {
      showAchievementNotifications(newlyUnlocked);
    }
    
    return newlyUnlocked;
  }
  
  // Show achievement notifications
  function showAchievementNotifications(achievements) {
    achievements.forEach((achievement, index) => {
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
          <div class="achievement-notification-icon">
            <i class="${achievement.icon}"></i>
          </div>
          <div class="achievement-notification-details">
            <div class="achievement-notification-title">¡Logro Desbloqueado!</div>
            <div class="achievement-notification-name">${achievement.title}</div>
          </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          notification.classList.add('fadeOut');
          setTimeout(() => notification.remove(), 500);
        }, 5000);
      }, index * 2000); // Show each notification with 2 second delay
    });
  }

  function saveGlobalRanking() {
    // Implementation of saveGlobalRanking function
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Función para iniciar el juego
  async function startGame() {
    console.log("Iniciando juego...");
    try {
      // Resetear variables del juego
      correctCount = 0;
      wrongCount = 0;
      helpUses = 0;
      totalAnswered = 0;
      globalIncompleteAttempts = 0;
      gameStarted = true;
      
      // Actualizar contadores en la interfaz
      document.getElementById('correct-count').textContent = '0';
      document.getElementById('wrong-count').textContent = '0';
      document.getElementById('pass-count').textContent = '0';
      
      // Limpiar cualquier timer anterior
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Configurar temporizador según la dificultad
      baseTime = 240; // normal por defecto
      if (difficultySelect.value === "easy") {
        baseTime = 300;
      } else if (difficultySelect.value === "hard") {
        baseTime = 200;
      }
      
      timeLeft = baseTime;
      
      console.log("Configurando juego con dificultad:", difficultySelect.value, "- Tiempo:", timeLeft);
      
      // Cargar preguntas
      console.log("Cargando preguntas...");
      await loadQuestions();
      
      // Dibujar el rosco
      console.log("Dibujando rosco...");
      drawRosco();
      
      // Inicializar cola de preguntas
      queue = [...Array(questions.length).keys()];
      
      // Mostrar primera pregunta
      console.log("Mostrando primera pregunta...");
      showQuestion();
      
      // Iniciar temporizador
      console.log("Iniciando temporizador...");
      startTime = Date.now();
      timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `${translations[currentLang]?.timer || "Tiempo:"} ${timeLeft}s`;
        if (timeLeft <= 30) {
          timerEl.classList.add("time-low");
        }
        if (timeLeft <= 10) {
          timerEl.classList.add("time-critical");
        }
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          endGame();
        }
      }, 1000);
      
      console.log("Juego iniciado correctamente");
    } catch (error) {
      console.error("Error al iniciar el juego:", error);
    }
  }
  
  // Función para cargar preguntas
  async function loadQuestions() {
    try {
      console.log("Intentando cargar preguntas del servidor...");
      const response = await fetch(`/api/questions?difficulty=${difficultySelect.value}`);
      
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
  
  // Función para mostrar pantalla de estadísticas
  function showStatsScreen() {
    // Implementation pending
    console.log("Showing stats screen...");
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
        
        // Mostrar la pregunta con animación
        questionEl.innerHTML = `
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

