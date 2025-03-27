/**
 * PASALA CHE - Main Game Script
 * Maneja la lógica del rosco, carga de preguntas, respuestas del usuario, etc.
 */

document.addEventListener('DOMContentLoaded', function() {
  // ================== VARIABLES Y SELECTORES ==================
  let selectedDifficulty = 'facil';
  let timeLimit = 300; // Default: 5 minutos
  let remainingTime = timeLimit;
  let helpCount = 2;
  let letterHints = {};
  let soundEnabled = true;

  // DOM elements
  const loadingOverlay = document.getElementById('loading-overlay');
  const roscoContainer = document.getElementById('rosco-container');
  const currentLetterDisplay = document.querySelector('.current-letter-display');
  const currentQuestionElem = document.querySelector('.current-question');
  const currentDefinitionElem = document.querySelector('.current-definition');
  const answerForm = document.getElementById('answer-form');
  const answerInput = document.getElementById('answer-input');
  const helpBtn = document.getElementById('help-btn');
  const submitBtn = document.getElementById('submit-btn');
  const skipBtn = document.getElementById('skip-btn');
  const timerElem = document.getElementById('timer');
  const soundToggle = document.getElementById('sound-toggle');
  const toast = document.getElementById('toast');
  const toastMessage = document.querySelector('.toast-message');
  
  // Stats elements
  const correctCountDisplay = document.getElementById('correct-count');
  const incorrectCountDisplay = document.getElementById('incorrect-count');
  const skippedCountDisplay = document.getElementById('skipped-count');
  const remainingCountDisplay = document.getElementById('remaining-count');

  // Audio
  const correctSound = document.getElementById('correctSound');
  const incorrectSound = document.getElementById('incorrectSound');
  const skipSound = document.getElementById('skipSound');
  const gameOverSound = document.getElementById('gameOverSound');
  const clickSound = document.getElementById('clickSound');

  // Variables de estado
  const alphabet = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  let questions = [];
  let currentQuestionIndex = 0;
  let correctAnswers = 0;
  let skippedAnswers = 0;
  let incorrectAnswersCount = 0;
  let incorrectAnswersList = [];
  let timerInterval;
  let errorCount = 0;
  let gameStarted = false;
  let letterElements = {};
  let incompleteAttempts = 2;
  let partialAnswers = {};

  // ================== FUNCIONES PRINCIPALES ==================

  // Obtener dificultad de sessionStorage
  function getSelectedDifficulty() {
    const storedDifficulty = sessionStorage.getItem('selectedDifficulty');
    if (storedDifficulty) {
      selectedDifficulty = storedDifficulty;
      switch(selectedDifficulty) {
        case 'facil':   timeLimit = 300; break;
        case 'normal':  timeLimit = 240; break;
        case 'dificil': timeLimit = 200; break;
        default:        timeLimit = 300;
      }
    }
    remainingTime = timeLimit;
  }

  // Inicializar la UI
  function initUI() {
    // Botón de ayuda
    updateHelpButtonText();
    helpBtn.addEventListener('click', function() {
      showHelp();
    });
    
    // Botón submit
    submitBtn.addEventListener('click', function() {
      if (answerInput.value.trim()) {
        handleAnswer();
      }
    });

    // Botón skip
    skipBtn.addEventListener('click', function() {
      skipQuestion();
    });

    // Form submit
    answerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (answerInput.value.trim()) {
        handleAnswer();
      } else {
        skipQuestion();
      }
    });

    // Botón de sonido
    soundToggle.addEventListener('click', function() {
      toggleSound();
    });

    // Listeners de modales
    document.getElementById('victory-stats-btn').addEventListener('click', function() {
      switchToStatsModal('victory-modal');
    });
    document.getElementById('timeout-stats-btn').addEventListener('click', function() {
      switchToStatsModal('timeout-modal');
    });
    document.getElementById('defeat-stats-btn').addEventListener('click', function() {
      switchToStatsModal('defeat-modal');
    });

    // Stats modal close
    document.getElementById('close-stats-btn').addEventListener('click', function() {
      hideStatsModal();
    });

    // Stats modal nav buttons
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
  }

  // Actualizar texto del botón de ayuda
  function updateHelpButtonText() {
    document.querySelector('.help-count').textContent = `(${helpCount})`;
  }

  // Mostrar ayuda
  function showHelp() {
    if (helpCount > 0 && gameStarted) {
      const currentQ = questions[currentQuestionIndex];
      const currentLetter = currentQ.letter;
      if (!letterHints[currentLetter]) {
        helpCount--;
        updateHelpButtonText();
        if (helpCount === 0) {
          helpBtn.disabled = true;
          helpBtn.style.opacity = '0.6';
        }
      }
      const firstThree = currentQ.answer.substring(0,3).toUpperCase();
      letterHints[currentLetter] = firstThree;
      displayHintElement(currentLetter, firstThree);
      playSound(clickSound);
    } else if (helpCount <= 0) {
      showGameMessage('No tienes más ayudas disponibles', 'warning');
    }
  }

  // Crear elemento de pista
  function displayHintElement(letter, hintText) {
    let hintElement = document.querySelector(`.hint-element[data-letter="${letter}"]`);
    if (!hintElement) {
      hintElement = document.createElement('div');
      hintElement.className = 'hint-element';
      hintElement.dataset.letter = letter;
      document.body.appendChild(hintElement);
    }
    hintElement.innerHTML = `<span class="hint-text">${hintText}...</span>`;
    const letterElem = letterElements[letter];
    if (letterElem) {
      const rect = letterElem.getBoundingClientRect();
      hintElement.style.left = `${rect.left + window.scrollX + rect.width/2 - hintElement.offsetWidth/2}px`;
      hintElement.style.top = `${rect.top + window.scrollY - 40}px`;
      hintElement.style.display = 'block';
    }
  }

  // Ocultar todas las pistas
  function hideAllHints() {
    const hints = document.querySelectorAll('.hint-element');
    hints.forEach(el => { el.style.display = 'none'; });
  }

  // Normalizar texto
  function normalizeText(text) {
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Similaridad de strings
  function stringSimilarity(s1, s2) {
    s1 = normalizeText(s1);
    s2 = normalizeText(s2);
    if (s1 === s2) return 1;
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength <= 4) {
      let diff = 0;
      for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
        if (s1[i] !== s2[i]) diff++;
      }
      diff += Math.abs(s1.length - s2.length);
      return diff <= 1 ? 0.9 : 0;
    }
    let diff = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] !== s2[i]) diff++;
    }
    diff += Math.abs(s1.length - s2.length);
    return 1 - (diff / maxLength);
  }

  // Respuesta parcial
  function isPartialAnswer(userAnswer, correctAnswer) {
    userAnswer = normalizeText(userAnswer);
    correctAnswer = normalizeText(correctAnswer);
    if (correctAnswer.includes(' ')) {
      const parts = correctAnswer.split(' ');
      for (const part of parts) {
        if (stringSimilarity(userAnswer, part) > 0.75) return true;
      }
    }
    if (correctAnswer.includes(userAnswer) && userAnswer.length >= 3) return true;
    return false;
  }

  // Crear rosco
  function createRosco() {
    const questionCard = document.querySelector('.question-card');
    roscoContainer.innerHTML = '';
    if (questionCard) {
      roscoContainer.appendChild(questionCard);
    }
    
    const totalLetters = alphabet.length;
    const radius = 260;
    const centerX = 300;
    const centerY = 300;

    alphabet.forEach((letter, index) => {
      const angle = (2 * Math.PI * index / totalLetters) - (Math.PI/2);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const letterElem = document.createElement('div');
      letterElem.className = 'rosco-letter';
      letterElem.id = `letter-${letter}`;
      letterElem.textContent = letter;
      letterElem.dataset.letter = letter;
      letterElem.dataset.index = index;
      letterElem.dataset.status = 'pending';
      
      letterElem.style.left = `${x - 27.5}px`;
      letterElem.style.top = `${y - 27.5}px`;
      
      // Animación de entrada
      letterElem.style.opacity = '0';
      letterElem.style.transform = 'scale(0)';
      roscoContainer.appendChild(letterElem);
      
      letterElements[letter] = letterElem;
      setTimeout(() => {
        letterElem.style.opacity = '1';
        letterElem.style.transform = 'scale(1)';
        letterElem.style.transition = `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.03}s`;
      }, 30);
    });

    updateStatsDisplay();
  }

  // Fetch questions
  async function fetchQuestions() {
    try {
      // Ajusta la ruta de tu JSON
      const response = await fetch('data/questions.json');
      const data = await response.json();
      questions = [];
      
      alphabet.forEach(letter => {
        const letterData = data.find(item => item.letra === letter);
        if (letterData && letterData.preguntas && letterData.preguntas.length > 0) {
          const randomIndex = Math.floor(Math.random() * letterData.preguntas.length);
          const questionItem = letterData.preguntas[randomIndex];
          questions.push({
            letter: letter,
            question: `Comienza con ${letter}:`,
            definition: questionItem.pregunta,
            answer: questionItem.respuesta.toLowerCase().trim()
          });
        } else {
          questions.push({
            letter: letter,
            question: `Comienza con ${letter}:`,
            definition: `No hay preguntas disponibles para la letra ${letter}`,
            answer: 'no disponible'
          });
        }
      });
      
      remainingCountDisplay.textContent = questions.length;
      return true;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return false;
    }
  }

  // Mostrar la pregunta actual
  function displayQuestion(index) {
    if (index >= questions.length) {
      index = index % questions.length;
    }
    const q = questions[index];
    const currentLetter = q.letter;
    
    currentLetterDisplay.textContent = currentLetter;
    currentLetterDisplay.setAttribute('data-letter', currentLetter);
    currentQuestionElem.textContent = q.question;
    currentDefinitionElem.textContent = q.definition;
    
    Object.values(letterElements).forEach(elem => {
      elem.classList.remove('current');
    });
    
    const currentLetterElem = letterElements[currentLetter];
    if (currentLetterElem) {
      if (currentLetterElem.dataset.status === 'skipped') {
        currentLetterElem.classList.remove('skipped');
        currentLetterElem.dataset.status = 'pending';
        skippedAnswers--;
        skippedCountDisplay.textContent = skippedAnswers;
      }
      currentLetterElem.classList.add('current');
      if (letterHints[currentLetter]) {
        displayHintElement(currentLetter, letterHints[currentLetter]);
      } else {
        hideAllHints();
      }
    }
    
    answerInput.value = '';
    answerInput.focus();
    updateStatsDisplay();
  }

  // Manejar respuesta
  function handleAnswer() {
    if (!gameStarted || currentQuestionIndex >= questions.length) return;
    const userAnswer = answerInput.value.toLowerCase().trim();
    const currentQ = questions[currentQuestionIndex];
    const currentLetter = currentQ.letter;
    const correctAnswer = currentQ.answer.toLowerCase().trim();
    const letterElem = letterElements[currentLetter];

    if (userAnswer === '') {
      skipQuestion();
      return;
    }
    
    const similarity = stringSimilarity(userAnswer, correctAnswer);

    if (similarity > 0.75 || normalizeText(userAnswer) === normalizeText(correctAnswer)) {
      // Correcto
      letterElem.classList.add('correct');
      letterElem.dataset.status = 'correct';
      correctAnswers++;
      playSound(correctSound);
      correctCountDisplay.textContent = correctAnswers;
      removeHintForLetter(currentLetter);
      moveToNextQuestion();
    } else if (isPartialAnswer(userAnswer, correctAnswer) && incompleteAttempts > 0) {
      if (!partialAnswers[currentLetter]) {
        incompleteAttempts--;
        partialAnswers[currentLetter] = userAnswer;
        showGameMessage("Respuesta incompleta, intente nuevamente", 'warning');
        answerInput.value = '';
        answerInput.focus();
      } else {
        showGameMessage('Ya has usado una respuesta parcial para esta letra', 'warning');
      }
    } else {
      // Incorrecto
      letterElem.classList.add('incorrect');
      letterElem.dataset.status = 'incorrect';
      incorrectAnswersList.push({
        letter: currentLetter,
        correctAnswer: correctAnswer,
        userAnswer: userAnswer
      });
      incorrectAnswersCount++;
      playSound(incorrectSound);
      incorrectCountDisplay.textContent = incorrectAnswersCount;
      removeHintForLetter(currentLetter);
      addError();
      moveToNextQuestion();
    }
    
    answerInput.value = '';
    updateStatsDisplay();
  }

  // Quitar pista de una letra
  function removeHintForLetter(letter) {
    const hintElement = document.querySelector(`.hint-element[data-letter="${letter}"]`);
    if (hintElement) {
      hintElement.remove();
    }
    delete letterHints[letter];
  }

  // Saltar pregunta
  function skipQuestion() {
    if (!gameStarted || currentQuestionIndex >= questions.length) return;
    const currentLetter = questions[currentQuestionIndex].letter;
    const letterElem = letterElements[currentLetter];
    letterElem.classList.add('skipped');
    letterElem.dataset.status = 'skipped';
    skippedAnswers++;
    playSound(skipSound);
    skippedCountDisplay.textContent = skippedAnswers;
    moveToNextQuestion();
    updateStatsDisplay();
  }

  // Ir a la siguiente pregunta
  function moveToNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
      let foundPending = false;
      for (let i = 0; i < questions.length; i++) {
        const letter = questions[i].letter;
        const letterElem = letterElements[letter];
        if (letterElem.dataset.status === 'pending' || letterElem.dataset.status === 'skipped') {
          currentQuestionIndex = i;
          foundPending = true;
          break;
        }
      }
      if (!foundPending) {
        endGame();
        return;
      }
    }
    displayQuestion(currentQuestionIndex);
    updateStatsDisplay();
  }

  // Iniciar timer
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

  // Actualizar display del timer
  function updateTimerDisplay() {
    timerElem.textContent = `${remainingTime}`;
    const timePercentage = (remainingTime / timeLimit) * 100;
    timerElem.classList.remove('low-time');
    document.querySelector('.mini-timer').classList.remove('low-time','medium-time');
    if (timePercentage <= 15) {
      timerElem.classList.add('low-time');
      document.querySelector('.mini-timer').classList.add('low-time');
    } else if (timePercentage <= 40) {
      document.querySelector('.mini-timer').classList.add('medium-time');
    }
  }

  // Añadir error
  function addError() {
    errorCount++;
    if (errorCount >= 3) {
      endGame();
    }
  }

  // Terminar juego
  function endGame() {
    clearInterval(timerInterval);
    gameStarted = false;

    const incorrectItems = incorrectAnswersList.map(item => {
      const q = questions.find(q => q.letter === item.letter);
      return {
        letter: item.letter,
        userAnswer: item.userAnswer || "Sin respuesta",
        correctAnswer: item.correctAnswer,
        question: q ? q.definition : ""
      };
    });

    let modalType;
    let victory = false;
    if (errorCount >= 3) {
      modalType = 'defeat';
      victory = false;
    } else if (remainingTime <= 0) {
      modalType = 'timeout';
      victory = false;
    } else {
      modalType = 'victory';
      victory = true;
    }

    document.getElementById('stats-correct').textContent = correctAnswers;
    document.getElementById('stats-incorrect').textContent = incorrectAnswersCount;
    document.getElementById('stats-skipped').textContent = skippedAnswers;

    generateIncorrectAnswersList(incorrectItems);

    const modal = document.getElementById(`${modalType}-modal`);
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    playSound(gameOverSound);

    // (Opcional) guardar resultados en localStorage o perfil
    try {
      const timeBonus = remainingTime > 0 ? Math.floor(remainingTime / 10) : 0;
      const scoreBase = correctAnswers * 10;
      const difficultyMultiplier = selectedDifficulty === 'dificil' ? 2.0 :
                                   selectedDifficulty === 'normal' ? 1.5 : 1.0;
      const totalScore = Math.floor((scoreBase + timeBonus) * difficultyMultiplier);

      const gameData = {
        username: localStorage.getItem('username') || 'Jugador',
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

      localStorage.setItem('lastGameStats', JSON.stringify({
        score: totalScore,
        correct: correctAnswers,
        wrong: incorrectAnswersCount,
        skipped: skippedAnswers,
        difficulty: selectedDifficulty,
        victory: victory
      }));
      localStorage.setItem('gameJustCompleted', 'true');

      // Si tienes funciones en utils.js o profile.js, podrías llamar:
      // Utils.saveGameResult(gameData) o processGameCompletion(gameData);

      // Redirigir al perfil tras 3s
      setTimeout(() => {
        window.location.href = 'profile.html?fromGame=true';
      }, 3000);

    } catch (error) {
      console.error('Error guardando resultados del juego:', error);
    }
  }

  // Generar lista de respuestas incorrectas
  function generateIncorrectAnswersList(incorrectItems) {
    const container = document.getElementById('incorrect-answers-list');
    container.innerHTML = '';
    if (incorrectItems.length === 0) {
      container.innerHTML = `
        <div class="no-errors-message">
          <i class="fas fa-check-circle"></i>
          ¡Felicidades! No has cometido ningún error.
        </div>
      `;
      return;
    }
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

  // Actualizar stats
  function updateStatsDisplay() {
    correctCountDisplay.textContent = correctAnswers;
    incorrectCountDisplay.textContent = incorrectAnswersCount;
    skippedCountDisplay.textContent = skippedAnswers;
    let remaining = 0;
    for (const letter in letterElements) {
      const status = letterElements[letter].dataset.status;
      if (status === 'pending' || status === 'skipped') {
        remaining++;
      }
    }
    remainingCountDisplay.textContent = remaining;
  }

  // Mostrar toast
  function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = 'toast';
    toast.classList.add(`toast-${type}`);
    
    let toastIcon = toast.querySelector('.toast-icon i');
    if (!toast.querySelector('.toast-icon')) {
      const iconContainer = document.createElement('div');
      iconContainer.className = 'toast-icon';
      toastIcon = document.createElement('i');
      iconContainer.appendChild(toastIcon);
      toast.insertBefore(iconContainer, toastMessage);
    }
    
    if (type === 'success') {
      toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
      toastIcon.className = 'fas fa-times-circle';
    } else if (type === 'warning') {
      toastIcon.className = 'fas fa-exclamation-triangle';
    } else if (type === 'info') {
      toastIcon.className = 'fas fa-info-circle';
    }
    
    toast.style.display = 'flex';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3000);
  }

  // Reproducir sonido
  function playSound(sound) {
    if (soundEnabled && sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.log('Error playing sound:', e));
    }
  }

  // Alternar sonido
  function toggleSound() {
    soundEnabled = !soundEnabled;
    const icon = soundToggle.querySelector('i');
    if (!soundEnabled) {
      icon.className = 'fas fa-volume-mute';
      soundToggle.classList.add('muted');
    } else {
      icon.className = 'fas fa-volume-up';
      soundToggle.classList.remove('muted');
      playSound(clickSound);
    }
  }

  // Reiniciar juego
  function resetGame() {
    currentQuestionIndex = 0;
    correctAnswers = 0;
    incorrectAnswersCount = 0;
    incorrectAnswersList = [];
    skippedAnswers = 0;
    errorCount = 0;
    helpCount = 2;
    letterHints = {};
    hideAllHints();
    helpBtn.disabled = false;
    helpBtn.style.opacity = '1';
    updateHelpButtonText();
    incompleteAttempts = 2;
    partialAnswers = {};
    hideModals();

    initGame();
  }

  // Cambiar a modal de estadísticas
  function switchToStatsModal(sourceModalId) {
    const sourceModal = document.getElementById(sourceModalId);
    const statsModal = document.getElementById('stats-modal');
    if (!statsModal) return;
    statsModal.style.display = 'none';
    statsModal.classList.remove('show');
    if (sourceModal) {
      sourceModal.classList.remove('show');
      setTimeout(() => {
        sourceModal.style.display = 'none';
        statsModal.style.display = 'flex';
        void statsModal.offsetWidth;
        requestAnimationFrame(() => {
          statsModal.classList.add('show');
        });
      }, 400);
    } else {
      statsModal.style.display = 'flex';
      void statsModal.offsetWidth;
      requestAnimationFrame(() => { statsModal.classList.add('show'); });
    }
  }

  // Ocultar stats modal
  function hideStatsModal() {
    const statsModal = document.getElementById('stats-modal');
    if (statsModal) {
      statsModal.classList.remove('show');
      setTimeout(() => { statsModal.style.display = 'none'; }, 500);
    }
  }

  // Ocultar todos los modales
  function hideModals() {
    const modals = document.querySelectorAll('.result-modal');
    modals.forEach(modal => {
      modal.classList.remove('show');
      setTimeout(() => { modal.style.display = 'none'; }, 300);
    });
  }

  // Inicializar juego
  async function initGame() {
    loadingOverlay.style.display = 'flex';
    getSelectedDifficulty();
    createRosco();
    const questionsLoaded = await fetchQuestions();
    if (!questionsLoaded) {
      currentDefinitionElem.textContent = 'Error al cargar las preguntas. Recarga la página.';
      loadingOverlay.style.display = 'none';
      return;
    }
    displayQuestion(0);
    startTimer();
    loadingOverlay.style.display = 'none';
    answerInput.focus();
    gameStarted = true;
  }

  // Llamar initUI e initGame
  initUI();
  initGame();
});

/**
 * Mostrar mensaje sutil en la parte superior (usado en partial answers).
 */
function showGameMessage(message, type = 'info') {
  let gameMessage = document.querySelector('.game-message');
  if (!gameMessage) {
    gameMessage = document.createElement('div');
    gameMessage.className = 'game-message';
    document.body.appendChild(gameMessage);
  }
  gameMessage.className = 'game-message';
  if (type) {
    gameMessage.classList.add(`toast-${type}`);
  }
  gameMessage.textContent = message;
  gameMessage.style.display = 'block';
  setTimeout(() => {
    gameMessage.style.display = 'none';
  }, 3500);
}
