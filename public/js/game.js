// Variables globales
let username = '';
let selectedDifficulty = 'facil';
let timeLimit = 300; // Valor predeterminado
let questions = [];
let currentLetterIndex = 0;
let errors = 0;
let correctAnswers = 0;
let timer;
let remainingTime = 0;
let currentLang = 'es';
let mistakes = [];
let helpUsed = 0;

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
  console.log('Página de juego iniciada');
  
  // Recuperar datos de sessionStorage
  loadGameData();
  
  // Inicializar el juego
  initializeGame();
  
  // Configurar manejadores de eventos
  setupGameEventHandlers();
});

// Cargar datos guardados
function loadGameData() {
  // Recuperar nombre de usuario
  username = sessionStorage.getItem('username');
  if (!username) {
    // Si no hay nombre de usuario, redirigir a la página de inicio
    window.location.href = 'index.html';
    return;
  }
  
  // Mostrar nombre de usuario
  const playerNameDisplay = document.getElementById('player-name-display');
  if (playerNameDisplay) {
    playerNameDisplay.textContent = username;
  }
  
  // Recuperar dificultad seleccionada
  selectedDifficulty = sessionStorage.getItem('selectedDifficulty') || 'facil';
  
  // Configurar límite de tiempo según dificultad
  switch (selectedDifficulty) {
    case 'facil':
      timeLimit = 300;
      break;
    case 'medio':
      timeLimit = 240;
      break;
    case 'dificil':
      timeLimit = 200;
      break;
    default:
      timeLimit = 300;
  }
  
  remainingTime = timeLimit;
  
  // Recuperar idioma
  currentLang = localStorage.getItem('lang') || 'es';
  
  console.log(`Juego iniciado: Usuario: ${username}, Dificultad: ${selectedDifficulty}, Tiempo: ${timeLimit}s`);
}

// Inicializar juego
function initializeGame() {
  // Cargar preguntas - el resto de la inicialización se manejará después de cargar las preguntas
  loadQuestions();
  
  // Iniciar temporizador
  startTimer();
  
  // Mostrar mensaje de inicio
  showGameMessage('¡Empieza el juego! Responde las preguntas para cada letra.');
  
  // Configurar el evento de redimensionamiento para ajustar el rosco
  window.addEventListener('resize', adjustRoscoSize);
}

// Cargar preguntas de questions.json
function loadQuestions() {
  console.log('Cargando preguntas del archivo questions.json...');
  
  // Cargar preguntas desde el archivo JSON
  fetch('data/questions.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('No se pudo cargar el archivo questions.json');
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.questions) {
        throw new Error('Formato de questions.json inválido');
      }
      
      console.log('Datos del JSON cargados correctamente');
      
      // Organizar preguntas por letra
      const questionsByLetter = {};
      
      data.questions.forEach(question => {
        const letter = question.letter.toUpperCase();
        if (!questionsByLetter[letter]) {
          questionsByLetter[letter] = [];
        }
        questionsByLetter[letter].push(question);
      });
      
      // Seleccionar una pregunta aleatoria para cada letra
      questions = [];
      for (const letter in questionsByLetter) {
        if (questionsByLetter[letter].length > 0) {
          // Seleccionar una pregunta aleatoria para esta letra
          const randomIndex = Math.floor(Math.random() * questionsByLetter[letter].length);
          const selectedQuestion = questionsByLetter[letter][randomIndex];
          
          questions.push({
            letter: letter,
            category: selectedQuestion.category || selectedQuestion.definition,
            answer: Array.isArray(selectedQuestion.answer) 
              ? selectedQuestion.answer 
              : [selectedQuestion.answer],
            status: 'pending'
          });
        }
      }
      
      // Ordenar alfabéticamente
      questions.sort((a, b) => a.letter.localeCompare(b.letter));
      
      console.log(`${questions.length} preguntas cargadas correctamente`);
      
      // Dibujar el rosco con las preguntas cargadas
      drawRosco();
    })
    .catch(error => {
      console.error('Error cargando questions.json:', error);
      alert('Error al cargar las preguntas. Por favor, recarga la página o contacta con el administrador.');
    });
}

