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
    
    // Si la respuesta del usuario (s1) contiene la respuesta correcta completa (s2)
    // pero NO al revés (para evitar aceptar respuestas incompletas)
    if (s1.includes(s2)) return 1;
    
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
  
  // Función para verificar si una respuesta es parcial
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
    // y tiene al menos 3 caracteres (para evitar falsos positivos)
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
      let skippedQuestionFound = false;
      
      // Find the first skipped question (cycling back to A)
      for (let i = 0; i < questions.length; i++) {
        const letter = questions[i].letter;
        const letterElem = letterElements[letter];
        
        // Only look for skipped questions, ignore correct and incorrect
        if (letterElem.dataset.status === 'skipped') {
          currentQuestionIndex = i;
          skippedQuestionFound = true;
          break;
        }
      }
      
      // If no skipped questions remain, or we have 3 errors, end the game
      if (!skippedQuestionFound || errorCount >= 3) {
        endGame();
        return;
      }
      
      // Show message when cycling back to skipped questions
      if (skippedQuestionFound) {
        showGameMessage('¡Continuamos con las preguntas que pasaste!', 'info');
      }
    } else {
      // During the first round, skip questions that are already answered
      const currentLetter = questions[currentQuestionIndex].letter;
      const currentLetterElem = letterElements[currentLetter];
      const status = currentLetterElem.dataset.status;
      
      // If this question was already answered (correct or incorrect), move to next
      if (status === 'correct' || status === 'incorrect') {
        moveToNextQuestion();
        return;
      }
    }
    
    // Display the next question
    displayQuestion(currentQuestionIndex);
    
    // Update stats
    updateStatsDisplay();
    
    // Check if we should end the game (all questions answered except skipped)
    let allAnswered = true;
    let hasSkipped = false;
    
    for (const letter in letterElements) {
      const status = letterElements[letter].dataset.status;
      if (status === 'pending') {
        allAnswered = false;
        break;
      }
      if (status === 'skipped') {
        hasSkipped = true;
      }
    }
    
    // End game if all questions are answered (except skipped) and we have 3 errors
    if ((allAnswered && !hasSkipped) || errorCount >= 3) {
      endGame();
    }
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
    // Detener el temporizador y establecer el juego como finalizado
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
      // Check if all questions are answered (not pending or skipped)
      let allAnswered = true;
      let hasSkipped = false;
      
      for (const letter in letterElements) {
        const status = letterElements[letter].dataset.status;
        if (status === 'pending') {
          allAnswered = false;
          break;
        }
        if (status === 'skipped') {
          hasSkipped = true;
        }
      }
      
      // Victory if all questions are answered (except skipped) and less than 3 errors
      if (allAnswered && errorCount < 3) {
        modalType = 'victory';
        victory = true;
      } else if (hasSkipped) {
        // If there are still skipped questions, don't end the game
        return;
      } else {
        // Otherwise, it's a defeat
        modalType = 'defeat';
        victory = false;
      }
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
      
      // Asegurar que el nombre de usuario esté guardado
      let username = localStorage.getItem('username');
      if (!username || username === 'undefined' || username === 'null') {
        username = 'Jugador';
        localStorage.setItem('username', username);
      }
      
      // Crear objeto con los datos del juego
      const gameData = {
        name: username,
        date: new Date().toISOString(),
        difficulty: selectedDifficulty,
        score: totalScore,
        correct: correctAnswers,
        wrong: incorrectAnswersCount,
        skipped: skippedAnswers,
        timeUsed: timeLimit - remainingTime,
        timeRemaining: remainingTime,
        victory: victory,
        hintsUsed: 2 - helpCount,
        incorrectItems: incorrectItems
      };
      
      console.log('Guardando resultados del juego:', gameData);
      
      // Guardar datos del jugador usando nuestra nueva función
      savePlayerData(gameData);
      
      // Indicar que acabamos de completar un juego
      localStorage.setItem('gameJustCompleted', 'true');
      localStorage.setItem('hasPlayed', 'true');
      
      // Guardar último timestamp para evitar problemas de caché
      localStorage.setItem('lastGameTimestamp', Date.now().toString());
      
      // Configurar botones de los modales para redirigir al perfil
      configureModalButtons();
      
    } catch (error) {
      console.error('Error guardando resultados del juego:', error);
    }
    
    // Mostrar anuncio al finalizar la partida
    if (localStorage.getItem("adConsent") === "true") {
      setTimeout(() => {
        const gameEndAd = document.querySelector('.game-end-ad');
        if (gameEndAd) {
          // Primero mostrar un contenedor de carga mientras el anuncio se prepara
          gameEndAd.innerHTML = `
            <div class="ad-label">PUBLICIDAD</div>
            <div class="ad-loading"></div>
          `;
          gameEndAd.style.display = 'block';
          
          // Después de un breve delay, cargar el anuncio real
          setTimeout(() => {
            gameEndAd.innerHTML = `
              <div class="ad-label">PUBLICIDAD</div>
              <ins class="adsbygoogle"
                   style="display:block"
                   data-ad-client="ca-pub-9579152019412427"
                   data-ad-slot="1234567890"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
            `;
            (adsbygoogle = window.adsbygoogle || []).push({});
          }, 600);
        }
      }, 1000); // Mostrar el anuncio un segundo después de que aparezca el modal
    }
  }
  
  // Configurar botones de los modales para redirigir al perfil
  function configureModalButtons() {
    // Configurar botones "Ver logros" en cada modal de resultado
    const achievementsButtons = [
      document.getElementById('victory-stats-btn'),
      document.getElementById('timeout-stats-btn'),
      document.getElementById('defeat-stats-btn')
    ];
    
    achievementsButtons.forEach(button => {
      if (button) {
        // Limpiar event listeners anteriores
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Añadir nuevo event listener
        newButton.addEventListener('click', function() {
          // Mostrar modal de logros
          const sourceModalId = this.closest('.modal').id;
          switchToAchievementsModal(sourceModalId);
        });
      }
    });
    
    // Configurar botón para ir de logros a estadísticas
    const achievementsStatsBtn = document.getElementById('achievements-stats-btn');
    if (achievementsStatsBtn) {
      // Limpiar event listeners anteriores
      const newButton = achievementsStatsBtn.cloneNode(true);
      achievementsStatsBtn.parentNode.replaceChild(newButton, achievementsStatsBtn);
      
      // Añadir nuevo event listener
      newButton.addEventListener('click', function() {
        switchToStatsModal('achievements-modal');
        
        // Configurar botones en el modal de estadísticas
        configureStatsModalButtons();
      });
    }
  }
  
  // Configurar botones en el modal de estadísticas
  function configureStatsModalButtons() {
    // Botón "Ver Perfil"
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      // Limpiar event listeners anteriores
      const newProfileBtn = profileBtn.cloneNode(true);
      profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
      
      // Añadir nuevo event listener
      newProfileBtn.addEventListener('click', function() {
        window.location.href = 'profile.html?fromGame=true&t=' + Date.now();
      });
    }
    
    // Botón "Ver Ranking"
    const rankingBtn = document.getElementById('ranking-btn');
    if (rankingBtn) {
      // Limpiar event listeners anteriores
      const newRankingBtn = rankingBtn.cloneNode(true);
      rankingBtn.parentNode.replaceChild(newRankingBtn, rankingBtn);
      
      // Añadir nuevo event listener
      newRankingBtn.addEventListener('click', function() {
        window.location.href = 'ranking.html?fromGame=true&t=' + Date.now();
      });
    }
    
    // Botón "Jugar de Nuevo"
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
      // Limpiar event listeners anteriores
      const newPlayAgainBtn = playAgainBtn.cloneNode(true);
      playAgainBtn.parentNode.replaceChild(newPlayAgainBtn, playAgainBtn);
      
      // Añadir nuevo event listener
      newPlayAgainBtn.addEventListener('click', function() {
        hideStatsModal();
        hideModals();
        resetGame();
      });
    }
    
    // Botón para cerrar estadísticas
    const closeStatsBtn = document.getElementById('close-stats-btn');
    if (closeStatsBtn) {
      // Limpiar event listeners anteriores
      const newCloseStatsBtn = closeStatsBtn.cloneNode(true);
      closeStatsBtn.parentNode.replaceChild(newCloseStatsBtn, closeStatsBtn);
      
      // Añadir nuevo event listener
      newCloseStatsBtn.addEventListener('click', function() {
        hideStatsModal();
      });
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
    const modals = document.querySelectorAll('.result-modal, #achievements-modal');
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

  // Redirección al ranking
  const rankingBtn = document.getElementById('ranking-btn');
  if (rankingBtn) {
    rankingBtn.addEventListener('click', function() {
      window.location.href = 'ranking.html';
    });
  }
  
  // Redirección al perfil
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', function() {
      window.location.href = 'profile.html';
    });
  }
  
  // Redirección a Futbol Millonario
  const millonarioBtn = document.getElementById('millonario-btn');
  if (millonarioBtn) {
    millonarioBtn.addEventListener('click', function() {
      window.location.href = 'millonario/index.html';
    });
  }
  
  // Redirección al about
  const aboutBtn = document.getElementById('about-btn');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', function() {
      window.location.href = 'about.html';
    });
  }

  // Toggle menu
  const menuToggle = document.getElementById('menu-toggle');
  const optionsMenu = document.getElementById('options-menu');
  
  if (menuToggle && optionsMenu) {
    menuToggle.addEventListener('click', function() {
      optionsMenu.classList.toggle('hide');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!optionsMenu.contains(e.target) && e.target !== menuToggle) {
        optionsMenu.classList.add('hide');
      }
    });
  }
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

