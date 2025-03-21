// profile.js - Funcionalidad para la página de perfil
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado - Inicializando perfil');
  
  // Obtener username de localStorage
  const username = localStorage.getItem('username') || 'Jugador';
  document.getElementById('profile-username').textContent = username;
  
  // Cargar estadísticas del jugador por IP
  fetchPlayerProfile();
  
  // Event Listeners para botones
  document.getElementById('back-to-game').addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  document.getElementById('view-ranking').addEventListener('click', function() {
    window.location.href = 'ranking.html';
  });
});

// Función para obtener el perfil de usuario basado en IP
async function fetchPlayerProfile() {
  try {
    console.log('Obteniendo perfil del jugador...');
    
    // Obtener datos del perfil desde el servidor usando la IP actual
    const response = await fetch('/api/profile');
    
    if (!response.ok) {
      throw new Error('Error al obtener perfil');
    }
    
    const profileData = await response.json();
    
    if (!profileData) {
      console.log('No se encontró perfil para este usuario');
      displayProfileError('No tienes un perfil. ¡Juega tu primera partida!');
      return;
    }
    
    console.log('Perfil cargado:', profileData);
    
    // Actualizar el contenido de la página con los datos reales
    updateProfileDisplay(profileData);
    
  } catch (error) {
    console.error('Error cargando perfil:', error);
    // Mostrar mensaje de error o crear un perfil vacío
    displayProfileError('Error al cargar el perfil: ' + error.message);
  }
}

// Actualizar la interfaz con los datos del perfil
function updateProfileDisplay(profile) {
  // Actualizar username si está definido en el perfil
  if (profile.name) {
    document.getElementById('profile-username').textContent = profile.name;
    // Actualizar en localStorage para consistencia
    localStorage.setItem('username', profile.name);
  }
  
  // Actualizar estadísticas básicas
  document.getElementById('games-played').textContent = profile.gamesPlayed || 0;
  document.getElementById('correct-answers').textContent = profile.totalCorrect || 0;
  document.getElementById('wrong-answers').textContent = profile.totalWrong || 0;
  
  // Calcular mejor puntuación del historial
  let bestScore = 0;
  if (profile.history && profile.history.length > 0) {
    bestScore = Math.max(...profile.history.map(game => game.score || 0));
  }
  document.getElementById('best-score').textContent = bestScore;
  
  // Calcular tiempo promedio
  const avgTime = profile.totalTime && profile.gamesPlayed ? 
    Math.round(profile.totalTime / profile.gamesPlayed) : 0;
  document.getElementById('avg-time').textContent = formatTime(avgTime);
  
  // Actualizar posición en el ranking (debe ser calculado por el servidor)
  fetchPlayerRankingPosition(profile.name);
  
  // Actualizar estado del jugador basado en estadísticas
  updatePlayerStatus(profile);
  
  // Actualizar logros
  updateAchievementsDisplay(profile.achievements);
  
  // Actualizar historial de partidas si existe
  if (profile.history && profile.history.length > 0) {
    updateGameHistory(profile.history);
  }
}

// Función para obtener y mostrar la posición en el ranking
async function fetchPlayerRankingPosition(playerName) {
  try {
    if (!playerName) return;
    
    const response = await fetch('/api/ranking');
    if (!response.ok) {
      throw new Error('No se pudo cargar el ranking');
    }
    
    const ranking = await response.json();
    const playerIndex = ranking.findIndex(entry => entry.name === playerName);
    
    if (playerIndex !== -1) {
      const position = playerIndex + 1;
      document.getElementById('ranking-position').textContent = position;
      
      // Ajustar el estado del jugador basado en su posición
      const rankBadge = document.getElementById('rank-badge');
      if (rankBadge) {
        if (position <= 3) {
          rankBadge.className = 'rank-badge elite';
          rankBadge.innerHTML = '<i class="fas fa-trophy"></i>';
        } else if (position <= 10) {
          rankBadge.className = 'rank-badge advanced';
          rankBadge.innerHTML = '<i class="fas fa-medal"></i>';
        } else {
          rankBadge.className = 'rank-badge beginner';
          rankBadge.innerHTML = '<i class="fas fa-star"></i>';
        }
      }
    } else {
      document.getElementById('ranking-position').textContent = '-';
    }
  } catch (error) {
    console.error('Error al obtener posición en el ranking:', error);
    document.getElementById('ranking-position').textContent = '-';
  }
}