// Dibujar el rosco con las letras ordenadas alfabéticamente de la A a la Z
function drawRosco() {
  const roscoContainer = document.getElementById('rosco');
  if (!roscoContainer) return;
  
  roscoContainer.innerHTML = '';
  
  // Calcular el tamaño óptimo del rosco basado en el tamaño de la ventana
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const minDimension = Math.min(viewportHeight * 0.8, viewportWidth * 0.8, 700); // Limitamos el tamaño máximo a 700px
  
  // Actualizar las variables CSS para el tamaño del rosco
  document.documentElement.style.setProperty('--rosco-size', `${minDimension}px`);
  
  // Crear contenedor para la pregunta en el centro
  const questionContainer = document.createElement('div');
  questionContainer.className = 'question-container';
  questionContainer.id = 'rosco-question';
  roscoContainer.appendChild(questionContainer);
  
  // Calcular radio y centro
  const totalLetters = questions.length;
  let radius = minDimension * 0.42; // 42% del tamaño del rosco
  let centerX = minDimension / 2;
  let centerY = minDimension / 2;
  
  // Ordenar las letras para que sigan el orden alfabético
  const orderedQuestions = [...questions].sort((a, b) => {
    return a.letter.localeCompare(b.letter);
  });
  
  // Crear las letras en círculo en orden alfabético
  orderedQuestions.forEach((question, index) => {
    // Calcular posición en círculo con un ajuste para distribuir uniformemente
    // Empezando desde arriba y siguiendo el sentido de las agujas del reloj
    const angle = (index * 2 * Math.PI / totalLetters) - Math.PI/2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Crear elemento de letra
    const letterElement = document.createElement('div');
    letterElement.className = 'rosco-letter';
    letterElement.id = `letter-${question.letter}`;
    letterElement.textContent = question.letter.toUpperCase();
    
    // Posicionar la letra con transform para mejor rendimiento
    letterElement.style.position = 'absolute';
    letterElement.style.left = `${x}px`;
    letterElement.style.top = `${y}px`;
    letterElement.style.transform = 'translate(-50%, -50%)';
    
    // Añadir estado actual de la letra
    const originalIndex = questions.findIndex(q => q.letter === question.letter);
    if (originalIndex === currentLetterIndex) {
      letterElement.classList.add('current');
    } else if (question.status !== 'pending') {
      letterElement.classList.add(question.status);
    }
    
    roscoContainer.appendChild(letterElement);
  });
  
  // Actualizar información de la letra actual
  updateLetterInfo();
  
  // Ajustar tamaño del contenedor de pregunta según el ancho de la pantalla
  adjustQuestionContainer();
}

// Ajustar el contenedor de la pregunta según el tamaño del rosco
function adjustQuestionContainer() {
  const questionContainer = document.getElementById('rosco-question');
  if (!questionContainer) return;
  
  const roscoSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rosco-size'));
  
  // Ajustar tamaño según el tamaño del rosco
  if (roscoSize < 450) {
    document.documentElement.style.setProperty('--letter-size', '32px');
    document.documentElement.style.setProperty('--letter-current-size', '44px');
  } else if (roscoSize < 600) {
    document.documentElement.style.setProperty('--letter-size', '38px');
    document.documentElement.style.setProperty('--letter-current-size', '52px');
  } else {
    document.documentElement.style.setProperty('--letter-size', '42px');
    document.documentElement.style.setProperty('--letter-current-size', '58px');
  }
}

// Actualizar información de la letra actual
function updateLetterInfo() {
  if (currentLetterIndex >= questions.length) return;
  
  const currentQuestion = questions[currentLetterIndex];
  
  // Actualizar la pregunta dentro del rosco con animación solo del contenido
  const questionContainer = document.getElementById('rosco-question');
  if (questionContainer) {
    // Solo cambiar la opacidad, no la posición
    questionContainer.style.opacity = '0';
    
    setTimeout(() => {
      // Actualizar contenido
      questionContainer.innerHTML = `
        <div class="question-letter">${currentQuestion.letter.toUpperCase()}</div>
        <p class="question-text">${currentQuestion.category}</p>
      `;
      
      // Hacer aparecer de nuevo
      questionContainer.style.opacity = '1';
    }, 200);
  }
  
  // Mostrar mensaje informativo debajo del rosco
  showGameMessage(`Comienza con ${currentQuestion.letter.toUpperCase()}`, 'info');
  
  // Establecer foco en campo de respuesta
  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.value = '';
    answerInput.focus();
  }
  
  // Actualizar clases de letras
  updateLetterClasses();
}

// Actualizar clases de las letras según su estado
function updateLetterClasses() {
  questions.forEach((question, index) => {
    const letterElement = document.getElementById(`letter-${question.letter}`);
    if (!letterElement) return;
    
    // Quitar clases existentes
    letterElement.classList.remove('current', 'correct', 'incorrect', 'skipped');
    
    // Añadir clase según estado
    if (index === currentLetterIndex) {
      letterElement.classList.add('current');
    } else if (question.status === 'correct') {
      letterElement.classList.add('correct');
    } else if (question.status === 'incorrect') {
      letterElement.classList.add('incorrect');
    } else if (question.status === 'skipped') {
      letterElement.classList.add('skipped');
    }
  });
}

