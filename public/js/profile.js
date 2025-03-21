// profile.js - Funcionalidad para la página de perfil
document.addEventListener('DOMContentLoaded', function() {
  // Obtener username de localStorage
  const username = localStorage.getItem('username') || 'Jugador';
  document.getElementById('profile-username').textContent = username;
  
  // Cargar estadísticas del jugador
  fetchPlayerStats(username);
  
  // Cargar logros desbloqueados
  fetchPlayerAchievements(username);
  
  // Event Listeners para botones
  document.getElementById('back-to-game').addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  document.getElementById('view-ranking').addEventListener('click', function() {
    window.location.href = 'ranking.html';
  });
});

// Función para obtener estadísticas del usuario
async function fetchPlayerStats(username) {
  try {
    // Intentar obtener stats del servidor
    const response = await fetch(`/api/player-stats?username=${username}`);
    
    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }
    
    const stats = await response.json();
    updateStatsDisplay(stats);
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    
    // Si falla, intentar obtener stats del localStorage
    const localStats = getLocalStats();
    
    if (localStats) {
      updateStatsDisplay(localStats);
    } else {
      // Si no hay datos locales, mostrar datos de ejemplo
      setDummyStats();
    }
  }
}

// Obtener estadísticas almacenadas en localStorage
function getLocalStats() {
  try {
    const gameResults = JSON.parse(localStorage.getItem('gameResults')) || [];
    
    if (!gameResults.length) return null;
    
    // Calcular estadísticas basadas en resultados guardados
    const gamesPlayed = gameResults.length;
    const correctAnswers = gameResults.reduce((sum, game) => sum + (game.correctCount || 0), 0);
    const wrongAnswers = gameResults.reduce((sum, game) => sum + (game.wrongCount || 0), 0);
    const bestScore = Math.max(...gameResults.map(game => game.score || 0));
    
    // Calcular tiempo promedio si está disponible
    let avgTime = 0;
    const gamesWithTime = gameResults.filter(game => game.timeSpent);
    if (gamesWithTime.length) {
      avgTime = Math.round(gamesWithTime.reduce((sum, game) => sum + game.timeSpent, 0) / gamesWithTime.length);
    }
    
    return {
      gamesPlayed,
      correctAnswers,
      wrongAnswers,
      bestScore,
      avgTime,
      rank: localStorage.getItem('playerRank') || 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas locales:', error);
    return null;
  }
}

// Actualizar el display con las estadísticas obtenidas
function updateStatsDisplay(stats) {
  document.getElementById('games-played').textContent = stats.gamesPlayed || 0;
  document.getElementById('correct-answers').textContent = stats.correctAnswers || 0;
  document.getElementById('wrong-answers').textContent = stats.wrongAnswers || 0;
  document.getElementById('best-score').textContent = stats.bestScore || 0;
  document.getElementById('avg-time').textContent = `${stats.avgTime || 0}s`;
  document.getElementById('rank').textContent = `#${stats.rank || 0}`;
  
  // Actualizar estado del jugador basado en estadísticas
  updatePlayerStatus(stats);
}

// Función para obtener logros del usuario
async function fetchPlayerAchievements(username) {
  try {
    const response = await fetch(`/api/player-achievements?username=${username}`);
    
    if (!response.ok) {
      throw new Error('Error al obtener logros');
    }
    
    const achievements = await response.json();
    updateAchievementsDisplay(achievements);
    
  } catch (error) {
    console.error('Error cargando logros:', error);
    
    // Si falla, intentar obtener logros del localStorage
    const localAchievements = getLocalAchievements();
    
    if (localAchievements && localAchievements.length > 0) {
      updateAchievementsDisplay(localAchievements);
    } else {
      // Si no hay datos locales, mostrar datos de ejemplo
      setDummyAchievements();
    }
  }
}

// Obtener logros almacenados en localStorage
function getLocalAchievements() {
  try {
    return JSON.parse(localStorage.getItem('achievements')) || [];
  } catch (error) {
    console.error('Error obteniendo logros locales:', error);
    return null;
  }
}

// Actualizar el display con los logros obtenidos
function updateAchievementsDisplay(achievements) {
  const achievementsContainer = document.getElementById('profile-achievements');
  achievementsContainer.innerHTML = '';
  
  if (!achievements || achievements.length === 0) {
    // Hide the achievements section completely when there are no achievements
    const achievementsSection = achievementsContainer.closest('.profile-section');
    if (achievementsSection) {
      achievementsSection.style.display = 'none';
    }
    return;
  }
  
  // If there are achievements, make sure the section is visible
  const achievementsSection = achievementsContainer.closest('.profile-section');
  if (achievementsSection) {
    achievementsSection.style.display = 'block';
  }
  
  // Mostrar logros desbloqueados
  achievements.forEach(achievement => {
    const achievementCard = document.createElement('div');
    achievementCard.className = 'profile-achievement-card';
    achievementCard.innerHTML = `
      <div class="profile-achievement-icon">
        <span>${achievement.icon || getIconForAchievement(achievement.type)}</span>
      </div>
      <div class="profile-achievement-info">
        <div class="profile-achievement-name">${achievement.name}</div>
        <div class="profile-achievement-desc">${achievement.description}</div>
      </div>
    `;
    achievementsContainer.appendChild(achievementCard);
  });
}

// Obtener icono apropiado según el tipo de logro
function getIconForAchievement(type) {
  const icons = {
    'speed': '⚡',
    'accuracy': '🎯',
    'streak': '🔥',
    'complete': '🏆',
    'noHints': '🧠',
    'perfectRound': '⭐',
    'dedicated': '📚'
  };
  
  return icons[type] || '🏅';
}

// Función para actualizar el estado del jugador
function updatePlayerStatus(stats) {
  const statusElement = document.getElementById('profile-status');
  
  if (!stats || stats.gamesPlayed === 0) {
    statusElement.textContent = 'Principiante';
    return;
  }
  
  if (stats.bestScore >= 200) {
    statusElement.textContent = 'Maestro del Rosco';
  } else if (stats.bestScore >= 150) {
    statusElement.textContent = 'Experto';
  } else if (stats.bestScore >= 100) {
    statusElement.textContent = 'Avanzado';
  } else if (stats.bestScore >= 50) {
    statusElement.textContent = 'Intermedio';
  } else {
    statusElement.textContent = 'Novato';
  }
}

// Funciones para mostrar datos de ejemplo en caso de error
function setDummyStats() {
  document.getElementById('games-played').textContent = '5';
  document.getElementById('correct-answers').textContent = '42';
  document.getElementById('wrong-answers').textContent = '13';
  document.getElementById('best-score').textContent = '120';
  document.getElementById('avg-time').textContent = '180s';
  document.getElementById('rank').textContent = '#12';
  
  // Actualizar estado
  document.getElementById('profile-status').textContent = 'Intermedio';
}

function setDummyAchievements() {
  const achievementsContainer = document.getElementById('profile-achievements');
  achievementsContainer.innerHTML = `
    <div class="profile-achievement-card">
      <div class="profile-achievement-icon">
        <span>🔥</span>
      </div>
      <div class="profile-achievement-info">
        <div class="profile-achievement-name">Racha Perfecta</div>
        <div class="profile-achievement-desc">Acierta 5 respuestas seguidas sin errores</div>
      </div>
    </div>
    <div class="profile-achievement-card">
      <div class="profile-achievement-icon">
        <span>⚡</span>
      </div>
      <div class="profile-achievement-info">
        <div class="profile-achievement-name">Velocista</div>
        <div class="profile-achievement-desc">Completa una partida en menos de 2 minutos</div>
      </div>
    </div>
    <div class="profile-achievement-card">
      <div class="profile-achievement-icon">
        <span>🧠</span>
      </div>
      <div class="profile-achievement-info">
        <div class="profile-achievement-name">Sabelo Todo</div>
        <div class="profile-achievement-desc">Completa una partida sin usar ninguna pista</div>
      </div>
    </div>
  `;
} 