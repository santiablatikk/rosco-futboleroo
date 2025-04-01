// main.js
document.addEventListener('DOMContentLoaded', function() {
    // References to DOM elements
    const playerSection = document.getElementById('player-section');
    const modeSection = document.getElementById('mode-section');
    const difficultySection = document.getElementById('difficulty-section');
    const playerNameInput = document.getElementById('player-name');
    const continueBtn = document.getElementById('continue-btn');
    const welcomeMessage = document.getElementById('welcome-message');
    const localMode = document.getElementById('local-mode');
    const onlineMode = document.getElementById('online-mode');
    const backToNameBtn = document.getElementById('back-to-name-btn');
    const backToModeBtn = document.getElementById('back-to-mode-btn');
    const easyBtn = document.getElementById('easy-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const hardBtn = document.getElementById('hard-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const toggleRulesBtn = document.getElementById('toggle-rules-btn');
    const rulesContent = document.getElementById('rules-content');
    const shareBtn = document.getElementById('share-btn');
    const infoMessage = document.getElementById('info-message');
    
    let selectedDifficulty = null;
    
    // Create star background
    createStars();
    
    // Initialize animations
    initAnimations();
    
    // Event listeners
    continueBtn.addEventListener('click', function() {
        const playerName = playerNameInput.value.trim();
        if (playerName.length < 2) {
            showInfoMessage('Por favor, ingresa un nombre válido (mínimo 2 caracteres)', 'error');
            playerNameInput.focus();
            return;
        }
        
        // Save player name to session storage
        sessionStorage.setItem('playerName', playerName);
        
        // Update welcome message
        welcomeMessage.textContent = `¡Bienvenido, ${playerName}!`;
        
        // Navigate to mode selection screen
        navigateToScreen(modeSection, playerSection);
    });
    
    playerNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            continueBtn.click();
        }
    });
    
    backToNameBtn.addEventListener('click', function() {
        navigateToScreen(playerSection, modeSection);
    });
    
    backToModeBtn.addEventListener('click', function() {
        navigateToScreen(modeSection, difficultySection);
        selectedDifficulty = null;
        updateDifficultySelection();
    });
    
    localMode.addEventListener('click', function() {
        navigateToScreen(difficultySection, modeSection);
    });
    
    onlineMode.addEventListener('click', function() {
        // For demonstration, navigate to online.html
        window.location.href = 'online.html';
    });
    
    [easyBtn, mediumBtn, hardBtn].forEach(btn => {
        btn.addEventListener('click', function() {
            selectedDifficulty = this.dataset.difficulty;
            updateDifficultySelection();
        });
    });
    
    startGameBtn.addEventListener('click', function() {
        if (!selectedDifficulty) {
            showInfoMessage('Por favor, selecciona una dificultad', 'error');
            return;
        }
        
        // Save difficulty to session storage
        sessionStorage.setItem('difficulty', selectedDifficulty);
        
        // Navigate to local game page
        window.location.href = 'local.html';
    });
    
    toggleRulesBtn.addEventListener('click', function() {
        const isHidden = rulesContent.style.display === 'none';
        rulesContent.style.display = isHidden ? 'block' : 'none';
        toggleRulesBtn.innerHTML = isHidden ? 
            '<i class="fas fa-times"></i> CERRAR REGLAS' : 
            '<i class="fas fa-book"></i> REGLAS DEL JUEGO';
        
        if (isHidden) {
            rulesContent.classList.add('fade-in');
            setTimeout(() => rulesContent.classList.remove('fade-in'), 300);
        }
    });
    
    shareBtn.addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'PASALA CHE - El juego de palabras del fútbol',
                text: '¡Juega PASALA CHE, el juego ideal para los fanáticos del fútbol!',
                url: window.location.href
            })
            .then(() => showInfoMessage('¡Gracias por compartir!'))
            .catch(error => console.log('Error sharing:', error));
        } else {
            const url = window.location.href;
            navigator.clipboard.writeText(url)
                .then(() => showInfoMessage('¡Enlace copiado al portapapeles!'))
                .catch(err => showInfoMessage('No se pudo copiar el enlace', 'error'));
        }
    });
    
    // Helper functions
    function navigateToScreen(showScreen, hideScreen) {
        hideScreen.style.display = 'none';
        showScreen.style.display = 'block';
        showScreen.classList.add('fade-in');
        setTimeout(() => showScreen.classList.remove('fade-in'), 300);
        
        // Re-initialize animations for new screen
        initAnimations();
    }
    
    function updateDifficultySelection() {
        [easyBtn, mediumBtn, hardBtn].forEach(btn => {
            btn.classList.remove('selected');
            if (selectedDifficulty && btn.dataset.difficulty === selectedDifficulty) {
                btn.classList.add('selected');
            }
        });
        
        startGameBtn.classList.toggle('ready', selectedDifficulty !== null);
    }
    
    function showInfoMessage(message, type = 'info') {
        infoMessage.textContent = message;
        infoMessage.className = type === 'error' ? 'error-message' : 'info-message';
        infoMessage.classList.add('visible');
        
        setTimeout(() => {
            infoMessage.classList.remove('visible');
        }, 3000);
    }
    
    function createStars() {
        const starsContainer = document.querySelector('.stars');
        const starsCount = 100;
        
        for (let i = 0; i < starsCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random position
            star.style.top = `${Math.random() * 100}%`;
            star.style.left = `${Math.random() * 100}%`;
            
            // Random size
            const size = Math.random() * 2 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            
            // Random animation delay
            star.style.animationDelay = `${Math.random() * 10}s`;
            
            starsContainer.appendChild(star);
        }
    }
    
    function initAnimations() {
        // Add entrance animations to various elements
        document.querySelectorAll('header, h1, h2, .mode-card, .difficulty-btn, .action-btn, .back-btn').forEach((el, index) => {
            el.style.opacity = 0;
            el.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
            el.style.opacity = 1;
        });
    }
    
    // Check if returning from game
    const returnStatus = sessionStorage.getItem('gameReturn');
    if (returnStatus) {
        // Clear the return status
        sessionStorage.removeItem('gameReturn');
        
        // If player name exists, navigate to mode selection
        const savedName = sessionStorage.getItem('playerName');
        if (savedName) {
            playerNameInput.value = savedName;
            welcomeMessage.textContent = `¡Bienvenido nuevamente, ${savedName}!`;
            navigateToScreen(modeSection, playerSection);
        }
    }
});
  