// Después de guardar los resultados del juego en endGame() o donde corresponda

// Asegurar que la información del jugador se guarde correctamente
function savePlayerData(gameData) {
  try {
    // Guardar nombre de usuario en localStorage para uso futuro
    if (gameData.name) {
      localStorage.setItem('username', gameData.name);
    }
    
    // Guardar datos de última partida para mostrar en ranking
    localStorage.setItem('lastGameStats', JSON.stringify({
      score: gameData.score || 0,
      correct: gameData.correct || 0,
      wrong: gameData.wrong || 0,
      skipped: gameData.skipped || 0,
      difficulty: gameData.difficulty || 'normal',
      victory: gameData.victory || false,
      date: new Date().toISOString()
    }));
    
    // Detectar IP del usuario y guardar registro
    const userIP = localStorage.getItem('userIP');
    if (userIP) {
      saveGameToHistory(gameData, userIP);
    } else {
      // Si no tenemos IP, intentar detectarla y luego guardar
      detectAndSaveUserIP().then(ip => {
        if (ip) {
          saveGameToHistory(gameData, ip);
        }
      });
    }
    
    console.log('Datos del jugador guardados correctamente');
  } catch (error) {
    console.error('Error al guardar datos del jugador:', error);
  }
}

// Función para guardar partida en el historial
function saveGameToHistory(gameData, userIP) {
  try {
    console.log('Guardando partida en historial para IP:', userIP);
    // Key para guardar historial en localStorage
    const historyKey = `gameHistory_${userIP}`;
    
    // Obtener historial existente o crear uno nuevo
    let history = [];
    const existingHistory = localStorage.getItem(historyKey);
    
    if (existingHistory) {
      try {
        history = JSON.parse(existingHistory);
        if (!Array.isArray(history)) {
          history = [];
        }
      } catch (e) {
        console.error('Error al parsear historial existente:', e);
        history = [];
      }
    }
    
    // Añadir nueva partida al inicio
    history.unshift(gameData);
    
    // Limitar historial a 50 partidas
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    // Guardar historial actualizado
    localStorage.setItem(historyKey, JSON.stringify(history));
    
    // Actualizar perfil del usuario
    updateUserProfile(gameData, userIP);
    
    console.log('Historial de juego guardado correctamente');
  } catch (error) {
    console.error('Error al guardar historial:', error);
  }
}

