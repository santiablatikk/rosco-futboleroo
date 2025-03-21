/**
 * ROSCO GAME FUNCTIONS
 * This file contains the core functions for the PASALA CHÉ rosco game
 */

// Load questions from data/questions.json file
async function loadQuestions() {
  try {
    console.log("Cargando preguntas del juego...");
    
    // Load questions from the local JSON file
    const response = await fetch('/data/questions.json');
    
    if (!response.ok) {
      throw new Error(`Error al cargar preguntas: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Recibidas ${data.length} categorías de preguntas`);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No se recibieron preguntas válidas');
    }
    
    // Process questions into the format needed for the game
    let processedQuestions = [];
    
    data.forEach(category => {
      const letter = category.letra;
      if (category.preguntas && category.preguntas.length > 0) {
        // Select a random question for each letter
        const randomIndex = Math.floor(Math.random() * category.preguntas.length);
        const selectedQuestion = category.preguntas[randomIndex];
        
        processedQuestions.push({
          letra: letter,
          letter: letter, // Keep both formats for compatibility
          pregunta: selectedQuestion.pregunta,
          respuesta: selectedQuestion.respuesta
        });
      }
    });
    
    // Sort questions alphabetically
    processedQuestions.sort((a, b) => a.letra.localeCompare(b.letra));
    
    console.log("Preguntas procesadas:", processedQuestions.length);
    return processedQuestions;
  } catch (error) {
    console.error("Error al cargar preguntas:", error.message);
    
    // If there's an error, create dummy questions
    console.log("Cargando preguntas de respaldo...");
    return createDummyQuestions();
  }
}

// Create backup questions in case the JSON file fails to load
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

// Helper function to get default answers for each letter
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

// Draw the rosco wheel with all the letters
function drawRosco(container, questions, gameState, queue) {
  try {
    if (!container) {
      console.error("No se encontró el contenedor del rosco");
      return;
    }
    
    // Clear the rosco container
    container.innerHTML = "";

    // Configure sizes based on device
    const isMobile = window.innerWidth <= 768;
    const containerSize = isMobile ? 280 : 400;
    const letterSize = isMobile ? 35 : 40;
    const radius = isMobile ? 110 : 165;
    
    // Apply styles to the rosco container
    container.style.width = containerSize + "px";
    container.style.height = containerSize + "px";
    container.style.position = "relative";
    container.style.margin = "0 auto";

    // Check that we have questions
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.error("No hay preguntas disponibles para el rosco");
      container.innerHTML = "<div class='error'>Error: No hay preguntas disponibles</div>";
      return;
    }
    
    console.log(`Dibujando rosco con ${questions.length} letras`);
    
    // Get all unique letters from questions
    const uniqueLetters = [...new Set(questions.map(q => (q.letter || q.letra || "").toUpperCase()))];
    uniqueLetters.sort(); // Sort alphabetically
    
    // Create elements for each letter
    uniqueLetters.forEach((letter, index) => {
      if (!letter) return; // Skip if letter is invalid
      
      // Calculate position in the circle
      const angle = (index / uniqueLetters.length) * 2 * Math.PI - Math.PI/2;
      const x = Math.round(radius * Math.cos(angle)) + containerSize/2 - letterSize/2;
      const y = Math.round(radius * Math.sin(angle)) + containerSize/2 - letterSize/2;
      
      // Create the div element for the letter
      const letterDiv = document.createElement("div");
      letterDiv.className = "letter";
      letterDiv.textContent = letter;
      letterDiv.dataset.letter = letter;
      letterDiv.dataset.index = index.toString();
      letterDiv.style.left = `${x}px`;
      letterDiv.style.top = `${y}px`;
      letterDiv.style.width = `${letterSize}px`;
      letterDiv.style.height = `${letterSize}px`;
      
      // If this letter has already been answered, update its state
      if (gameState && gameState.answeredLetters && gameState.answeredLetters[letter]) {
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
      
      container.appendChild(letterDiv);
    });
    
    // Create the display for the current letter
    const currentLetterDisplay = document.createElement("div");
    currentLetterDisplay.id = "current-letter-display";
    currentLetterDisplay.style.position = "absolute";
    currentLetterDisplay.style.top = "50%";
    currentLetterDisplay.style.left = "50%";
    currentLetterDisplay.style.transform = "translate(-50%, -50%)";
    currentLetterDisplay.style.fontSize = "100px";
    currentLetterDisplay.style.fontWeight = "800";
    currentLetterDisplay.style.color = "rgba(255, 255, 255, 0.2)";
    currentLetterDisplay.style.zIndex = "1";
    container.appendChild(currentLetterDisplay);

    console.log("Rosco dibujado correctamente con " + uniqueLetters.length + " letras");
    
  } catch (error) {
    console.error("Error al dibujar el rosco:", error);
  }
}

// Update the active letter in the rosco
function updateActiveLetter(queue, questions, gameState) {
  try {
    const letters = document.querySelectorAll(".letter");
    letters.forEach((l) => l.classList.remove("active", "current"));
    
    if (!queue || queue.length === 0 || !questions) return;
    
    const currentIdx = queue[0];
    const currentQ = questions[currentIdx];
    
    if (!currentQ) return;
    
    const currentLetter = (currentQ.letter || currentQ.letra || "").toUpperCase();
    
    // Find the letter element that corresponds to the current letter
    const currentLetterElement = document.querySelector(`.letter[data-letter="${currentLetter}"]`);
    
    if (currentLetterElement) {
      currentLetterElement.classList.add("active", "current");
      
      // Update the central letter display
      const currentLetterDisplay = document.getElementById("current-letter-display");
      if (currentLetterDisplay) {
        currentLetterDisplay.textContent = currentLetter;
      }
    }
  } catch (error) {
    console.error("Error al actualizar letra activa:", error);
  }
}

// Show the current question
function showQuestion(queue, questions, answerInput) {
  try {
    if (!queue || queue.length === 0 || !questions) {
      console.log("No hay preguntas disponibles");
      return;
    }

    // Get the current question index
    const currentQuestionIndex = queue[0];
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      console.error("No se encontró la pregunta con índice", currentQuestionIndex);
      return;
    }
    
    // Make sure the question has all required fields
    const letter = (currentQuestion.letter || currentQuestion.letra || "").toUpperCase();
    const questionText = currentQuestion.pregunta || currentQuestion.question || "";
    
    if (!letter || !questionText) {
      console.error("La pregunta no tiene letra o texto válido:", currentQuestion);
      return;
    }
    
    // Clear the previous input
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
    
    // Update the question in the interface
    const questionContainer = document.querySelector(".question-container");
    if (!questionContainer) {
      console.error("No se encontró el contenedor de la pregunta");
      return;
    }
    
    // Update the content of the question
    const letterElement = questionContainer.querySelector(".question-letter");
    const textElement = questionContainer.querySelector(".question-text");
    
    if (letterElement) letterElement.textContent = letter;
    if (textElement) textElement.textContent = questionText;
    
    // Update the central letter display
    const currentLetterDisplay = document.getElementById("current-letter-display");
    if (currentLetterDisplay) {
      currentLetterDisplay.textContent = letter;
    }
    
    console.log(`Mostrando pregunta: ${letter} - ${questionText}`);
    
  } catch (error) {
    console.error("Error al mostrar la pregunta:", error);
  }
}

// Export the functions so they can be used in main.js
window.roscoGame = {
  loadQuestions,
  createDummyQuestions,
  getDefaultAnswerForLetter,
  drawRosco,
  updateActiveLetter,
  showQuestion
}; 