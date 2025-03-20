// On page load setup
document.addEventListener('DOMContentLoaded', function() {
    // Make sure the start container is hidden initially
    const loginScreen = document.getElementById('login-screen');
    const startContainer = document.getElementById('start-container');
    
    if (loginScreen && startContainer) {
        loginScreen.classList.remove('hidden');
        startContainer.classList.add('hidden');
        
        console.log('Login screen shown, start container hidden');
    }
    
    // Set up default difficulty
    const savedDifficulty = localStorage.getItem('difficulty') || 'facil';
    document.querySelectorAll('.difficulty-option').forEach(option => {
        if (option.dataset.difficulty === savedDifficulty) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
});

// Login form submission
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const username = usernameInput.value.trim();
        
        if (username.length > 0) {
            localStorage.setItem('username', username);
            
            // Update welcome message
            const userWelcome = document.querySelector('.user-welcome');
            if (userWelcome) {
                userWelcome.textContent = `¡Hola ${username}!`;
            }
            
            // Update username display in game screen
            const usernameDisplay = document.querySelector('.username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = `JUGADOR: ${username}`;
            }
            
            // Hide login screen, show start screen
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('start-container').classList.remove('hidden');
            
            console.log('User logged in, showing start screen');
        }
    });
}

// Difficulty selection
document.querySelectorAll('.difficulty-option').forEach(option => {
    option.addEventListener('click', function() {
        // Remove selected class from all options
        document.querySelectorAll('.difficulty-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        this.classList.add('selected');
        
        // Save selected difficulty
        localStorage.setItem('difficulty', this.dataset.difficulty);
        console.log('Selected difficulty:', this.dataset.difficulty);
    });
});

// Start game button
const startButton = document.getElementById('start-game-btn');
if (startButton) {
    startButton.addEventListener('click', function() {
        const difficultyElement = document.querySelector('.difficulty-option.selected');
        const selectedDifficulty = difficultyElement ? difficultyElement.dataset.difficulty : 'facil';
        
        // Store only the selected difficulty (only affects timer)
        localStorage.setItem('difficulty', selectedDifficulty);
        
        // Hide start container and show game screen
        document.getElementById('start-container').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        console.log('Starting game with difficulty:', selectedDifficulty);
        
        // Call startGame function from main.js
        if (typeof window.startGame === 'function') {
            try {
                window.startGame();
                console.log('Game started successfully');
            } catch (error) {
                console.error('Error starting game:', error);
            }
        } else {
            console.warn('startGame function not available yet, trying in 500ms');
            setTimeout(() => {
                if (typeof window.startGame === 'function') {
                    window.startGame();
                    console.log('Game started with delay');
                } else {
                    console.error('startGame function not found after delay');
                }
            }, 500);
        }
    });
}

// Web Share API for sharing
function setupShareButton(buttonId) {
    const shareBtn = document.getElementById(buttonId);
    if (shareBtn && navigator.share) {
        shareBtn.addEventListener('click', function() {
            navigator.share({
                title: 'PASALA CHÉ - Juego de Preguntas sobre Fútbol',
                text: '¡Prueba este increíble juego de preguntas sobre fútbol!',
                url: window.location.href
            })
            .then(() => console.log('¡Compartido con éxito!'))
            .catch((error) => console.log('Error compartiendo:', error));
        });
    } else if (shareBtn) {
        // Fallback for browsers that don't support Web Share API
        shareBtn.addEventListener('click', function() {
            // Create a temporary input
            const input = document.createElement('input');
            input.value = window.location.href;
            document.body.appendChild(input);
            // Select and copy the link
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            // Show confirmation
            alert('¡Enlace copiado! Compártelo en tus redes sociales.');
        });
    }
}

// Setup share buttons
document.addEventListener('DOMContentLoaded', function() {
    setupShareButton('share-btn-login');
    setupShareButton('share-btn-game');
});

// Setup game controls
document.addEventListener('DOMContentLoaded', function() {
    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn && typeof window.showHint === 'function') {
        helpBtn.addEventListener('click', function() {
            window.showHint();
        });
    }
    
    // Answer button
    const answerBtn = document.getElementById('answer-btn');
    if (answerBtn && typeof window.checkAnswer === 'function') {
        answerBtn.addEventListener('click', function() {
            window.checkAnswer();
        });
    }
    
    // Pass button
    const passBtn = document.getElementById('pass-btn');
    if (passBtn && typeof window.passQuestion === 'function') {
        passBtn.addEventListener('click', function() {
            window.passQuestion();
        });
    }
    
    // Answer input (to submit on Enter key)
    const answerInput = document.getElementById('answer');
    if (answerInput && typeof window.checkAnswer === 'function') {
        answerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.checkAnswer();
            }
        });
    }
}); 