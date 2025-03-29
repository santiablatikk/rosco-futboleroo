/**
 * Sistema de actualización de ranking para PASALA CHE
 * Maneja la actualización inmediata del ranking después de finalizar una partida
 */

const RankingUpdater = {
    /**
     * Guarda el resultado de una partida en el historial de juegos
     * @param {Object} gameData - Datos de la partida finalizada
     * @returns {boolean} - Éxito o fracaso de la operación
     */
    saveGameResult: function(gameData) {
        try {
            if (!gameData || !gameData.username || gameData.score === undefined) {
                console.error("Datos de juego incompletos:", gameData);
                return false;
            }
            
            // Asegurarse de que hay una fecha
            if (!gameData.date) {
                gameData.date = new Date().toISOString();
            }
            
            // Guardar timestamp de última partida para evitar problemas de caché
            localStorage.setItem('last_game_timestamp', gameData.date);
            
            // Clave para el historial del usuario
            const historyKey = `game_history_${gameData.username}`;
            
            // Obtener historial existente o crear uno nuevo
            let userHistory = [];
            try {
                const existingHistory = localStorage.getItem(historyKey);
                if (existingHistory) {
                    userHistory = JSON.parse(existingHistory);
                    if (!Array.isArray(userHistory)) {
                        userHistory = [];
                    }
                }
            } catch (e) {
                console.error("Error al leer historial existente:", e);
                userHistory = [];
            }
            
            // Añadir nueva entrada al principio del historial
            userHistory.unshift(gameData);
            
            // Limitar el historial a 50 entradas para ahorrar espacio
            if (userHistory.length > 50) {
                userHistory = userHistory.slice(0, 50);
            }
            
            // Guardar historial actualizado
            localStorage.setItem(historyKey, JSON.stringify(userHistory));
            
            // Establecer bandera de juego completado para que el ranking se actualice
            localStorage.setItem('game_completed', 'true');
            
            // Actualizar estadísticas del perfil
            this.updateUserProfile(gameData);
            
            return true;
        } catch (error) {
            console.error("Error al guardar resultado del juego:", error);
            return false;
        }
    },
    
    /**
     * Actualiza las estadísticas del perfil del usuario basado en los resultados del juego
     * @param {Object} gameData - Datos de la partida finalizada
     */
    updateUserProfile: function(gameData) {
        try {
            if (!gameData || !gameData.username) return;
            
            const profileKey = `profile_${gameData.username}`;
            
            // Obtener perfil existente o crear uno nuevo
            let userProfile = {};
            try {
                const existingProfile = localStorage.getItem(profileKey);
                if (existingProfile) {
                    userProfile = JSON.parse(existingProfile);
                }
            } catch (e) {
                console.error("Error al leer perfil existente:", e);
            }
            
            // Inicializar campos si no existen
            if (!userProfile.stats) {
                userProfile.stats = {};
            }
            if (!userProfile.name) {
                userProfile.name = gameData.username;
            }
            if (!userProfile.created) {
                userProfile.created = new Date().toISOString();
            }
            userProfile.lastActive = new Date().toISOString();
            
            // Actualizar estadísticas
            const stats = userProfile.stats;
            
            // Partidas jugadas
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            
            // Victorias/derrotas
            if (gameData.result === 'victory') {
                stats.victories = (stats.victories || 0) + 1;
            } else if (gameData.result === 'defeat') {
                stats.defeats = (stats.defeats || 0) + 1;
            } else if (gameData.result === 'timeout') {
                stats.timeouts = (stats.timeouts || 0) + 1;
            }
            
            // Mejor puntuación
            if (!stats.bestScore || gameData.score > stats.bestScore) {
                stats.bestScore = gameData.score;
                stats.bestScoreDate = gameData.date;
            }
            
            // Partidas por dificultad
            if (!stats.byDifficulty) stats.byDifficulty = {};
            const difficulty = gameData.difficulty || 'normal';
            if (!stats.byDifficulty[difficulty]) {
                stats.byDifficulty[difficulty] = {
                    played: 0,
                    victories: 0,
                    defeats: 0,
                    timeouts: 0,
                    bestScore: 0
                };
            }
            
            const diffStats = stats.byDifficulty[difficulty];
            diffStats.played++;
            
            if (gameData.result === 'victory') {
                diffStats.victories++;
            } else if (gameData.result === 'defeat') {
                diffStats.defeats++;
            } else if (gameData.result === 'timeout') {
                diffStats.timeouts++;
            }
            
            if (!diffStats.bestScore || gameData.score > diffStats.bestScore) {
                diffStats.bestScore = gameData.score;
            }
            
            // Estadísticas globales
            stats.totalCorrectAnswers = (stats.totalCorrectAnswers || 0) + (gameData.correctAnswers || 0);
            stats.totalIncorrectAnswers = (stats.totalIncorrectAnswers || 0) + (gameData.incorrectAnswers || 0);
            stats.totalSkippedAnswers = (stats.totalSkippedAnswers || 0) + (gameData.skippedAnswers || 0);
            
            // Guardar perfil actualizado
            localStorage.setItem(profileKey, JSON.stringify(userProfile));
        } catch (error) {
            console.error("Error al actualizar perfil de usuario:", error);
        }
    },
    
    /**
     * Redirige al usuario a la página de ranking después de guardar el resultado
     * @param {Object} gameData - Datos de la partida finalizada
     */
    redirectToRanking: function(gameData) {
        try {
            // Construir URL para la página de ranking
            let rankingUrl = 'ranking.html';
            
            // Añadir parámetros según el resultado
            if (gameData && gameData.result) {
                rankingUrl += `?source=game&result=${gameData.result}`;
                
                // Añadir más parámetros si es necesario
                if (gameData.difficulty) {
                    rankingUrl += `&difficulty=${encodeURIComponent(gameData.difficulty)}`;
                }
                
                if (gameData.score !== undefined) {
                    rankingUrl += `&score=${encodeURIComponent(gameData.score)}`;
                }
            }
            
            // Redirigir a la página de ranking
            window.location.href = rankingUrl;
        } catch (error) {
            console.error("Error al redirigir a ranking:", error);
            // En caso de error, intentar redirigir a la URL básica
            window.location.href = 'ranking.html';
        }
    },
    
    /**
     * Procesa el fin de la partida y actualiza el ranking
     * @param {Object} gameData - Datos de la partida finalizada
     * @param {boolean} redirect - Si debe redirigir al ranking después de guardar
     * @returns {boolean} - Éxito o fracaso de la operación
     */
    processGameEnd: function(gameData, redirect = true) {
        // Guardar el resultado
        const saved = this.saveGameResult(gameData);
        
        // Redirigir si es necesario y se guardó correctamente
        if (saved && redirect) {
            this.redirectToRanking(gameData);
        }
        
        return saved;
    }
};