// Iniciar temporizador
function startTimer() {
  const timerDisplay = document.getElementById('timer-display');
  const timerProgress = document.getElementById('timer-progress');
  
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(remainingTime);
  }
  
  if (timerProgress) {
    timerProgress.style.width = '100%';
  }
  
  timer = setInterval(() => {
    remainingTime--;
    
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(remainingTime);
    }
    
    if (timerProgress) {
      const percentage = (remainingTime / timeLimit) * 100;
      timerProgress.style.width = `${percentage}%`;
      
      // Cambiar color según tiempo restante
      if (percentage < 20) {
        timerProgress.style.background = 'linear-gradient(to right, var(--incorrect), #C62828)';
      } else if (percentage < 50) {
        timerProgress.style.background = 'linear-gradient(to right, var(--warning), #FFA000)';
      }
    }
    
    if (remainingTime <= 0) {
      clearInterval(timer);
      gameOver(false);
    }
  }, 1000);
}

// Formatear tiempo para mostrar minutos y segundos
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Configurar manejadores de eventos
function setupGameEventHandlers() {
  // Evento para el botón de verificar respuesta
  const checkBtn = document.getElementById('check-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', checkAnswer);
  }
  
  // Evento para el botón de pasar
  const pasalaBtn = document.getElementById('pasala-btn');
  if (pasalaBtn) {
    pasalaBtn.addEventListener('click', skipLetter);
  }
  
  // Evento para el botón de ayuda
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', showHelp);
  }
  
  // Evento para el campo de respuesta al presionar Enter
  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        checkAnswer();
      }
    });
  }
  
  // Eventos para botones de modales
  const victoryCloseBtn = document.getElementById('victory-close-btn');
  const defeatCloseBtn = document.getElementById('defeat-close-btn');
  const statsCloseBtn = document.getElementById('stats-close-btn');
  
  if (victoryCloseBtn) victoryCloseBtn.addEventListener('click', showStats);
  if (defeatCloseBtn) defeatCloseBtn.addEventListener('click', showStats);
  if (statsCloseBtn) statsCloseBtn.addEventListener('click', returnToHome);
}

// Comprobar respuesta
function checkAnswer() {
  const answerInput = document.getElementById('answer-input');
  if (!answerInput || currentLetterIndex >= questions.length) return;
  
  const userAnswer = answerInput.value.trim().toLowerCase();
  const currentQuestion = questions[currentLetterIndex];
  
  if (userAnswer === '') {
    showGameMessage('Por favor, introduce una respuesta.', 'error');
    return;
  }
  
  // Verificar respuesta
  if (currentQuestion.answer.includes(userAnswer)) {
    // Respuesta correcta
    currentQuestion.status = 'correct';
    correctAnswers++;
    showGameMessage('¡Correcto!', 'success');
  } else {
    // Respuesta incorrecta
    currentQuestion.status = 'incorrect';
    errors++;
    
    // Guardar el error para estadísticas
    mistakes.push({
      letter: currentQuestion.letter,
      question: currentQuestion.category,
      userAnswer: userAnswer,
      correctAnswer: currentQuestion.answer[0]
    });
    
    showGameMessage(`Incorrecto. La respuesta correcta era: ${currentQuestion.answer[0]}`, 'error');
    
    // Actualizar contador de errores
    updateErrorCounter();
    
    // Verificar si se alcanzó el límite de errores
    if (errors >= 3) {
      gameOver(false);
      return;
    }
  }
  
  // Pasar a la siguiente letra
  moveToNextLetter();
}

// Actualizar contador de errores
function updateErrorCounter() {
  for (let i = 1; i <= 3; i++) {
    const errorDot = document.getElementById(`error-${i}`);
    if (errorDot) {
      if (i <= errors) {
        errorDot.classList.add('active');
      } else {
        errorDot.classList.remove('active');
      }
    }
  }
}

// Saltar letra actual
function skipLetter() {
  const currentQuestion = questions[currentLetterIndex];
  currentQuestion.status = 'skipped';
  
  showGameMessage('Letra pasada. Volveremos a ella más tarde.', 'warning');
  moveToNextLetter();
}

// Mostrar ayuda para la letra actual
function showHelp() {
  if (helpUsed >= 2) {
    showGameMessage('Ya has usado todas tus ayudas disponibles.', 'error');
    return;
  }
  
  const currentQuestion = questions[currentLetterIndex];
  const answer = currentQuestion.answer[0];
  const hint = `Pista: La respuesta empieza por ${answer[0]} y tiene ${answer.length} letras.`;
  
  showGameMessage(hint, 'help');
  helpUsed++;
}

