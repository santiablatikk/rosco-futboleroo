/* main.js */

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
  const gameScreen = document.getElementById("game-screen");
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

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const usernameInput = document.getElementById("username");
      const uname = usernameInput.value.trim();
      if (!uname) {
        alert("Por favor, ingresa un nombre de usuario.");
        return;
      }
      username = uname;
      sessionStorage.setItem("username", username);
      usernameInput.style.display = "none";
      loginBtn.style.display = "none";
      document.getElementById("login-text").style.display = "none";
      document.getElementById("game-rules").classList.add("hidden");
      document.getElementById("promo-msg").classList.remove("hidden");
      document.getElementById("start-container").classList.remove("hidden");
      document.getElementById("start-container").scrollIntoView({ behavior: "smooth" });
    });
  }

  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      document.getElementById("login-screen").classList.add("hidden");
      gameScreen.classList.remove("hidden");
      userDisplay.textContent = `JUGADOR: ${username}`;
      setDifficulty();
      startGame();
    });
  }

  function setDifficulty() {
    const diffValue = difficultySelect.value;
    if (diffValue === "easy") { baseTime = 300; }
    else if (diffValue === "hard") { baseTime = 200; }
    else { baseTime = 240; }
    timeLeft = baseTime;
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
      const res = await fetch("/questions");
      const data = await res.json();
      questions = data.rosco_futbolero;
      if (!questions || !questions.length) {
        console.error("No se recibieron preguntas");
        alert("Error al cargar preguntas. Por favor, intenta nuevamente.");
        return false;
      }
      console.log("Preguntas cargadas correctamente:", questions.length);
      return true;
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      alert("Error al cargar preguntas. Por favor, recarga la página.");
      questions = [];
      return false;
    }
  }

  function drawRosco() {
    roscoContainer.innerHTML = "";
    const isMobile = window.innerWidth < 600;
    let containerSize = isMobile ? 350 : 550;
    let letterSize = isMobile ? 30 : 40;
    let radius = isMobile ? 130 : 240;
    roscoContainer.style.width = containerSize + "px";
    roscoContainer.style.height = containerSize + "px";
    roscoContainer.style.margin = "0 auto 10px";
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

  function showQuestion() {
    questionEl.style.opacity = 0;
    setTimeout(() => {
      if (!gameStarted || queue.length === 0) { 
        endGame(); 
        return; 
      }
      updateActiveLetter();
      const currentIdx = queue[0];
      const currentQ = questions[currentIdx];
      questionEl.innerHTML = `
        <div class="question-letter">${currentQ.letra}</div>
        <div class="question-text">${currentQ.pregunta}</div>
      `;
      answerInput.value = "";
      updateActionButton();
      questionEl.style.opacity = 1;
      answerInput.focus();
    }, 250);
  }

  function updateActiveLetter() {
    const letters = document.querySelectorAll(".letter");
    letters.forEach((l) => l.classList.remove("active"));
    if (queue.length > 0) {
      const currentIdx = queue[0];
      letters[currentIdx].classList.add("active");
      const letterActive = letters[currentIdx].textContent;
      if (hintContainer.dataset[letterActive]) {
        hintContainer.innerHTML = hintContainer.dataset[letterActive];
        hintContainer.classList.add("show");
      } else {
        hintContainer.innerHTML = "";
        hintContainer.classList.remove("show");
      }
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
    if (!gameStarted || queue.length === 0 || !answerInput.value.trim()) return;
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    const userAns = normalizeString(answerInput.value.trim());
    const correctAns = normalizeString(currentQ.respuesta.trim());
    const letterDiv = document.querySelectorAll(".letter")[currentIdx];
    letterDiv.classList.remove("pasapalabra");
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
    const wordLen = correctAns.length;
    let maxDist = wordLen > 5 ? 2 : 1;
    if (difficultySelect.value === "easy") { maxDist += 1; }
    else if (difficultySelect.value === "hard") { maxDist = Math.max(maxDist - 1, 0); }
    const dist = levenshteinDistance(userAns, correctAns);
    if (dist <= maxDist) {
      letterDiv.classList.add("correct", "bounce");
      if (soundEnabled) audioCorrect.play();
      showFeedback(letterDiv, true);
      correctCount++;
    } else {
      letterDiv.classList.add("wrong", "shake");
      if (soundEnabled) audioIncorrect.play();
      showFeedback(letterDiv, false);
      wrongCount++;
      if (wrongCount >= 3) { 
        endGame(); 
        return; 
      }
    }
    incompleteFeedbackContainer.innerHTML = "";
    incompleteFeedbackContainer.classList.remove("show");
    hintContainer.innerHTML = "";
    hintContainer.classList.remove("show");
    queue.shift();
    showQuestion();
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
    clearInterval(timerInterval);
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
    
    // Update user statistics and check for achievements
    const unlockedAchievements = updateUserStats(gameStats);
    
    // Show modals sequence
    showAllModalsSequence(gameStats, unlockedAchievements);
    
    // Update profile data in the background
    updateProfileAndRanking();
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

  // Add startGame function
  async function startGame() {
    // Reset game state
    correctCount = 0;
    wrongCount = 0;
    helpUses = 0;
    startTime = new Date();
    timeLeft = baseTime;
    gameStarted = true;
    queue = [];
    
    // Clear any previous timers
    if (timerInterval) clearInterval(timerInterval);
    
    // Reset UI elements
    document.getElementById("correct-count").textContent = "0";
    document.getElementById("wrong-count").textContent = "0";
    document.getElementById("pass-count").textContent = "0";
    
    // Get fresh questions
    const success = await loadQuestions();
    if (!success) return;
    
    // Initialize the letter queue with all indices
    for (let i = 0; i < questions.length; i++) {
      queue.push(i);
    }
    
    // Draw the rosco
    drawRosco();
    
    // Show the first question
    showQuestion();
    
    // Start the timer
    startTimer();
  }
  
  function startTimer() {
    timerEl.textContent = `${translations[currentLang]?.timer || "Tiempo:"} ${timeLeft}s`;
    
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `${translations[currentLang]?.timer || "Tiempo:"} ${timeLeft}s`;
      
      // Add visual effects for low time
      if (timeLeft <= 30) {
        timerEl.classList.add("time-low");
      }
      if (timeLeft <= 10) {
        timerEl.classList.add("time-critical");
      }
      
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  // Create a function to show all end-game modals in sequence
  function showAllModalsSequence(gameStats, unlockedAchievements) {
    // First, show the game results
    showGameResults(gameStats, unlockedAchievements);
    
    // After a delay, redirect back to the main screen
    setTimeout(() => {
      gameScreen.classList.add("hidden");
      document.getElementById("login-screen").classList.remove("hidden");
    }, 6000);
  }
  
  // Enhanced game results display
  function showGameResults(stats, achievements) {
    // Create the results overlay container
    const resultsOverlay = document.createElement('div');
    resultsOverlay.className = 'game-results-overlay';
    
    // Determine if it's a victory or defeat
    const isVictory = stats.wrongCount < 3 && stats.correctAnswers > 0;
    const resultTitle = isVictory ? '¡VICTORIA!' : 'JUEGO TERMINADO';
    const resultClass = isVictory ? 'victory' : 'defeat';
    
    // Calculate accuracy percentage
    const totalAttempted = stats.correctAnswers + stats.wrongAnswers;
    const accuracy = totalAttempted > 0 ? Math.round((stats.correctAnswers / totalAttempted) * 100) : 0;
    
    // Create HTML content
    resultsOverlay.innerHTML = `
      <div class="game-results ${resultClass}">
        <div class="results-header">
          <h2>${resultTitle}</h2>
          <div class="result-badge">${isVictory ? '🏆' : '👏'}</div>
        </div>
        
        <div class="results-stats">
          <div class="stat-row">
            <div class="stat-label">Respuestas Correctas:</div>
            <div class="stat-value correct">${stats.correctAnswers}</div>
          </div>
          <div class="stat-row">
            <div class="stat-label">Respuestas Incorrectas:</div>
            <div class="stat-value wrong">${stats.wrongAnswers}</div>
          </div>
          <div class="stat-row">
            <div class="stat-label">Preguntas Pasadas:</div>
            <div class="stat-value passed">${stats.passedAnswers}</div>
          </div>
          <div class="stat-row">
            <div class="stat-label">Precisión:</div>
            <div class="stat-value">${accuracy}%</div>
          </div>
          <div class="stat-row">
            <div class="stat-label">Tiempo:</div>
            <div class="stat-value">${stats.gameDuration} segundos</div>
          </div>
          <div class="stat-row">
            <div class="stat-label">Puntos:</div>
            <div class="stat-value points">${stats.points}</div>
          </div>
        </div>
        
        ${achievements && achievements.length > 0 ? `
          <div class="achievements-unlocked">
            <h3>¡Logros Desbloqueados!</h3>
            <div class="unlocked-achievements-list">
              ${achievements.map(ach => `
                <div class="unlocked-achievement">
                  <i class="${ach.icon}"></i>
                  <span>${ach.title}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    // Add to document body
    document.body.appendChild(resultsOverlay);
    
    // Apply animations
    setTimeout(() => {
      resultsOverlay.querySelector('.game-results').classList.add('animate-in');
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
      resultsOverlay.querySelector('.game-results').classList.add('animate-out');
      setTimeout(() => {
        resultsOverlay.remove();
      }, 1000);
    }, 5000);
  }
});