// Detectar cuando la página está lista
document.addEventListener('DOMContentLoaded', function() {
    // Comprobar si venimos de una partida completada mediante URL
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    
    if (source === 'game') {
        // Mostrar mensaje si la partida se completó
        const result = urlParams.get('result');
        const score = urlParams.get('score');
        
        if (result && score) {
            // Mostrar toast de confirmación
            showToast(`Juego ${getResultText(result)}. Puntuación: ${score}. Ranking actualizado.`);
        }
    }
    
    // Función para mostrar toast
    function showToast(message) {
        // Comprobar si ya existe un toast
        let toast = document.querySelector('.ranking-toast');
        
        if (!toast) {
            // Crear nuevo toast
            toast = document.createElement('div');
            toast.className = 'ranking-toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
            toast.style.color = 'white';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '10px';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            toast.style.zIndex = '9999';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            document.body.appendChild(toast);
            
            // Mostrar con animación
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            }, 100);
        }
        
        // Actualizar mensaje
        toast.textContent = message;
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            
            // Eliminar después de la animación
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    // Función para obtener texto del resultado
    function getResultText(result) {
        switch (result) {
            case 'victory': return 'ganado';
            case 'defeat': return 'perdido';
            case 'timeout': return 'finalizado por tiempo';
            default: return 'completado';
        }
    }
}); 