// Función para actualizar el perfil del usuario
function updateUserProfile(gameData, userIP) {
  try {
    // Key para guardar perfil en localStorage
    const profileKey = `profile_${userIP}`;
    
    // Intentar obtener perfil existente
    let profile = {
      name: gameData.name || 'Jugador',
      gamesPlayed: 0,
      totalScore: 0,
      bestScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalSkipped: 0,
      victories: 0,
      defeats: 0,
      lastPlayed: new Date().toISOString()
    };
    
    const existingProfile = localStorage.getItem(profileKey);
    if (existingProfile) {
      try {
        const parsedProfile = JSON.parse(existingProfile);
        if (parsedProfile && typeof parsedProfile === 'object') {
          profile = { ...profile, ...parsedProfile };
        }
      } catch (e) {
        console.error('Error al parsear perfil existente:', e);
      }
    }
    
    // Actualizar estadísticas
    profile.gamesPlayed += 1;
    profile.totalScore += gameData.score || 0;
    profile.bestScore = Math.max(profile.bestScore, gameData.score || 0);
    profile.totalCorrect += gameData.correct || 0;
    profile.totalWrong += gameData.wrong || 0;
    profile.totalSkipped += gameData.skipped || 0;
    profile.lastPlayed = new Date().toISOString();
    
    if (gameData.victory) {
      profile.victories += 1;
    } else {
      profile.defeats += 1;
    }
    
    // Guardar perfil actualizado
    localStorage.setItem(profileKey, JSON.stringify(profile));
    
    console.log('Perfil de usuario actualizado:', profile);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
  }
}

