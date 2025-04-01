// Archivo de script para local.html

// local.js - Funciones para manejar el juego en modo local
document.addEventListener('DOMContentLoaded', function() {
  console.log('local.js cargado');
  
  // Función para inicializar correctamente la aplicación
  function initApp() {
    console.log('Inicializando aplicación...');
    
    // Verificar elementos críticos
    const criticalElements = [
      { id: 'timer-button', name: 'Botón del temporizador' },
      { id: 'timer-bar', name: 'Barra del temporizador' },
      { id: 'timer-display', name: 'Visualización del temporizador' },
      { id: 'question-text', name: 'Texto de la pregunta' },
      { id: 'answers-container', name: 'Contenedor de respuestas' },
      { id: 'written-answer-container', name: 'Contenedor de respuesta escrita' },
      { id: 'written-answer-input', name: 'Campo de respuesta escrita' },
      { id: 'submit-answer-btn', name: 'Botón de enviar respuesta' },
      { id: 'show-options-btn', name: 'Botón de mostrar opciones' },
      { id: 'current-prize', name: 'Visualización de puntos actuales' },
      { id: 'questions-answered', name: 'Preguntas respondidas' },
      { id: 'notification', name: 'Notificación' }
    ];
    
    const missingElements = criticalElements.filter(el => !document.getElementById(el.id));
    
    if (missingElements.length > 0) {
      console.error('Elementos críticos no encontrados:', missingElements.map(el => el.name).join(', '));
      alert('Error: Faltan elementos críticos en la página. Por favor, recarga la página.');
      return false;
    }
    
    // Cargar las preguntas
    loadQuestions();
    
    return true;
  }
  
  // Configurar particles.js si está disponible
  if (window.particlesJS && document.getElementById('particles-js')) {
    try {
      particlesJS('particles-js', {
        "particles": {
          "number": {
            "value": 80,
            "density": {
              "enable": true,
              "value_area": 800
            }
          },
          "color": {
            "value": "#e11d48"
          },
          "shape": {
            "type": "circle",
            "stroke": {
              "width": 0,
              "color": "#000000"
            }
          },
          "opacity": {
            "value": 0.5,
            "random": true,
            "anim": {
              "enable": true,
              "speed": 1,
              "opacity_min": 0.1,
              "sync": false
            }
          },
          "size": {
            "value": 3,
            "random": true,
            "anim": {
              "enable": true,
              "speed": 2,
              "size_min": 0.3,
              "sync": false
            }
          },
          "line_linked": {
            "enable": true,
            "distance": 150,
            "color": "#e11d48",
            "opacity": 0.4,
            "width": 1
          },
          "move": {
            "enable": true,
            "speed": 1,
            "direction": "none",
            "random": true,
            "straight": false,
            "out_mode": "out",
            "bounce": false,
            "attract": {
              "enable": false,
              "rotateX": 600,
              "rotateY": 1200
            }
          }
        },
        "interactivity": {
          "detect_on": "canvas",
          "events": {
            "onhover": {
              "enable": true,
              "mode": "grab"
            },
            "onclick": {
              "enable": true,
              "mode": "push"
            },
            "resize": true
          },
          "modes": {
            "grab": {
              "distance": 140,
              "line_linked": {
                "opacity": 1
              }
            },
            "bubble": {
              "distance": 400,
              "size": 40,
              "duration": 2,
              "opacity": 8,
              "speed": 3
            },
            "repulse": {
              "distance": 200,
              "duration": 0.4
            },
            "push": {
              "particles_nb": 4
            },
            "remove": {
              "particles_nb": 2
            }
          }
        },
        "retina_detect": true
      });
      console.log('particles.js iniciado directamente desde local.js');
    } catch (error) {
      console.error('Error al iniciar particles.js desde local.js:', error);
    }
  } else {
    console.warn('particlesJS no está disponible');
  }
  
  // Elementos DOM
  const difficultySection = document.getElementById('difficulty-section');
  const gameSection = document.getElementById('game-section');
  const playerDisplay = document.getElementById('player-display');
  const difficultyDisplay = document.getElementById('difficulty-display');
  const startGameBtn = document.getElementById('start-game-btn');
  const backBtn = document.getElementById('back-to-name-btn');
  
  // Elementos de instrucciones
  const instructionsSection = document.getElementById('instructions-section');
  const startPlayBtn = document.getElementById('start-play-btn');
  
  // Elementos del juego
  const currentPrize = document.getElementById('current-prize');
  const questionsAnsweredDisplay = document.getElementById('questions-answered');
  const timerBar = document.getElementById('timer-bar');
  const timerDisplay = document.getElementById('timer-display');
  const timerButton = document.getElementById('timer-button');
  const questionText = document.getElementById('question-text');
  const answersContainer = document.getElementById('answers-container');
  const writtenAnswerContainer = document.getElementById('written-answer-container');
  
  // Verificar elementos críticos
  console.log('Elementos críticos del timer:', {
    timerBar: !!timerBar,
    timerDisplay: !!timerDisplay,
    timerButton: !!timerButton
  });
  
  // Configurar evento temporal para el timer para pruebas
  if (timerButton) {
    console.log('Configurando evento temporal para el timer button');
    timerButton.addEventListener('click', function() {
      console.log('Timer button clickeado (evento temporal)');
      showNotification('Timer funcionando correctamente', 'info');
    });
  }
  
  // Botones de dificultad
  const easyBtn = document.getElementById('easy-btn');
  const mediumBtn = document.getElementById('medium-btn');
  const hardBtn = document.getElementById('hard-btn');
  
  console.log('Elementos DOM:', {
    difficultySection: !!difficultySection,
    instructionsSection: !!instructionsSection,
    gameSection: !!gameSection,
    startGameBtn: !!startGameBtn,
    easyBtn: !!easyBtn,
    mediumBtn: !!mediumBtn,
    hardBtn: !!hardBtn
  });
  
  // Obtener el nombre de usuario guardado
  const savedUsername = localStorage.getItem('millonarioUsername');
  if (!savedUsername) {
    // Si no hay nombre guardado, redirigir a la página principal
    window.location.href = "index.html";
    return;
  }
  
  // Mostrar el nombre del jugador
  if (playerDisplay) {
    playerDisplay.textContent = savedUsername;
  }
  
  // Variables del juego
  let selectedDifficulty = 'fácil';
  let questions = [];
  let timerInterval;
  let timeLeft = 300; // 5 minutos por defecto
  let points = 0;
  let questionsAnswered = 0;
  let currentQuestion = null;
  let fiftyFiftyUsed = false;
  let usedQuestionIndices = {}; // Para rastrear las preguntas ya utilizadas

  // Constantes para puntuación
  const POINTS = {
    WRITTEN_ANSWER: 2,        // Respuesta escrita directa
    OPTIONS_ANSWER: 1,        // Respuesta con opciones
    FIFTY_FIFTY_ANSWER: 0.5   // Respuesta con opciones y 50/50
  };
  
  // Tiempos por dificultad (en segundos)
  const difficultyTimes = {
    'fácil': 300, // 5 minutos
    'media': 240, // 4 minutos
    'difícil': 200 // 3:20 minutos
  };
  
  // Iniciar la aplicación
  const appInitialized = initApp();
  if (!appInitialized) {
    console.error('La aplicación no pudo inicializarse correctamente');
    return;
  }
  
  // Evento de botón volver
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      console.log('Botón volver clickeado');
      window.location.href = "index.html";
    });
  }
  
  // Eventos para los botones de dificultad
  if (easyBtn) {
    easyBtn.addEventListener('click', function() {
      console.log('Botón Fácil clickeado');
      selectDifficulty('fácil');
    });
  }
  
  if (mediumBtn) {
    mediumBtn.addEventListener('click', function() {
      console.log('Botón Media clickeado');
      selectDifficulty('media');
    });
  }
  
  if (hardBtn) {
    hardBtn.addEventListener('click', function() {
      console.log('Botón Difícil clickeado');
      selectDifficulty('difícil');
    });
  }
  
  // Evento para mostrar instrucciones
  if (startGameBtn) {
    startGameBtn.addEventListener('click', function() {
      console.log('Botón Comenzar Juego clickeado - Mostrando instrucciones');
      showInstructions();
    });
  }
  
  // Evento para iniciar el juego desde instrucciones
  if (startPlayBtn) {
    startPlayBtn.addEventListener('click', function() {
      console.log('Botón Comenzar Juego desde instrucciones clickeado');
      startGame();
    });
  }
  
  // Evento para el botón 50/50
  document.addEventListener('click', function(e) {
    if (e.target && (e.target.id === 'fifty-fifty-btn' || e.target.closest('#fifty-fifty-btn'))) {
      const fiftyFiftyButton = document.getElementById('fifty-fifty-btn');
      if (fiftyFiftyButton && !fiftyFiftyButton.classList.contains('disabled')) {
        useFiftyFifty();
      }
    }
  });
  
  // Evento para el botón "Ver opciones"
  document.addEventListener('click', function(e) {
    if (e.target && (e.target.id === 'show-options-btn' || e.target.closest('#show-options-btn'))) {
      showAnswerOptions();
    }
  });
  
  // Evento para el botón "Enviar" respuesta escrita
  document.addEventListener('click', function(e) {
    if (e.target && (e.target.id === 'submit-answer-btn' || e.target.closest('#submit-answer-btn'))) {
      const writtenAnswerInput = document.getElementById('written-answer-input');
      if (writtenAnswerInput && writtenAnswerInput.value.trim() !== '') {
        checkWrittenAnswer(writtenAnswerInput.value);
      } else {
        showNotification('Por favor, escribe una respuesta', 'error');
      }
    }
  });
  
  // Evento para enviar respuesta escrita con Enter
  const writtenAnswerInput = document.getElementById('written-answer-input');
  if (writtenAnswerInput) {
    writtenAnswerInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && this.value.trim() !== '') {
        checkWrittenAnswer(this.value);
      } else if (e.key === 'Enter') {
        showNotification('Por favor, escribe una respuesta', 'error');
      }
    });
  }
  
  // Funciones
  function selectDifficulty(difficulty) {
    console.log('Seleccionando dificultad:', difficulty);
    
    // Desmarcar todos los botones
    if (easyBtn) easyBtn.classList.remove('selected');
    if (mediumBtn) mediumBtn.classList.remove('selected');
    if (hardBtn) hardBtn.classList.remove('selected');
    
    // Marcar el botón seleccionado
    selectedDifficulty = difficulty;
    
    if (difficulty === 'fácil' && easyBtn) {
      easyBtn.classList.add('selected');
    } else if (difficulty === 'media' && mediumBtn) {
      mediumBtn.classList.add('selected');
    } else if (difficulty === 'difícil' && hardBtn) {
      hardBtn.classList.add('selected');
    }
    
    console.log('Dificultad seleccionada:', difficulty);
  }
  
  function showInstructions() {
    // Ocultar sección de dificultad
    if (difficultySection) {
      difficultySection.style.display = 'none';
    }
    
    // Mostrar instrucciones
    if (instructionsSection) {
      instructionsSection.style.display = 'block';
    }
  }
  
  function loadQuestions() {
    console.log('Cargando preguntas...');
    console.log('URL de fetch:', 'data/questionss.json');
    
    fetch('data/questionss.json')
      .then(response => {
        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log('Respuesta recibida del servidor');
        return response.json();
      })
      .then(data => {
        console.log('Datos JSON parseados correctamente');
        console.log('Estructura de datos recibida:', Object.keys(data));
        
        if (!data || !data.facil || !data.media || !data.dificil) {
          console.error('El formato del JSON no es correcto:', data);
          throw new Error('Formato de datos incorrecto');
        }
        
        // Limpiamos la codificación de las preguntas
        ['facil', 'media', 'dificil'].forEach(key => {
          if (data[key] && Array.isArray(data[key])) {
            data[key] = data[key].map(question => {
              return {
                pregunta: cleanText(question.pregunta),
                opciones: {
                  A: cleanText(question.opciones.A),
                  B: cleanText(question.opciones.B),
                  C: cleanText(question.opciones.C),
                  D: cleanText(question.opciones.D)
                },
                respuesta_correcta: question.respuesta_correcta
              };
            });
          }
        });
        
        questions = data;
        console.log('Preguntas cargadas y limpiadas:', Object.keys(questions));
        console.log('Cantidad de preguntas por dificultad:', {
          facil: questions.facil ? questions.facil.length : 0,
          media: questions.media ? questions.media.length : 0,
          dificil: questions.dificil ? questions.dificil.length : 0
        });
        
        // Mostramos un ejemplo para verificar
        if (questions.facil && questions.facil.length > 0) {
          console.log('Ejemplo de pregunta limpiada:', questions.facil[0]);
        }
        
        // Inicializar índices usados después de cargar preguntas
        usedQuestionIndices = {
          facil: [],
          media: [],
          dificil: []
        };
      })
      .catch(error => {
        console.error('Error al cargar preguntas:', error);
        alert('Error al cargar las preguntas. Por favor, recarga la página.');
      });
  }
  
  // Función para limpiar problemas de codificación
  function cleanText(text) {
    if (!text) return '';
    
    // Reemplazar caracteres comunes mal codificados
    return text
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã/g, 'Á')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã/g, 'Í')
      .replace(/Ã"/g, 'Ó')
      .replace(/Ãš/g, 'Ú')
      .replace(/Ã'/g, 'Ñ')
      .replace(/Â¿/g, '¿')
      .replace(/Â¡/g, '¡')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ãœ/g, 'Ü')
      .replace(/Ã¤/g, 'ä')
      .replace(/Ã„/g, 'Ä')
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ã<80>¿/g, '¿')
      .replace(/Ã<80>¡/g, '¡')
      .replace(/Â/g, '')
      .replace(/Ãœ/g, 'Ü')
      .replace(/ÃƒÂ/g, 'Á')
      .replace(/ÃƒÂ©/g, 'é')
      .replace(/ÃƒÂ­/g, 'í')
      .replace(/ÃƒÂ³/g, 'ó')
      .replace(/ÃƒÂº/g, 'ú')
      .replace(/ÃƒÂ±/g, 'ñ')
      .replace(/ÃƒÂ¼/g, 'ü');
  }
  
  function normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Elimina diacríticos
      .replace(/[^a-z0-9\s]/g, "") // Solo deja letras, números y espacios
      .replace(/\s+/g, " "); // Normaliza espacios
  }

  function startGame() {
    console.log('Iniciando juego...');
    
    // Verificar que las preguntas estén cargadas
    if (!questions || !questions.facil || !questions.media || !questions.dificil || Object.keys(questions).length === 0) {
      console.error('Las preguntas no están cargadas correctamente:', questions);
      alert('Las preguntas aún no se han cargado. Por favor, espera unos segundos y vuelve a intentarlo.');
      return;
    }
    
    console.log('Iniciando juego con dificultad:', selectedDifficulty);
    
    // Cambiar pantallas
    if (instructionsSection) {
      instructionsSection.style.display = 'none';
    }
    if (difficultySection) {
      difficultySection.style.display = 'none';
    }
    if (gameSection) {
      gameSection.style.display = 'block';
    }
    
    // Configurar la información del juego
    if (playerDisplay) playerDisplay.textContent = savedUsername;
    if (difficultyDisplay) difficultyDisplay.textContent = 'Dificultad: ' + selectedDifficulty;
    
    // Configurar el temporizador según la dificultad
    timeLeft = difficultyTimes[selectedDifficulty];
    updateTimerDisplay();
    
    // Configurar el evento del timer button
    const timerButton = document.getElementById('timer-button');
    if (timerButton) {
      console.log('Configurando evento click para el timer button');
      // Eliminar eventos previos para evitar duplicados
      timerButton.removeEventListener('click', timerClickHandler);
      // Añadir nuevo evento
      timerButton.addEventListener('click', timerClickHandler);
    }
    
    // Iniciar el temporizador
    startTimer();
    
    // Reiniciar variables del juego
    points = 0;
    questionsAnswered = 0;
    fiftyFiftyUsed = false;
    
    // Reiniciar las preguntas usadas para la dificultad seleccionada
    const difficultyMap = {
      'fácil': 'facil',
      'media': 'media',
      'difícil': 'dificil'
    };
    usedQuestionIndices = {
      facil: [],
      media: [],
      dificil: []
    };
    
    // Actualizar displays
    if (currentPrize) currentPrize.textContent = 'Puntos: 0';
    if (questionsAnsweredDisplay) questionsAnsweredDisplay.textContent = 'Respondidas: 0';
    
    // Habilitar el botón 50/50
    const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
    if (fiftyFiftyBtn) {
      fiftyFiftyBtn.classList.remove('disabled');
    }
    
    // Mostrar la primera pregunta
    showNextQuestion();
  }
  
  // Función manejadora del evento click del timer
  function timerClickHandler() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    showNotification(`Tiempo restante: ${timeString}`, 'info');
  }
  
  function updateTimerDisplay() {
    if (timerDisplay) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (timerBar) {
      const totalTime = difficultyTimes[selectedDifficulty];
      const percentage = (timeLeft / totalTime) * 100;
      timerBar.style.width = percentage + '%';
    }
  }
  
  function startTimer() {
    // Limpiar cualquier temporizador anterior
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(function() {
      timeLeft--;
      updateTimerDisplay();
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        showResults();
      }
    }, 1000);
  }
  
  function showResults() {
    const resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultStats = document.getElementById('result-stats');
    
    if (resultModal && resultTitle && resultMessage && resultStats) {
      // Configurar el contenido del modal
      resultTitle.textContent = '¡Tiempo terminado!';
      resultMessage.textContent = `Has conseguido ${points} puntos respondiendo ${questionsAnswered} preguntas.`;
      
      // Añadir estadísticas
      resultStats.innerHTML = `
        <p><strong>Dificultad:</strong> ${selectedDifficulty}</p>
        <p><strong>Puntos totales:</strong> ${points}</p>
        <p><strong>Preguntas respondidas:</strong> ${questionsAnswered}</p>
        <p><strong>Promedio de puntos por pregunta:</strong> ${questionsAnswered > 0 ? (points / questionsAnswered).toFixed(2) : 0}</p>
      `;
      
      // Guardar puntuación en localStorage
      saveScore();
      
      // Mostrar el modal
      resultModal.style.display = 'block';
    }
  }
  
  function saveScore() {
    try {
      // Obtener puntuaciones existentes o crear un array vacío
      const savedScores = JSON.parse(localStorage.getItem('millonarioScores')) || [];
      
      // Crear nuevo registro de puntuación
      const scoreRecord = {
        username: savedUsername,
        points: points,
        questionsAnswered: questionsAnswered,
        difficulty: selectedDifficulty,
        date: new Date().toISOString()
      };
      
      // Añadir nueva puntuación
      savedScores.push(scoreRecord);
      
      // Ordenar por puntuación (de mayor a menor)
      savedScores.sort((a, b) => b.points - a.points);
      
      // Guardar solo las mejores 10 puntuaciones
      const topScores = savedScores.slice(0, 10);
      
      // Guardar en localStorage
      localStorage.setItem('millonarioScores', JSON.stringify(topScores));
      
      console.log('Puntuación guardada:', scoreRecord);
    } catch (error) {
      console.error('Error al guardar la puntuación:', error);
    }
  }
  
  // Evento para el botón de jugar de nuevo
  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', function() {
      // Ocultar el modal de resultados
      const resultModal = document.getElementById('result-modal');
      if (resultModal) {
        resultModal.style.display = 'none';
      }
      
      // Volver a la pantalla de selección de dificultad
      if (gameSection) {
        gameSection.style.display = 'none';
      }
      if (difficultySection) {
        difficultySection.style.display = 'block';
      }
    });
  }
  
  function showNextQuestion() {
    // Mapear la dificultad seleccionada a las claves del JSON
    const difficultyMap = {
      'fácil': 'facil',
      'media': 'media',
      'difícil': 'dificil'
    };
    
    const difficultyKey = difficultyMap[selectedDifficulty];
    console.log('Mostrando pregunta de dificultad:', difficultyKey);
    
    // Verificar que existan preguntas para la dificultad
    if (!questions) {
      console.error('El objeto questions no está definido');
      showNotification('Error al cargar preguntas. Recarga la página.', 'error');
      return;
    }
    
    if (!questions[difficultyKey]) {
      console.error(`No existe la clave ${difficultyKey} en el objeto questions:`, questions);
      showNotification('Error al cargar preguntas para esta dificultad. Recarga la página.', 'error');
      return;
    }
    
    const availableQuestions = questions[difficultyKey].length;
    const usedQuestions = usedQuestionIndices[difficultyKey].length;
    
    // Si ya se usaron todas las preguntas, mostrar mensaje y terminar el juego
    if (usedQuestions >= availableQuestions) {
      console.log('Se han usado todas las preguntas disponibles');
      showNotification('¡Has respondido todas las preguntas disponibles!', 'success');
      showResults();
      return;
    }
    
    // Obtener una pregunta no utilizada
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * questions[difficultyKey].length);
    } while (usedQuestionIndices[difficultyKey].includes(randomIndex));
    
    // Registrar esta pregunta como utilizada
    usedQuestionIndices[difficultyKey].push(randomIndex);
    
    currentQuestion = questions[difficultyKey][randomIndex];
    console.log('Pregunta seleccionada:', currentQuestion);
    
    if (!currentQuestion) {
      console.error('No se pudo seleccionar una pregunta válida');
      showNotification('Error al seleccionar pregunta. Recarga la página.', 'error');
      return;
    }
    
    // Mostrar la pregunta
    if (questionText) {
      questionText.textContent = currentQuestion.pregunta;
    }
    
    // Siempre mostrar primero como pregunta para escribir la respuesta
    if (answersContainer) {
      answersContainer.style.display = 'none';
      answersContainer.innerHTML = '';
    }
    
    if (writtenAnswerContainer) {
      writtenAnswerContainer.style.display = 'flex';
      const writtenAnswerInput = document.getElementById('written-answer-input');
      if (writtenAnswerInput) {
        writtenAnswerInput.value = '';
        writtenAnswerInput.focus();
      }
    }
    
    // Habilitar el botón "Ver opciones"
    const showOptionsBtn = document.getElementById('show-options-btn');
    if (showOptionsBtn) {
      showOptionsBtn.disabled = false;
      showOptionsBtn.style.display = 'block';
    }
    
    // Resetear el estado del botón 50/50
    fiftyFiftyUsed = false;
    const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
    if (fiftyFiftyBtn) {
      fiftyFiftyBtn.classList.remove('disabled');
      fiftyFiftyBtn.style.display = 'none';
    }
  }
  
  function showAnswerOptions() {
    // Mostrar el contenedor de respuestas
    if (answersContainer) {
      answersContainer.innerHTML = '';
      answersContainer.style.display = 'grid';
      
      // Para cada opción, crear un botón
      Object.entries(currentQuestion.opciones).forEach(([key, value]) => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.textContent = value;
        button.setAttribute('data-answer', key);
        
        // Evento para verificar la respuesta
        button.addEventListener('click', function() {
          checkAnswer(key);
        });
        
        answersContainer.appendChild(button);
      });
      
      // Crear y añadir el botón 50/50
      const fiftyFiftyBtn = document.createElement('button');
      fiftyFiftyBtn.id = 'fifty-fifty-btn';
      fiftyFiftyBtn.className = 'lifeline-btn';
      fiftyFiftyBtn.title = 'Eliminar dos opciones incorrectas';
      fiftyFiftyBtn.innerHTML = `
        <i class="fas fa-balance-scale"></i>
        <span>50:50</span>
      `;
      
      // Solo mostrar el botón si no ha sido usado
      if (!fiftyFiftyUsed) {
        fiftyFiftyBtn.addEventListener('click', useFiftyFifty);
        answersContainer.appendChild(fiftyFiftyBtn);
      }
    }
    
    // Ocultar el botón de mostrar opciones
    const showOptionsBtn = document.getElementById('show-options-btn');
    if (showOptionsBtn) {
      showOptionsBtn.style.display = 'none';
    }
    
    // Notificar al usuario
    showNotification('Opciones disponibles - cada respuesta vale menos puntos', 'info');
  }
  
  function checkAnswer(selectedAnswer) {
    // Deshabilitar todos los botones
    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach(button => {
      button.classList.add('disabled');
    });
    
    // Obtener botón seleccionado
    const selectedButton = document.querySelector(`.answer-btn[data-answer="${selectedAnswer}"]`);
    
    // Verificar si la respuesta es correcta
    if (selectedAnswer === currentQuestion.respuesta_correcta) {
      // Respuesta correcta
      showNotification('¡Respuesta correcta!', 'success');
      selectedButton.classList.add('correct');
      
      // Asignar puntos según si se usó o no el 50/50
      if (fiftyFiftyUsed) {
        points += POINTS.FIFTY_FIFTY_ANSWER;
      } else {
        points += POINTS.OPTIONS_ANSWER;
      }
    } else {
      // Respuesta incorrecta
      showNotification('Respuesta incorrecta', 'error');
      selectedButton.classList.add('incorrect');
      
      // Mostrar la respuesta correcta
      const correctButton = document.querySelector(`.answer-btn[data-answer="${currentQuestion.respuesta_correcta}"]`);
      if (correctButton) {
        correctButton.classList.add('correct');
      }
    }
    
    // Actualizar contadores
    questionsAnswered++;
    updateGameInfo();
    
    // Mostrar siguiente pregunta después de un delay mayor
    setTimeout(() => {
      showNextQuestion();
    }, 1200); // Aumentado de 400ms a 1200ms
  }
  
  function checkWrittenAnswer(answer) {
    // Obtener la letra de la respuesta correcta
    const correctLetter = currentQuestion.respuesta_correcta;
    
    // Obtener el texto de la respuesta correcta
    const correctText = currentQuestion.opciones[correctLetter];
    
    const normalizedCorrectText = normalizeText(correctText);
    const normalizedUserAnswer = normalizeText(answer);
    
    console.log('Verificando respuesta escrita:', {
      userAnswer: normalizedUserAnswer,
      correctText: normalizedCorrectText
    });
    
    // Verificar si la respuesta es correcta (con cierta tolerancia)
    if (
      normalizedUserAnswer === normalizedCorrectText || 
      (normalizedCorrectText.includes(normalizedUserAnswer) && normalizedUserAnswer.length > 3) ||
      (normalizedUserAnswer.includes(normalizedCorrectText) && normalizedCorrectText.length > 3)
    ) {
      // Respuesta correcta
      showNotification('¡Respuesta correcta!', 'success');
      points += POINTS.WRITTEN_ANSWER;
    } else {
      // Respuesta incorrecta
      showNotification(`Respuesta incorrecta. La correcta era: ${correctText}`, 'error');
    }
    
    // Actualizar contadores
    questionsAnswered++;
    updateGameInfo();
    
    // Mostrar siguiente pregunta después de un delay mayor
    setTimeout(() => {
      showNextQuestion();
    }, 1200); // Aumentado de 400ms a 1200ms
  }
  
  function useFiftyFifty() {
    console.log('Usando 50/50');
    
    // Marcar como usado y deshabilitar el botón
    const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
    if (fiftyFiftyBtn) {
      fiftyFiftyBtn.classList.add('disabled');
    }
    
    fiftyFiftyUsed = true;
    
    // Obtener todas las opciones incorrectas
    const incorrectOptions = [];
    const answerButtons = document.querySelectorAll('.answer-btn');
    
    answerButtons.forEach(button => {
      const answer = button.getAttribute('data-answer');
      if (answer !== currentQuestion.respuesta_correcta) {
        incorrectOptions.push(button);
      }
    });
    
    // Seleccionar aleatoriamente dos opciones incorrectas para eliminar
    if (incorrectOptions.length >= 2) {
      // Mezclar el array de opciones incorrectas
      incorrectOptions.sort(() => Math.random() - 0.5);
      
      // Eliminar dos opciones
      for (let i = 0; i < 2; i++) {
        incorrectOptions[i].style.visibility = 'hidden';
        incorrectOptions[i].classList.add('disabled');
      }
    }
    
    showNotification('Se han eliminado dos opciones incorrectas - ahora cada respuesta vale menos puntos', 'info');
  }
  
  function updateGameInfo() {
    if (currentPrize) {
      currentPrize.textContent = `Puntos: ${points}`;
    }
    
    if (questionsAnsweredDisplay) {
      questionsAnsweredDisplay.textContent = `Respondidas: ${questionsAnswered}`;
    }
  }
  
  function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = message;
      notification.className = `toast ${type}`;
      notification.style.display = 'block';
      
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    } else {
      console.log('Notificación:', message);
    }
  }
  
  // Seleccionar la dificultad fácil por defecto
  selectDifficulty('fácil');
});
