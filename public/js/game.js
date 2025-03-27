/**
 * PASALA CHE - Main Game Script
 * This script handles the rosco game logic, including drawing the alphabet circle,
 * loading questions, handling user answers, and game flow.
 */

// Global variables
let username = "";
let selectedDifficulty = 'facil';
let timeLimit = 300; // Default time limit (5 minutes for facil)
let timer;
let timeRemaining;
let currentLetterIndex = 0;
let helpCount = 2; // Number of available hints
let errorCount = 0; // Counter for errors
let letterStatus = {}; // Status of each letter (correct, incorrect, pending, skipped)
let gameQuestions = []; // Game questions
let gameStarted = false;
let letterElements = {}; // Reference to DOM elements of letters
let letterHints = {}; // Track which letters have received hints
let incorrectAnswersList = []; // Track incorrect answers with their correct answers
let incorrectAnswersCount = 0; // Counter for incorrect answers
const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// Variables adicionales para controlar intentos
let incompleteAttempts = 2; // Contador para respuestas incompletas permitidas
let partialAnswers = {}; // Registro de respuestas parciales por letra

/**
 * Initialize the game when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const loadingOverlay = document.querySelector('.loading-overlay');
  const roscoContainer = document.getElementById('rosco-container');
  const currentLetterDisplay = document.querySelector('.current-letter-display');
  const currentQuestion = document.querySelector('.current-question');
  const currentDefinition = document.querySelector('.current-definition');
  const answerForm = document.getElementById('answer-form');
  const answerInput = document.getElementById('answer-input');
  const helpBtn = document.getElementById('help-btn');
  const submitBtn = document.getElementById('submit-btn');
  const skipBtn = document.getElementById('skip-btn');
  const timer = document.getElementById('timer');
  const errorDots = document.querySelectorAll('.error-dot');
  const soundToggle = document.getElementById('sound-toggle');
  const resultModal = document.getElementById('result-modal');
  const restartBtn = document.getElementById('restart-btn');
  const homeBtn = document.getElementById('home-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.querySelector('.toast-message');
  
  // Stats elements
  const correctCountDisplay = document.getElementById('correct-count');
  const incorrectCountDisplay = document.getElementById('incorrect-count');
  const skippedCountDisplay = document.getElementById('skipped-count');
  const remainingCountDisplay = document.getElementById('remaining-count');
  const finalCorrect = document.getElementById('final-correct');
  const finalIncorrect = document.getElementById('final-incorrect');
  const finalSkipped = document.getElementById('final-skipped');
  
  // Audio elements
  const correctSound = document.getElementById('correctSound');
  const incorrectSound = document.getElementById('incorrectSound');
  const skipSound = document.getElementById('skipSound');
  const gameOverSound = document.getElementById('gameOverSound');
  const clickSound = document.getElementById('clickSound');
  
  // Game state variables
  let questions = [];
  let currentQuestionIndex = 0;
  let correctAnswers = 0;
  let skippedAnswers = 0;
  let timerInterval;
  let errorCount = 0;
  let gameStarted = false;
  let letterElements = {};
  
  // Obtener la dificultad seleccionada de sessionStorage
  function getSelectedDifficulty() {
    // Verificar si hay una dificultad guardada en sessionStorage
    const storedDifficulty = sessionStorage.getItem('selectedDifficulty');
    
    // Si hay una dificultad guardada, actualizar la variable global
    if (storedDifficulty) {
      selectedDifficulty = storedDifficulty;
      
      // Establecer el límite de tiempo según la dificultad
      switch(selectedDifficulty) {
    case 'facil':
          timeLimit = 300; // 5 minutos
      break;
        case 'normal':
          timeLimit = 240; // 4 minutos
      break;
    case 'dificil':
          timeLimit = 200; // 3:20 minutos
      break;
    default:
          timeLimit = 300; // Valor por defecto
      }
  }
  
    // Inicializar remainingTime con el timeLimit
  remainingTime = timeLimit;
  
    return selectedDifficulty;
  }
  
  // The alphabet for the rosco (Spanish alphabet without Ñ)
  const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  // Sound settings
  let soundEnabled = true;
  
  // Inicializar componentes de la interfaz
  function initUI() {
    // Actualizar el texto del botón de ayuda
    updateHelpButtonText();
    
    // Event listeners para los botones
    submitBtn.addEventListener('click', function() {
      if (answerInput.value.trim()) {
        handleAnswer();
      }
    });
    
    skipBtn.addEventListener('click', function() {
      skipQuestion();
    });
    
    // Event listener para el form
    answerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (answerInput.value.trim()) {
        handleAnswer();
    }
  });
}

  // Función para actualizar el botón de ayuda con el contador
  function updateHelpButtonText() {
    document.querySelector('.help-count').textContent = `(${helpCount})`;
  }
  
  // Event listener para el botón de ayuda
  helpBtn.addEventListener('click', function() {
    showHelp();
  });
  
  // Actualizar el texto del botón de ayuda
  updateHelpButtonText();
  
  // Función para mostrar ayuda con las 3 primeras letras
  function showHelp() {
    if (helpCount > 0 && gameStarted) {
      const currentQuestion = questions[currentQuestionIndex];
      const currentLetter = currentQuestion.letter;
      
      // Solo decrementar helpCount si es la primera vez que se pide pista para esta letra
      if (!letterHints[currentLetter]) {
        helpCount--;
        updateHelpButtonText();
        
        // Deshabilitar el botón si no quedan ayudas
        if (helpCount === 0) {
          helpBtn.disabled = true;
          helpBtn.style.opacity = '0.6';
        }
      }
      
      // Guardar la pista para esta letra
      const firstThreeLetters = currentQuestion.answer.substring(0, 3).toUpperCase();
      letterHints[currentLetter] = firstThreeLetters;
      
      // Crear o actualizar un elemento de pista flotante para esta letra
      displayHintElement(currentLetter, firstThreeLetters);
      
      playSound(clickSound);
    } else if (helpCount <= 0) {
      showGameMessage('No tienes más ayudas disponibles', 'warning');
    }
  }
  
  // Función para mostrar un elemento de pista flotante sobre la letra actual
  function displayHintElement(letter, hintText) {
    // Buscar si ya existe un elemento de pista para esta letra
    let hintElement = document.querySelector(`.hint-element[data-letter="${letter}"]`);
    
    // Si no existe, crearlo
    if (!hintElement) {
      hintElement = document.createElement('div');
      hintElement.className = 'hint-element';
      hintElement.dataset.letter = letter;
      document.body.appendChild(hintElement);
    }
    
    // Actualizar contenido y posición
    hintElement.innerHTML = `<span class="hint-text">${hintText}...</span>`;
    
    // Obtener posición de la letra en el rosco
    const letterElem = letterElements[letter];
    if (letterElem) {
      const rect = letterElem.getBoundingClientRect();
      hintElement.style.left = `${rect.left + window.scrollX + rect.width/2 - hintElement.offsetWidth/2}px`;
      hintElement.style.top = `${rect.top + window.scrollY - 40}px`;
      hintElement.style.display = 'block';
    }
  }
  
  // Función para normalizar texto (quitar tildes, ñ, etc.)
  function normalizeText(text) {
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^\w\s]/gi, '') // Quitar signos de puntuación
      .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
      .trim();
  }
  
  // Función para verificar similitud entre strings
  function stringSimilarity(s1, s2) {
    s1 = normalizeText(s1);
    s2 = normalizeText(s2);
    
    // Si son iguales después de normalizar
    if (s1 === s2) return 1;
    
    // Para strings cortos, ser más tolerante
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength <= 4) {
      // Para palabras muy cortas (4 letras o menos), permitir un error
      let differences = 0;
      for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
        if (s1[i] !== s2[i]) differences++;
      }
      differences += Math.abs(s1.length - s2.length);
      
      // Si hay máximo 1 error para palabras cortas, considerar similar
      return differences <= 1 ? 0.9 : 0;
    }
    
    // Contar caracteres diferentes (algoritmo simple de distancia)
    let differences = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] !== s2[i]) differences++;
    }
    
    // Añadir como diferencias los caracteres restantes del string más largo
    differences += Math.abs(s1.length - s2.length);
    
    // Calcular similitud (1 es exacto, 0 es completamente diferente)
    const similarity = 1 - (differences / maxLength);
    
    return similarity;
  }
  
  // Función para verificar si una respuesta es parcial (nombre o apellido)
  function isPartialAnswer(userAnswer, correctAnswer) {
    userAnswer = normalizeText(userAnswer);
    correctAnswer = normalizeText(correctAnswer);
    
    // Si la respuesta correcta tiene espacios (posible nombre y apellido)
    if (correctAnswer.includes(' ')) {
      const parts = correctAnswer.split(' ');
      
      // Comprobar si la respuesta del usuario coincide con alguna parte
      for (const part of parts) {
        if (stringSimilarity(userAnswer, part) > 0.75) {
          return true;
        }
      }
    }
    
    // Si la respuesta del usuario está contenida en la respuesta correcta
    if (correctAnswer.includes(userAnswer) && userAnswer.length >= 3) {
      return true;
    }
    
    return false;
  }
  
  // Event listeners
  answerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (answerInput.value.trim()) {
      handleAnswer();
    } else {
      skipQuestion();
    }
  });
  
  // Create the rosco with letters in a clockwise circle
  function createRosco() {
    // Clear any existing letters but keep the question card
    const questionCard = document.querySelector('.question-card');
    roscoContainer.innerHTML = '';
    if (questionCard) {
      roscoContainer.appendChild(questionCard);
    }
    
    const totalLetters = alphabet.length;
    // Detectar si estamos en móvil para usar un radio mucho menor
    const isMobile = window.innerWidth <= 480 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Usar un radio mucho menor en móviles
    const radius = isMobile ? 120 : 260; // Radio reducido para móviles
    const centerX = 300; // Center X coordinate
    const centerY = 300; // Center Y coordinate
    
    // Calculate positions for each letter in a clockwise circle
    alphabet.forEach((letter, index) => {
      // Calculate angle in radians, starting from top and going clockwise
      // Subtract from 2π and start from -π/2 (top position)
      const angle = (2 * Math.PI * index / totalLetters) - (Math.PI / 2);
      
      // Calculate position on the circle using sine and cosine
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
    
      // Create letter element
      const letterElem = document.createElement('div');
      letterElem.className = 'rosco-letter';
      letterElem.id = `letter-${letter}`;
      letterElem.textContent = letter;
      letterElem.dataset.letter = letter;
      letterElem.dataset.index = index;
      letterElem.dataset.status = 'pending';
      
      // Tamaño reducido para móviles
      if (isMobile) {
        letterElem.style.width = '22px';
        letterElem.style.height = '22px';
        letterElem.style.fontSize = '12px';
      }
      
      // Position the letter (adjust for center)
      letterElem.style.left = `${x - (isMobile ? 11 : 27.5)}px`;
      letterElem.style.top = `${y - (isMobile ? 11 : 27.5)}px`;
      
      // Add a more pronounced appearance effect
      letterElem.style.opacity = '0';
      letterElem.style.transform = 'scale(0)';
      
      roscoContainer.appendChild(letterElem);
      
      // Store reference to this element
      letterElements[letter] = letterElem;
      
      // Trigger animation with a staggered delay
      setTimeout(() => {
        letterElem.style.opacity = '1';
        letterElem.style.transform = 'scale(1)';
        letterElem.style.transition = `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.03}s`;
      }, 30);
    });
    
    // Update stats display
    updateStatsDisplay();
  }
  
  // Fetch questions from the server (adapted to the structure in questions.json)
  async function fetchQuestions() {
    try {
      const response = await fetch('../data/questions.json');
      const data = await response.json();
      
      // Process questions to format them for the game
      // Exclude questions for the letter Ñ
      questions = [];
      
      alphabet.forEach(letter => {
        // Find matching letter in the data
        const letterData = data.find(item => item.letra === letter);
        
        if (letterData && letterData.preguntas && letterData.preguntas.length > 0) {
          // Randomly select a question for this letter
          const randomIndex = Math.floor(Math.random() * letterData.preguntas.length);
          const questionItem = letterData.preguntas[randomIndex];
          
          // Add question to our game questions
          questions.push({
            letter: letter,
            question: `Comienza con ${letter}:`,
            definition: questionItem.pregunta,
            answer: questionItem.respuesta.toLowerCase().trim()
          });
        } else {
          // Fallback if no questions for a letter
          questions.push({
            letter: letter,
            question: `Comienza con ${letter}:`,
            definition: `No hay preguntas disponibles para la letra ${letter}`,
            answer: 'no disponible'
          });
        }
      });
      
      // Update remaining count
      remainingCountDisplay.textContent = questions.length;
      
      return true;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return false;
    }
  }
  
  // Initialize the game
  async function initGame() {
    loadingOverlay.style.display = 'flex';
    
    // Obtener la dificultad y configurar el tiempo
    getSelectedDifficulty();
    
    // Crear el rosco
    createRosco();
    
    // Cargar preguntas
    const questionsLoaded = await fetchQuestions();
    
    if (!questionsLoaded) {
      currentDefinition.textContent = 'Error al cargar las preguntas. Por favor, recarga la página.';
      loadingOverlay.style.display = 'none';
      return;
    }
    
    // Mostrar primera pregunta
    displayQuestion(0);
    
    // Iniciar temporizador
    startTimer();
    
    // Ocultar overlay de carga
    loadingOverlay.style.display = 'none';
    
    // Enfocar en el input de respuesta
    answerInput.focus();
    
    gameStarted = true;
  }
  
  // Display the current question
  function displayQuestion(index) {
    // Ensure the index is within bounds by wrapping around if needed
    if (index >= questions.length) {
      index = index % questions.length;
    }
    
    const question = questions[index];
    const currentLetter = question.letter;
    
    // Update current letter
    currentLetterDisplay.textContent = currentLetter;
    currentLetterDisplay.setAttribute('data-letter', currentLetter);
    currentQuestion.textContent = question.question;
    currentDefinition.textContent = question.definition;
    
    // Highlight current letter in the rosco
    Object.values(letterElements).forEach(elem => {
      elem.classList.remove('current');
    });
    
    const currentLetterElem = letterElements[currentLetter];
    if (currentLetterElem) {
      // If the question was previously skipped, reset its appearance to pending
      if (currentLetterElem.dataset.status === 'skipped') {
        currentLetterElem.classList.remove('skipped');
        currentLetterElem.dataset.status = 'pending';
        // Update the skipped count
        skippedAnswers--;
        skippedCountDisplay.textContent = skippedAnswers;
      }
      
      currentLetterElem.classList.add('current');
      
      // Si esta letra ya tenía una pista, mostrarla automáticamente
      if (letterHints[currentLetter]) {
        displayHintElement(currentLetter, letterHints[currentLetter]);
      } else {
        // Ocultar cualquier elemento de pista anterior
        hideAllHints();
      }
    }
    
    // Clear input
    answerInput.value = '';
    answerInput.focus();
  
    // Update stats
    updateStatsDisplay();
  }
  
  // Función para ocultar todas las pistas
  function hideAllHints() {
    const hintElements = document.querySelectorAll('.hint-element');
    hintElements.forEach(el => {
      el.style.display = 'none';
    });
  }
  
  // Handle answer submission
  function handleAnswer() {
    if (!gameStarted || currentQuestionIndex >= questions.length) return;
    
    const userAnswer = answerInput.value.toLowerCase().trim();
    const currentQuestion = questions[currentQuestionIndex];
    const currentLetter = currentQuestion.letter;
    const correctAnswer = currentQuestion.answer.toLowerCase().trim();
    
    // Check if answer is empty
    if (userAnswer === '') {
      // Si el input está vacío, tratamos como skip
      skipQuestion();
      return;
    }
  
    const letterElem = letterElements[currentLetter];
    const similarity = stringSimilarity(userAnswer, correctAnswer);
    
    // Si la similitud es alta (>0.75) o son iguales después de normalizar
    if (similarity > 0.75 || normalizeText(userAnswer) === normalizeText(correctAnswer)) {
      // Correct answer - solo cambiamos el color, sin notificación
      letterElem.classList.add('correct');
      letterElem.dataset.status = 'correct';
      correctAnswers++;
      // Sonido sutil
      playSound(correctSound);
      
      // Actualizar contador
      correctCountDisplay.textContent = correctAnswers;
      
      // Eliminar pista si existe
      removeHintForLetter(currentLetter);
      
      // Mover a la siguiente pregunta
      moveToNextQuestion();
    } 
    // Comprobar si es una respuesta parcial
    else if (isPartialAnswer(userAnswer, correctAnswer) && incompleteAttempts > 0) {
      // Si es la primera vez que intenta con esta letra
      const letterKey = currentQuestion.letter;
      
      if (!partialAnswers[letterKey]) {
        incompleteAttempts--;
        partialAnswers[letterKey] = userAnswer;
        
        // Mostrar mensaje genérico sin revelar la respuesta
        showGameMessage("Respuesta incompleta, intente nuevamente", 'warning');
        
        // No avanzar a la siguiente pregunta
        answerInput.value = '';
        answerInput.focus();
      } else {
        // Si ya intentó antes con esta letra
        showGameMessage('Ya has usado una respuesta parcial para esta letra', 'warning');
      }
    } else {
      // Incorrect answer - solo cambiamos el color, sin notificación
      letterElem.classList.add('incorrect');
      letterElem.dataset.status = 'incorrect';
      incorrectAnswersList.push({ 
        letter: currentLetter, 
        correctAnswer: correctAnswer,
        userAnswer: userAnswer
      });
      incorrectAnswersCount++;
      // Sonido sutil
      playSound(incorrectSound);
      
      // Actualizar contador
      incorrectCountDisplay.textContent = incorrectAnswersCount;
      
      // Eliminar pista si existe
      removeHintForLetter(currentLetter);
      
      // Add error
      addError();
      
      // Mover a la siguiente pregunta
      moveToNextQuestion();
    }
    
    // Limpiar el input
    answerInput.value = '';
    
    // Update stats
    updateStatsDisplay();
  }
  
  // Eliminar pista para una letra específica
  function removeHintForLetter(letter) {
    // Eliminar el elemento visual de la pista
    const hintElement = document.querySelector(`.hint-element[data-letter="${letter}"]`);
    if (hintElement) {
      hintElement.remove();
    }
    
    // Eliminar del registro de pistas
    delete letterHints[letter];
  }
  
  // Handle skipping a question
  function skipQuestion() {
    if (!gameStarted || currentQuestionIndex >= questions.length) return;
    
    const currentLetter = questions[currentQuestionIndex].letter;
    const letterElem = letterElements[currentLetter];
    
    // Mark as skipped
    letterElem.classList.add('skipped');
    letterElem.dataset.status = 'skipped';
    skippedAnswers++;
    playSound(skipSound);
    
    // Actualizar contador
    skippedCountDisplay.textContent = skippedAnswers;
    
    // Move to next question
    moveToNextQuestion();
    
    // Update stats
    updateStatsDisplay();
  }
  
  // Move to the next unanswered question
  function moveToNextQuestion() {
    // Update current index
    currentQuestionIndex++;
    
    // Check if we've gone through all questions
    if (currentQuestionIndex >= questions.length) {
      let pendingQuestionFound = false;
      
      // Find the first unanswered question (cycling back to A)
      for (let i = 0; i < questions.length; i++) {
        const letter = questions[i].letter;
        const letterElem = letterElements[letter];
        
        // Consider both pending and skipped questions
        if (letterElem.dataset.status === 'pending' || letterElem.dataset.status === 'skipped') {
          currentQuestionIndex = i;
          pendingQuestionFound = true;
          break;
        }
      }
      
      // If all questions have been answered (no pending or skipped questions), end the game
      if (!pendingQuestionFound) {
        endGame();
        return;
      }
      
      // Show message when cycling back from Z to A
      if (currentQuestionIndex === 0 && pendingQuestionFound) {
        showGameMessage('¡Continuamos con las preguntas pendientes!', 'info');
      }
    }
    
    // Display the next question
    displayQuestion(currentQuestionIndex);
    
    // Update stats
    updateStatsDisplay();
  }
  
  // Start the timer
  function startTimer() {
  clearInterval(timerInterval);
    
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
      remainingTime--;
      
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        endGame();
      }
      
      updateTimerDisplay();
    }, 1000);
  }
  
  // Update the timer display
  function updateTimerDisplay() {
    // Mostrar solo segundos totales
    timer.textContent = `${remainingTime}`;
    
    // Calcular porcentaje de tiempo restante basado en el tiempo inicial
    const timePercentage = (remainingTime / timeLimit) * 100;
    
    // Remover todas las clases de tiempo
    timer.classList.remove('low-time');
    document.querySelector('.mini-timer').classList.remove('low-time', 'medium-time');
    
    // Cambiar color basado en el porcentaje de tiempo restante
    if (timePercentage <= 15) {
      // Rojo - Menos del 15% del tiempo
      timer.classList.add('low-time');
      document.querySelector('.mini-timer').classList.add('low-time');
    } else if (timePercentage <= 40) {
      // Amarillo - Entre 15% y 40% del tiempo
      document.querySelector('.mini-timer').classList.add('medium-time');
    }
    // Por encima de 40% se mantiene en verde (valor por defecto)
  }
  
  // Add error and check if game should end
  function addError() {
    errorCount++;
    
    // Update error dots
    for (let i = 0; i < errorDots.length; i++) {
      if (i < errorCount) {
        errorDots[i].classList.add('active');
      }
    }
    
    // Check if game should end (3 errors)
    if (errorCount >= 3) {
      endGame();
    }
  }
  
  // End the game
  function endGame() {
    clearInterval(timerInterval);
    gameStarted = false;
    
    // Track user's attempt details in incorrectAnswersList
    const incorrectItems = incorrectAnswersList.map(item => {
      const question = questions.find(q => q.letter === item.letter);
      return {
        letter: item.letter,
        userAnswer: item.userAnswer || "Sin respuesta",
        correctAnswer: item.correctAnswer,
        question: question ? question.definition : ""
      };
    });
    
    // Determine which modal to show based on end condition
    let modalType;
    let victory = false;
    
    if (errorCount >= 3) {
      // Game ended due to too many errors
      modalType = 'defeat';
      victory = false;
    } else if (remainingTime <= 0) {
      // Game ended due to timeout
      modalType = 'timeout';
      victory = false;
    } else {
      // Game ended because all questions were answered (victory)
      modalType = 'victory';
      victory = true;
    }
    
    // Update stats in the stats modal
    document.getElementById('stats-correct').textContent = correctAnswers;
    document.getElementById('stats-incorrect').textContent = incorrectAnswersCount;
    document.getElementById('stats-skipped').textContent = skippedAnswers;
    
    // Generate incorrect answers list
    generateIncorrectAnswersList(incorrectItems);
    
    // Show the corresponding modal
    const modal = document.getElementById(`${modalType}-modal`);
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    // Play game over sound
    playSound(gameOverSound);
    
    // ==================== SAVE GAME RESULTS TO PROFILE ====================
    try {
      // Calcular puntuación basada en respuestas correctas y tiempo restante
      const timeBonus = remainingTime > 0 ? Math.floor(remainingTime / 10) : 0;
      const scoreBase = correctAnswers * 10;
      const difficultyMultiplier = 
        selectedDifficulty === 'dificil' ? 2.0 : 
        selectedDifficulty === 'normal' ? 1.5 : 1.0;
      
      const totalScore = Math.floor((scoreBase + timeBonus) * difficultyMultiplier);
      
      // Crear objeto con los datos del juego
      const gameData = {
        username: username || localStorage.getItem('username') || 'Jugador',
        date: new Date().toISOString(),
        difficulty: selectedDifficulty,
        score: totalScore,
        correct: correctAnswers,
        wrong: incorrectAnswersCount,
        skipped: skippedAnswers,
        timeUsed: initialTime - remainingTime,
        timeRemaining: remainingTime,
        victory: victory,
        hintsUsed: 2 - helpCount,
        incorrectItems: incorrectItems
      };
      
      console.log('Guardando resultados del juego para el perfil:', gameData);
      
      // Guardar últimos resultados para uso en la página de perfil/ranking
      localStorage.setItem('lastGameStats', JSON.stringify({
        score: totalScore,
        correct: correctAnswers,
        wrong: incorrectAnswersCount,
        skipped: skippedAnswers,
        difficulty: selectedDifficulty,
        victory: victory
      }));
      
      // Establecer flag para indicar que se acaba de completar un juego
      localStorage.setItem('gameJustCompleted', 'true');
      
      // Usar la función de utils.js para guardar los resultados
      if (typeof Utils !== 'undefined' && Utils.saveGameResult) {
        Utils.saveGameResult(gameData);
      } else {
        // Si no está disponible Utils, intentar usar la función de profile.js directamente
        if (typeof processGameCompletion === 'function') {
          processGameCompletion(gameData);
        } else {
          console.warn('No se pudo guardar el resultado del juego en el perfil. Asegúrate de que utils.js o profile.js están cargados.');
          
          // Guardar al menos en localStorage como respaldo
          const userIP = localStorage.getItem('userIP') || 'unknown-ip';
          const historyKey = `gameHistory_${userIP}`;
          let history = [];
          
          try {
            const existingHistory = localStorage.getItem(historyKey);
            if (existingHistory) {
              history = JSON.parse(existingHistory);
            }
            
            history.unshift(gameData);
            
            // Limitar historial a 50 partidas
            if (history.length > 50) {
              history = history.slice(0, 50);
            }
            
            localStorage.setItem(historyKey, JSON.stringify(history));
          } catch (e) {
            console.error('Error guardando historial de partida:', e);
          }
        }
      }
      
      // Configurar redirección automática al perfil después de mostrar brevemente el modal
      setTimeout(() => {
        window.location.href = 'profile.html?fromGame=true';
      }, 3000);
      
    } catch (error) {
      console.error('Error guardando resultados del juego:', error);
    }
  }
  
  // Generate the list of incorrect answers for the stats modal
  function generateIncorrectAnswersList(incorrectItems) {
    const container = document.getElementById('incorrect-answers-list');
    container.innerHTML = '';
    
    if (incorrectItems.length === 0) {
      // Show a congratulatory message if no errors
      container.innerHTML = `
        <div class="no-errors-message">
          <i class="fas fa-check-circle"></i>
          ¡Felicidades! No has cometido ningún error.
        </div>
      `;
      return;
    }
    
    // Add each incorrect answer to the list
    incorrectItems.forEach(item => {
      const answerItem = document.createElement('div');
      answerItem.className = 'incorrect-answer-item';
      
      answerItem.innerHTML = `
        <div class="answer-details">
          <div class="incorrect-letter">${item.letter}</div>
          <div class="answer-text">
            <div class="question-text">${item.question}</div>
            <div class="your-answer">Tu respuesta: ${item.userAnswer}</div>
            <div class="correct-answer">Respuesta correcta: ${item.correctAnswer}</div>
          </div>
        </div>
      `;
      
      container.appendChild(answerItem);
    });
  }
  
  // Update stats display
  function updateStatsDisplay() {
    correctCountDisplay.textContent = correctAnswers;
    incorrectCountDisplay.textContent = incorrectAnswersCount;
    skippedCountDisplay.textContent = skippedAnswers;
    
    // Calculate remaining questions (pending and skipped letters)
    let remaining = 0;
    for (const letter in letterElements) {
      if (letterElements[letter].dataset.status === 'pending' || letterElements[letter].dataset.status === 'skipped') {
        remaining++;
      }
    }
    
    remainingCountDisplay.textContent = remaining;
  }
  
  // Show toast notification
  function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    // Set toast type
    toast.className = 'toast';
    toast.classList.add(`toast-${type}`);
    
    // Configurar el ícono según el tipo
    const toastIcon = toast.querySelector('.toast-icon i') || document.createElement('i');
    
    if (!toast.querySelector('.toast-icon')) {
      const iconContainer = document.createElement('div');
      iconContainer.className = 'toast-icon';
      iconContainer.appendChild(toastIcon);
      toast.insertBefore(iconContainer, toastMessage);
    }
    
    // Actualizar el ícono según el tipo de toast
    if (type === 'success') {
      toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
      toastIcon.className = 'fas fa-times-circle';
    } else if (type === 'warning') {
      toastIcon.className = 'fas fa-exclamation-triangle';
    } else if (type === 'info') {
      toastIcon.className = 'fas fa-info-circle';
    }
    
    // Show the toast
    toast.style.display = 'flex';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 3000);
  }
  
  // Play sound
function playSound(sound) {
    if (soundEnabled && sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.log('Error playing sound:', e));
    }
  }
  
  // Toggle sound
  function toggleSound() {
    soundEnabled = !soundEnabled;
    
    const icon = soundToggle.querySelector('i');
    if (!soundEnabled) {
      icon.className = 'fas fa-volume-mute';
      soundToggle.classList.add('muted');
  } else {
      icon.className = 'fas fa-volume-up';
      soundToggle.classList.remove('muted');
    }
    
    // Play click sound if sound is enabled
    if (soundEnabled) {
      playSound(clickSound);
    }
  }
  
  // Reset the game
  function resetGame() {
    // Reset game state
    currentQuestionIndex = 0;
    correctAnswers = 0;
    incorrectAnswersList = [];
    incorrectAnswersCount = 0;
    skippedAnswers = 0;
    
    // Restablecer el tiempo según la dificultad seleccionada
    getSelectedDifficulty();
    
    errorCount = 0;
    helpCount = 2; // Restablecer contador de pistas
    
    // Eliminar todas las pistas
    letterHints = {};
    hideAllHints();
    
    // Restablecer botón de ayuda
    helpBtn.disabled = false;
    helpBtn.style.opacity = '1';
    updateHelpButtonText();
    
    // Restablecer intentos incompletos y respuestas parciales
    incompleteAttempts = 2;
    partialAnswers = {};
    
    // Hide all modals
    hideModals();
    
    // Reset UI
    errorDots.forEach(dot => dot.classList.remove('active'));
    
    // Initialize game again
    initGame();
  }
  
  // Event listeners
  soundToggle.addEventListener('click', function() {
    toggleSound();
  });
  
  // Stats buttons on result modals
  document.getElementById('victory-stats-btn').addEventListener('click', function() {
    switchToStatsModal('victory-modal');
  });
  
  document.getElementById('timeout-stats-btn').addEventListener('click', function() {
    switchToStatsModal('timeout-modal');
  });
  
  document.getElementById('defeat-stats-btn').addEventListener('click', function() {
    switchToStatsModal('defeat-modal');
  });
  
  // Function to switch from a result modal to the stats modal
  function switchToStatsModal(sourceModalId) {
    console.log("Switching to stats modal from:", sourceModalId);
    
    // Get the source and target modals
    const sourceModal = document.getElementById(sourceModalId);
    const statsModal = document.getElementById('stats-modal');
    
    if (!statsModal) {
      console.error("Stats modal not found!");
      return;
    }
    
    // Force any necessary style resets on the stats modal
    statsModal.style.display = 'none';
    statsModal.classList.remove('show');
    
    // First fade out the source modal
    if (sourceModal) {
      sourceModal.classList.remove('show');
      
      setTimeout(() => {
        // Hide the source modal completely
        sourceModal.style.display = 'none';
        
        // Show the stats modal with display:flex first
        statsModal.style.display = 'flex';
        
        // Force browser reflow before adding the show class
        void statsModal.offsetWidth;
        
        // Then add the show class to trigger the animation
        requestAnimationFrame(() => {
          statsModal.classList.add('show');
          console.log("Stats modal should now be visible");
        });
      }, 400); // Wait for source modal fade out
    } else {
      // If no source modal, just show the stats modal
      statsModal.style.display = 'flex';
      
      // Force browser reflow
      void statsModal.offsetWidth;
      
      // Add show class
      requestAnimationFrame(() => {
        statsModal.classList.add('show');
      });
    }
  }
  
  // Hide stats modal
  function hideStatsModal() {
    console.log("Hiding stats modal");
    const statsModal = document.getElementById('stats-modal');
    
    if (statsModal) {
      // Remove show class first to trigger fade out
      statsModal.classList.remove('show');
      
      // Wait for animation to complete before hiding completely
      setTimeout(() => {
        statsModal.style.display = 'none';
      }, 500); // Match the CSS transition duration
    }
  }
  
  // Function to hide all modals
  function hideModals() {
    const modals = document.querySelectorAll('.result-modal');
    modals.forEach(modal => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    });
  }
  
  // Llamar a la inicialización de la UI
  initUI();
  
  // Initialize game on page load
  initGame();

  // Add this function near the top of the file, after other initialization code
  function adjustRoscoForMobile() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const roscoContainer = document.getElementById('rosco-container');
    
    if (!roscoContainer) return;
    
    // Get all letter elements
    const letterElements = document.querySelectorAll('.rosco-letter');
    const isPortrait = height > width;
    const isMobile = width <= 480;
    const isTablet = width > 480 && width <= 768;
    
    // Apply different scaling and positioning for mobile
    if (isMobile) {
      // Calcular el radio extremadamente pequeño para letras
      let radius = isPortrait ? Math.min(width, height) * 0.18 : Math.min(width, height) * 0.15;
      
      // Limitar el radio a un valor máximo muy pequeño
      radius = Math.min(radius, isPortrait ? 80 : 90);
      
      // Asegurar que el radio sea suficiente para que las letras no se superpongan a la tarjeta
      const questionCard = document.querySelector('.question-card');
      if (questionCard) {
        const cardWidth = questionCard.offsetWidth || 150;
        const cardHeight = questionCard.offsetHeight || 180;
        const diagonalQuestionCard = Math.sqrt(Math.pow(cardWidth/2, 2) + Math.pow(cardHeight/2, 2));
        const minRadius = diagonalQuestionCard + 5; // Margen mínimo
        radius = Math.max(radius, minRadius);
      }
      
      // Position the center of the rosco - Ajustar para dejar espacio para el footer
      const centerX = width / 2;
      const footerHeight = 70; // Altura estimada del footer
      const centerY = (height - footerHeight) * (isPortrait ? 0.4 : 0.45); // Más arriba para dejar espacio al footer
      
      // Update the rosco container position and size
      roscoContainer.style.width = `${width}px`;
      roscoContainer.style.height = `${(height - footerHeight) * 0.85}px`;
      roscoContainer.style.transform = 'none';
      roscoContainer.style.transformOrigin = 'center center';
      roscoContainer.style.border = 'none';
      roscoContainer.style.background = 'none';
      roscoContainer.style.boxShadow = 'none';
      roscoContainer.style.marginBottom = `${footerHeight}px`; // Espacio para el footer
      
      // The positioning for landscape mode
      if (!isPortrait) {
        // Even smaller radius for landscape
        radius = Math.min(width, height) * 0.15;
        radius = Math.min(radius, 80);
        
        // Move the question card more to the left
        const questionCard = document.querySelector('.question-card');
        if (questionCard) {
          questionCard.style.transform = 'translate(-50%, -50%) scale(0.85)';
          questionCard.style.width = '45%';
          questionCard.style.maxWidth = '130px';
        }
        
        // Move the rosco status to the right side
        const roscoStatus = document.querySelector('.rosco-status');
        if (roscoStatus) {
          roscoStatus.style.right = '0';
          roscoStatus.style.left = 'auto';
          roscoStatus.style.top = '40%'; // Un poco más arriba para que no interfiera con el footer
          roscoStatus.style.transform = 'translateY(-50%)';
          roscoStatus.style.flexDirection = 'column';
          roscoStatus.style.width = '28px';
          roscoStatus.style.padding = '4px 2px';
          roscoStatus.style.borderRadius = '12px 0 0 12px';
        }
      } else {
        // Reset question card position in portrait mode
        const questionCard = document.querySelector('.question-card');
        if (questionCard) {
          questionCard.style.transform = 'translate(-50%, -50%)';
          questionCard.style.width = '55%';
          questionCard.style.maxWidth = '150px';
        }
        
        // Mover el panel de estatus un poco más arriba en modo retrato
        const roscoStatus = document.querySelector('.rosco-status');
        if (roscoStatus) {
          roscoStatus.style.top = '40%';
        }
      }
      
      // Apply a fixed size to letter elements
      letterElements.forEach(elem => {
        elem.style.width = '20px';
        elem.style.height = '20px';
        elem.style.fontSize = '12px';
        elem.style.lineHeight = '20px';
      });
      
      // Position each letter in a circle
      letterElements.forEach((elem, index) => {
        const totalLetters = letterElements.length;
        
        // Calculate angle for each letter (starting from the top, going clockwise)
        const angle = (2 * Math.PI * index / totalLetters) - (Math.PI / 2);
        
        // Calculate position based on angle and radius
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Set absolute position
        elem.style.left = `${x - 10}px`; // Center based on width/2
        elem.style.top = `${y - 10}px`;
        elem.style.position = 'absolute';
        
        // Make sure current letter appears above others
        if (elem.classList.contains('current')) {
          elem.style.width = '24px';
          elem.style.height = '24px';
          elem.style.fontSize = '14px';
          elem.style.zIndex = '100';
          elem.style.left = `${x - 12}px`; // Adjust for larger size
          elem.style.top = `${y - 12}px`;
        }
      });
      
      // Forzar la aplicación de los estilos móviles
      const estilosMobile = document.createElement('style');
      estilosMobile.id = 'estilos-mobile-override';
      estilosMobile.textContent = `
        #rosco-container::before, #rosco-container::after {
          display: none !important;
        }
        
        /* Asegurarse que la caja de preguntas sea pequeña */
        .question-card {
          min-height: auto !important;
        }
        
        /* Asegurar que los elementos ajustados tengan en cuenta el footer */
        .game-container {
          padding-bottom: 70px !important;
        }
        
        /* Estilo específico para el footer fijo */
        .policy-footer {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          width: 100% !important;
          z-index: 50 !important;
        }
      `;
      
      // Remove previous style if exists
      const prevStyle = document.getElementById('estilos-mobile-override');
      if (prevStyle) prevStyle.remove();
      
      document.head.appendChild(estilosMobile);
      
      // Asegurarse de que el footer sea visible
      const footer = document.querySelector('.policy-footer');
      if (footer) {
        footer.style.display = 'flex';
        footer.style.zIndex = '50';
      }
      
    } else if (isTablet) {
      // Tablet mode
      roscoContainer.style.transform = 'scale(0.9)';
      roscoContainer.style.transformOrigin = 'center center';
      
      // Asegurarse de que el footer tenga un estilo adecuado para tablets
      const footer = document.querySelector('.policy-footer');
      if (footer) {
        footer.style.position = 'relative';
        footer.style.marginTop = '20px';
      }
    } else {
      // Reset for desktop
      roscoContainer.style.transform = '';
      roscoContainer.style.width = '';
      roscoContainer.style.height = '';
      roscoContainer.style.marginBottom = '';
      
      // Reset letter positions for desktop (if needed)
      letterElements.forEach(elem => {
        if (elem.style.left && elem.style.top && !elem.getAttribute('data-original-position')) {
          // Store original positions if not already stored
          elem.setAttribute('data-original-position', `${elem.style.left}|${elem.style.top}`);
        } else if (elem.getAttribute('data-original-position')) {
          // Restore original positions
          const pos = elem.getAttribute('data-original-position').split('|');
          elem.style.left = pos[0];
          elem.style.top = pos[1];
        }
      });
      
      // Restaurar el estilo normal del footer
      const footer = document.querySelector('.policy-footer');
      if (footer) {
        footer.style.position = '';
        footer.style.bottom = '';
        footer.style.left = '';
        footer.style.width = '';
        footer.style.zIndex = '';
      }
    }
  }

  // Call the adjustment function on page load and window resize
  window.addEventListener('load', adjustRoscoForMobile);
  window.addEventListener('resize', adjustRoscoForMobile);

  // Add orientation change event handler for mobile devices
  window.addEventListener('orientationchange', function() {
    setTimeout(adjustRoscoForMobile, 100); // Slight delay to ensure DOM is updated
  });
});

// Función para mostrar mensajes sutiles
function showGameMessage(message, type = 'info') {
  // Buscar o crear el elemento para el mensaje
  let gameMessage = document.querySelector('.game-message');
  
  if (!gameMessage) {
    gameMessage = document.createElement('div');
    gameMessage.className = 'game-message';
    document.body.appendChild(gameMessage);
  }
  
  // Limpiar clases previas
  gameMessage.className = 'game-message';
  
  if (type) {
    gameMessage.classList.add(`toast-${type}`);
  }
  
  // Establecer el mensaje
  gameMessage.textContent = message;
  
  // Mostrar el mensaje (la animación y ocultación se maneja en CSS)
  gameMessage.style.display = 'block';
  
  // Eliminar el mensaje después de que termine la animación
  setTimeout(() => {
    gameMessage.style.display = 'none';
  }, 3500); // Correspondiente a la duración total de las animaciones CSS
}

// Close button on stats modal
document.getElementById('close-stats-btn').addEventListener('click', function() {
  hideStatsModal();
});

// New navigation buttons for the stats modal
document.getElementById('profile-btn').addEventListener('click', function() {
  window.location.href = 'profile.html';
});

document.getElementById('ranking-btn').addEventListener('click', function() {
  window.location.href = 'ranking.html';
});

document.getElementById('play-again-btn').addEventListener('click', function() {
  hideStatsModal();
  hideModals();
  resetGame();
});