// Función para detectar y guardar IP del usuario
async function detectAndSaveUserIP() {
  try {
    // Intentar usar servicios externos para detectar IP
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      const ip = data.ip;
      localStorage.setItem('userIP', ip);
      return ip;
    }
    
    // Alternativa si la primera falla
    const backupResponse = await fetch('https://ipapi.co/json/');
    if (backupResponse.ok) {
      const backupData = await backupResponse.json();
      const ip = backupData.ip;
      localStorage.setItem('userIP', ip);
      return ip;
    }
    
    // Si ambas fallan, usar una combinación de timestamp y user agent
    const userAgent = navigator.userAgent;
    const timestamp = new Date().getTime();
    const fallbackID = `user-${btoa(userAgent).substring(0, 8)}-${timestamp}`;
    localStorage.setItem('userIP', fallbackID);
    return fallbackID;
  } catch (error) {
    console.error('Error al detectar IP:', error);
    return null;
  }
}

// Función para cambiar de un modal de resultado al modal de logros
function switchToAchievementsModal(sourceModalId) {
  console.log("Switching to achievements modal from:", sourceModalId);
  
  // Get the source and target modals
  const sourceModal = document.getElementById(sourceModalId);
  const achievementsModal = document.getElementById('achievements-modal');
  
  if (!achievementsModal) {
    console.error("Achievements modal not found!");
    return;
  }
  
  // Prepare achievement container
  const achievementsContainer = document.getElementById('unlocked-achievements');
  if (achievementsContainer) {
    // Check if we have achievements in localStorage
    loadAchievements(achievementsContainer);
  }
  
  // First fade out the source modal
  if (sourceModal) {
    sourceModal.classList.remove('show');
    
    setTimeout(() => {
      // Hide the source modal completely
      sourceModal.style.display = 'none';
      
      // Show the achievements modal with display:flex first
      achievementsModal.style.display = 'flex';
      
      // Force browser reflow before adding the show class
      void achievementsModal.offsetWidth;
      
      // Then add the show class to trigger the animation
      requestAnimationFrame(() => {
        achievementsModal.classList.add('show');
        console.log("Achievements modal should now be visible");
      });
    }, 400); // Wait for source modal fade out
  }
}

// Function to load achievements after a game
function loadAchievements(container) {
  container.innerHTML = '';
  
  // Check if we have the gameJustCompleted flag
  const gameJustCompleted = localStorage.getItem('gameJustCompleted') === 'true';
  
  // Get achievements from localStorage
  let achievements = [];
  try {
    const userIP = localStorage.getItem('userIP') || 'unknown';
    const storageKey = `userAchievements_${userIP}`;
    const savedAchievements = localStorage.getItem(storageKey);
    
    if (savedAchievements) {
      achievements = JSON.parse(savedAchievements);
      
      // Filter only achievements unlocked in the last 5 minutes (recently unlocked)
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const recentAchievements = achievements.filter(achievement => {
        if (!achievement.date) return false;
        const unlockDate = new Date(achievement.date);
        return unlockDate > fiveMinutesAgo;
      });
      
      // If we have recent achievements, display them
      if (recentAchievements.length > 0) {
        recentAchievements.forEach(achievement => {
          const card = createAchievementCard(achievement);
          container.appendChild(card);
        });
        return;
      }
    }
  } catch (error) {
    console.error('Error loading achievements:', error);
  }
  
  // If no achievements or error, show default message
  const noAchievements = document.createElement('div');
  noAchievements.className = 'no-achievements';
  noAchievements.innerHTML = `
    <i class="fas fa-trophy"></i>
    <p>¡Sigue jugando para desbloquear logros!</p>
  `;
  container.appendChild(noAchievements);
}