// Mostrar mensaje de error cuando no se puede cargar el perfil
function displayProfileError(message = 'No se pudo cargar el perfil') {
  // Mostrar mensaje de error
  const statsContainer = document.querySelector('.profile-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="profile-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button class="btn primary" onclick="window.location.href='index.html'">
          <i class="fas fa-gamepad"></i> Jugar ahora
        </button>
      </div>
    `;
  }
  
  // Ocultar sección de logros o mostrar mensaje
  const achievementsContainer = document.querySelector('.achievements-container');
  if (achievementsContainer) {
    achievementsContainer.innerHTML = '<p class="no-achievements">Juega tu primera partida para desbloquear logros</p>';
  }
}

// Actualizar la visualización de logros
function updateAchievementsDisplay(achievements) {
  const achievementsContainer = document.querySelector('.achievements-container');
  if (!achievementsContainer) return;
  
  // Si no hay logros o el objeto está vacío
  if (!achievements || Object.keys(achievements).length === 0) {
    achievementsContainer.innerHTML = '<p class="no-achievements">Aún no has desbloqueado logros</p>';
    return;
  }
  
  // Limpiar contenedor
  achievementsContainer.innerHTML = '';
  
  // Obtener logros disponibles (deberían venir del servidor o estar definidos globalmente)
  const availableAchievements = getAvailableAchievements();
  
  // Crear elementos para cada logro obtenido
  Object.keys(achievements).forEach(achId => {
    const achData = availableAchievements.find(a => a.id === achId) || {
      id: achId,
      name: 'Logro desconocido',
      description: 'Descripción no disponible',
      icon: 'fa-question-circle'
    };
    
    const timesEarned = achievements[achId];
    
    const achievementElement = document.createElement('div');
    achievementElement.className = 'achievement-item';
    achievementElement.innerHTML = `
      <div class="achievement-icon">
        <i class="fas ${achData.icon || 'fa-trophy'}"></i>
      </div>
      <div class="achievement-details">
        <h3>${achData.name}</h3>
        <p>${achData.description}</p>
        <span class="times-earned">Obtenido ${timesEarned} ${timesEarned === 1 ? 'vez' : 'veces'}</span>
      </div>
    `;
    
    achievementsContainer.appendChild(achievementElement);
  });
}

// Actualizar historial de partidas
function updateGameHistory(history) {
  const historyContainer = document.querySelector('.game-history-container');
  if (!historyContainer) return;
  
  // Limpiar contenedor
  historyContainer.innerHTML = '';
  
  // Crear elementos para cada partida
  history.forEach((game, index) => {
    const gameDate = new Date(game.date);
    const formattedDate = gameDate.toLocaleDateString() + ' ' + gameDate.toLocaleTimeString();
    
    const gameElement = document.createElement('div');
    gameElement.className = `game-entry ${game.victory ? 'victory' : 'defeat'}`;
    gameElement.innerHTML = `
      <div class="game-date">${formattedDate}</div>
      <div class="game-result">
        <span class="result-badge ${game.victory ? 'win' : 'loss'}">
          ${game.victory ? '<i class="fas fa-trophy"></i> Victoria' : '<i class="fas fa-times"></i> Derrota'}
        </span>
      </div>
      <div class="game-difficulty">${formatDifficulty(game.difficulty)}</div>
      <div class="game-score">${game.score} pts</div>
      <div class="game-stats">
        <span><i class="fas fa-check"></i> ${game.correct}</span>
        <span><i class="fas fa-times"></i> ${game.wrong}</span>
        <span><i class="fas fa-clock"></i> ${formatTime(game.timeUsed)}</span>
      </div>
    `;
    
    historyContainer.appendChild(gameElement);
  });
}

// Función auxiliar para formatear tiempo
function formatTime(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Formatear nivel de dificultad
function formatDifficulty(difficulty) {
  switch (difficulty) {
    case 'facil': return 'Fácil';
    case 'normal': return 'Normal';
    case 'dificil': return 'Difícil';
    default: return difficulty;
  }
}

// Actualizar estado del jugador
function updatePlayerStatus(profile) {
  const statusElement = document.getElementById('profile-status');
  if (!statusElement) return;
  
  // Determinar estado basado en estadísticas
  let status = 'Jugador Novato';
  let statusIcon = 'fa-user';
  
  if (!profile.gamesPlayed || profile.gamesPlayed < 5) {
    status = 'Jugador Novato';
    statusIcon = 'fa-user';
  } else if (profile.gamesPlayed >= 20) {
    status = 'Jugador Veterano';
    statusIcon = 'fa-user-graduate';
  } else if (profile.totalCorrect >= 100) {
    status = 'Maestro del Rosco';
    statusIcon = 'fa-crown';
  } else if (profile.gamesPlayed >= 10) {
    status = 'Jugador Regular';
    statusIcon = 'fa-user-check';
  }
  
  statusElement.innerHTML = `<i class="fas ${statusIcon}"></i> ${status}`;
}

// Obtener lista de logros disponibles
function getAvailableAchievements() {
  // Esta lista debería venir del servidor, pero por ahora la definimos aquí
  return [
    {
      id: 'first_win',
      name: 'Primera Victoria',
      description: 'Completa tu primer rosco exitosamente',
      icon: 'fa-trophy'
    },
    {
      id: 'perfect_game',
      name: 'Partida Perfecta',
      description: 'Completa un rosco sin cometer ningún error',
      icon: 'fa-award'
    },
    {
      id: 'speed_demon',
      name: 'Velocista',
      description: 'Completa un rosco en menos de 2 minutos',
      icon: 'fa-bolt'
    },
    {
      id: 'five_wins',
      name: 'Experto del Rosco',
      description: 'Gana 5 partidas',
      icon: 'fa-medal'
    },
    {
      id: 'hard_win',
      name: 'Reto Superado',
      description: 'Gana una partida en dificultad difícil',
      icon: 'fa-mountain'
    }
  ];
} 