// Pasar a la siguiente letra pendiente
function moveToNextLetter() {
  let nextFound = false;
  let startIndex = currentLetterIndex;
  
  // Buscar la siguiente letra pendiente
  for (let i = 1; i <= questions.length; i++) {
    const nextIndex = (startIndex + i) % questions.length;
    if (questions[nextIndex].status === 'pending' || 
        questions[nextIndex].status === 'skipped') {
      currentLetterIndex = nextIndex;
      nextFound = true;
      break;
    }
  }
  
  // Si no hay más letras pendientes, finalizar el juego
  if (!nextFound) {
    gameOver(true);
    return;
  }
  
  // Actualizar información de la letra actual
  updateLetterInfo();
}

// Mostrar mensaje en el juego
function showGameMessage(message, type = 'info') {
  const messageElement = document.getElementById('game-message');
  if (!messageElement) return;
  
  // Establecer clase según tipo de mensaje
  messageElement.className = 'game-message';
  messageElement.classList.add(type);
  
  // Establecer texto
  messageElement.textContent = message;
  
  // Animar la entrada
  messageElement.style.opacity = '1';
  messageElement.style.transform = 'translateY(0)';
}

// Finalizar juego
function gameOver(isVictory) {
  // Detener temporizador
  clearInterval(timer);
  
  // Mostrar modal correspondiente
  if (isVictory) {
    showVictoryModal();
  } else {
    showDefeatModal();
  }
}

// Mostrar modal de victoria
function showVictoryModal() {
  const victoryModal = document.getElementById('victory-modal');
  if (!victoryModal) return;
  
  // Personalizar mensaje según número de errores y preguntas respondidas correctamente
  const modalBody = victoryModal.querySelector('.modal-body');
  if (modalBody) {
    const totalQuestions = questions.length;
    const modalP = modalBody.querySelector('p');
    
    if (modalP) {
      if (errors === 0) {
        modalP.textContent = `¡Perfecto! Has completado las ${totalQuestions} preguntas del rosco sin ningún error. ¡Increíble partida!`;
      } else if (errors === 1) {
        modalP.textContent = `¡Excelente! Has completado las ${totalQuestions} preguntas del rosco con solo un error.`;
      } else {
        modalP.textContent = `¡Muy bien! Has completado las ${totalQuestions} preguntas del rosco con ${errors} errores.`;
      }
    }
  }
  
  // Mostrar el modal (adaptado a los nuevos estilos)
  victoryModal.style.display = 'flex';
}

// Mostrar modal de derrota
function showDefeatModal() {
  const defeatModal = document.getElementById('defeat-modal');
  if (!defeatModal) return;
  
  // Personalizar mensaje basado en la razón real de la derrota
  const modalBody = defeatModal.querySelector('.modal-body');
  if (modalBody) {
    const pendingQuestions = questions.filter(q => q.status === 'pending' || q.status === 'skipped').length;
    const modalP = modalBody.querySelector('p');
    
    if (modalP) {
      if (remainingTime <= 0) {
        modalP.textContent = `Se acabó el tiempo. Respondiste ${questions.length - pendingQuestions} de ${questions.length} preguntas. ¡Mejor suerte la próxima vez!`;
      } else {
        modalP.textContent = `Has alcanzado el máximo de ${errors} errores permitidos. Respondiste ${questions.length - pendingQuestions} de ${questions.length} preguntas.`;
      }
    }
  }
  
  // Mostrar el modal (adaptado a los nuevos estilos)
  defeatModal.style.display = 'flex';
}

// Mostrar estadísticas del juego
function showStats() {
  // Ocultar modales de victoria/derrota
  const victoryModal = document.getElementById('victory-modal');
  const defeatModal = document.getElementById('defeat-modal');
  
  if (victoryModal) victoryModal.style.display = 'none';
  if (defeatModal) defeatModal.style.display = 'none';
  
  // Mostrar modal de estadísticas
  const statsModal = document.getElementById('stats-modal');
  if (!statsModal) return;
  
  // Actualizar estadísticas
  const answered = questions.filter(q => q.status !== 'pending').length;
  
  document.getElementById('stats-answered').textContent = `${answered}/${questions.length}`;
  document.getElementById('stats-correct').textContent = correctAnswers;
  document.getElementById('stats-incorrect').textContent = errors;
  document.getElementById('stats-time').textContent = `${timeLimit - remainingTime}s`;
  
  // Mostrar el modal (adaptado a los nuevos estilos)
  statsModal.style.display = 'flex';
}

// Volver a la página de inicio
function returnToHome() {
  window.location.href = 'index.html';
}

// Función para ajustar el tamaño del rosco según el tamaño de la ventana
function adjustRoscoSize() {
  drawRosco(); // Redibujar el rosco con el tamaño actualizado
} 