// Function to create achievement card
function createAchievementCard(achievement) {
  const card = document.createElement('div');
  card.className = 'achievement-card';
  
  card.innerHTML = `
    <div class="achievement-icon">
      <i class="${achievement.icon || 'fas fa-medal'}"></i>
    </div>
    <div class="achievement-info">
      <div class="achievement-title">${achievement.title || achievement.id}</div>
      <div class="achievement-description">${achievement.description || '¡Nuevo logro desbloqueado!'}</div>
    </div>
  `;
  
  return card;
}

// Nueva función para mostrar anuncio durante pausas en el juego
function showPauseAd() {
  // Solo mostrar si el usuario ha aceptado anuncios
  if (localStorage.getItem("adConsent") !== "true") return;
  
  // Solo mostrar si el juego está en progreso
  if (!gameStarted) return;
  
  // Evitar mostrar anuncios con demasiada frecuencia
  const lastPauseAd = parseInt(localStorage.getItem('lastPauseAdTimestamp') || '0');
  const now = Date.now();
  
  // Solo mostrar un anuncio de pausa cada 3 minutos como mínimo
  if (now - lastPauseAd < 3 * 60 * 1000) return;
  
  // Pausar el juego
  const currentTimerState = remainingTime;
  clearInterval(timerInterval);
  
  // Mostrar el contenedor de anuncios de pausa
  const pauseAdContainer = document.getElementById('pause-ad');
  if (!pauseAdContainer) return;
  
  // Crear contenido del anuncio de pausa
  pauseAdContainer.innerHTML = `
    <div class="pause-ad-header">
      <div class="pause-ad-title">Juego en pausa</div>
      <button class="pause-ad-close" id="close-pause-ad">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="ad-label">PUBLICIDAD</div>
    <div class="ad-loading"></div>
  `;
  
  pauseAdContainer.style.display = 'block';
  
  // Cargar el anuncio real después de mostrar el indicador de carga
  setTimeout(() => {
    pauseAdContainer.querySelector('.ad-loading').outerHTML = `
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-9579152019412427"
           data-ad-slot="9876543210"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    `;
    (adsbygoogle = window.adsbygoogle || []).push({});
  }, 600);
  
  // Configurar el botón de cierre
  document.getElementById('close-pause-ad').addEventListener('click', function() {
    pauseAdContainer.style.display = 'none';
    
    // Guardar timestamp para evitar mostrar otro anuncio pronto
    localStorage.setItem('lastPauseAdTimestamp', Date.now().toString());
    
    // Reanudar el juego
    remainingTime = currentTimerState;
    startTimer();
  });
  
  // Forzar cierre automático después de 20 segundos 
  setTimeout(() => {
    if (pauseAdContainer.style.display !== 'none') {
      pauseAdContainer.style.display = 'none';
      
      // Guardar timestamp
      localStorage.setItem('lastPauseAdTimestamp', Date.now().toString());
      
      // Reanudar el juego
      remainingTime = currentTimerState;
      startTimer();
    }
  }, 20000);
}

// Escuchar por eventos de activación/desactivación para mostrar anuncios
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden' && gameStarted) {
    // El usuario cambió de pestaña o minimizó - pausa el juego
    clearInterval(timerInterval);
  } else if (document.visibilityState === 'visible' && gameStarted) {
    // El usuario volvió - considera mostrar un anuncio antes de reanudar
    const wasAwayTime = parseInt(localStorage.getItem('lastHiddenTimestamp') || '0');
    const now = Date.now();
    
    if (wasAwayTime && now - wasAwayTime > 30000) {
      // Si estuvo ausente más de 30 segundos, mostrar anuncio de pausa
      showPauseAd();
    } else {
      // Si no, simplemente reanudar el juego
      startTimer();
    }
  }
});

// Almacenar el timestamp cuando el usuario se va
window.addEventListener('beforeunload', function() {
  if (gameStarted) {
    localStorage.setItem('lastHiddenTimestamp', Date.now().toString());
  }
});

// Evento para mostrar anuncio de pausa cuando el usuario presiona pausa (tecla ESC)
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && gameStarted) {
    e.preventDefault();
    showPauseAd();
  }
});

// Añadir estilos dinámicamente
const styleEl = document.createElement('style');
styleEl.textContent = `
  .floating-sound-btn, .sound-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.3);
    color: white;
    border: none;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    backdrop-filter: blur(5px);
    z-index: 100;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .sound-btn:hover {
    background-color: rgba(225, 29, 72, 0.7);
    transform: scale(1.1);
  }
`;
document.head.appendChild(styleEl);
