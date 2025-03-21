// profile.js - Funcionalidad para la página de perfil
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado - Inicializando perfil');
  
  // Obtener username de localStorage
  const username = localStorage.getItem('username') || 'Jugador';
  document.getElementById('profile-username').textContent = username;
  
  // Cargar estadísticas del jugador
  loadUserProfile();
  
  // Event Listeners para botones
  document.getElementById('back-to-game').addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  document.getElementById('view-ranking').addEventListener('click', function() {
    window.location.href = 'ranking.html';
  });
});

// Cargar perfil del usuario desde localStorage y/o servidor
async function loadUserProfile() {
  try {
    console.log('Obteniendo perfil del jugador...');
    
    // Intentar cargar desde localStorage primero
    let profileData = loadProfileFromLocalStorage();
    
    // Si no hay datos en localStorage, intentar obtener desde el servidor
    if (!profileData) {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          profileData = await response.json();
        }
      } catch (serverError) {
        console.log('No se pudo conectar con el servidor:', serverError);
      }
    }
    
    if (!profileData) {
      console.log('No se encontró perfil para este usuario');
      displayProfileError('No tienes un perfil. ¡Juega tu primera partida!');
      
      // Intentar cargar solo los logros si están disponibles
      const achievements = loadAchievementsFromLocalStorage();
      if (achievements && Object.keys(achievements).length > 0) {
        updateAchievementsDisplay(achievements);
      }
      
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

// Cargar perfil desde localStorage
function loadProfileFromLocalStorage() {
  try {
    // Datos básicos
    const username = localStorage.getItem('username');
    const lastGameStats = localStorage.getItem('lastGameStats');
    const achievements = loadAchievementsFromLocalStorage();
    
    if (!username && !lastGameStats && (!achievements || Object.keys(achievements).length === 0)) {
      return null;
    }
    
    // Construir objeto de perfil
    const profile = {
      name: username || 'Jugador',
      gamesPlayed: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalTime: 0,
      bestScore: 0,
      history: [],
      achievements: achievements || {}
    };
    
    // Obtener historial de partidas si existe
    const gameHistory = localStorage.getItem('gameHistory');
    if (gameHistory) {
      try {
        profile.history = JSON.parse(gameHistory);
        
        // Calcular estadísticas totales del historial
        profile.gamesPlayed = profile.history.length;
        
        profile.history.forEach(game => {
          profile.totalCorrect += game.correct || 0;
          profile.totalWrong += game.wrong || 0;
          profile.totalTime += game.timeUsed || 0;
          
          // Actualizar mejor puntuación
          if (game.score > profile.bestScore) {
            profile.bestScore = game.score;
          }
        });
      } catch (e) {
        console.error('Error al parsear historial:', e);
      }
    }
    
    return profile;
  } catch (error) {
    console.error('Error cargando perfil desde localStorage:', error);
    return null;
  }
}

// Cargar logros desde localStorage
function loadAchievementsFromLocalStorage() {
  try {
    const savedAchievements = localStorage.getItem('userAchievements');
    if (!savedAchievements) return {};
    
    const achievementsArray = JSON.parse(savedAchievements);
    const achievementsMap = {};
    
    // Convertir array a objeto para facilitar el manejo
    achievementsArray.forEach(achievement => {
      if (achievement.unlocked) {
        achievementsMap[achievement.id] = achievement.count || 1;
      }
    });
    
    return achievementsMap;
  } catch (error) {
    console.error('Error cargando logros desde localStorage:', error);
    return {};
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
  
  // Mostrar mejor puntuación
  document.getElementById('best-score').textContent = profile.bestScore || 0;
  
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

// Mostrar mensaje de error en perfil
function displayProfileError(message = 'No se pudo cargar el perfil') {
  // Ocultar secciones de estadísticas
  const statsContainers = document.querySelectorAll('.stats-container, .game-history-container');
  statsContainers.forEach(container => {
    if (container) container.style.display = 'none';
  });
  
  // Mostrar mensaje de error
  const profileContent = document.querySelector('.profile-content');
  if (profileContent) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'profile-error';
    errorMsg.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
      <button class="profile-btn primary" id="try-game-btn">
        <i class="fas fa-gamepad"></i>
        Jugar ahora
      </button>
    `;
    
    // Insertar antes del primer div de sección
    const firstSection = profileContent.querySelector('.profile-section');
    if (firstSection) {
      profileContent.insertBefore(errorMsg, firstSection);
    } else {
      profileContent.appendChild(errorMsg);
    }
    
    // Agregar evento al botón
    document.getElementById('try-game-btn').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
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
  
  // Obtener logros disponibles
  const availableAchievements = getAvailableAchievements();
  
  // Crear elementos para cada logro obtenido
  let displayedCount = 0;
  const maxDisplayed = 3; // Límite de logros a mostrar en el perfil
  
  Object.keys(achievements).sort((a, b) => {
    // Ordenar por fecha si está disponible, de lo contrario por número de veces conseguido
    const achA = availableAchievements.find(x => x.id === a);
    const achB = availableAchievements.find(x => x.id === b);
    
    // Si no se encuentra el logro en la lista, colocarlo al final
    if (!achA) return 1;
    if (!achB) return -1;
    
    // Priorizar logros por categoría: expert > intermediate > beginner
    const categoryOrder = { expert: 1, intermediate: 2, beginner: 3, special: 4 };
    const catA = categoryOrder[achA.category] || 5;
    const catB = categoryOrder[achB.category] || 5;
    
    if (catA !== catB) return catA - catB;
    
    // Si misma categoría, ordenar por veces conseguido
    return achievements[b] - achievements[a];
  }).forEach(achId => {
    if (displayedCount >= maxDisplayed) return;
    
    const achData = availableAchievements.find(a => a.id === achId) || {
      id: achId,
      name: 'Logro desconocido',
      description: 'Descripción no disponible',
      icon: 'fa-question-circle',
      category: 'unknown'
    };
    
    const timesEarned = achievements[achId];
    
    const achievementElement = document.createElement('div');
    achievementElement.className = 'achievement-item';
    
    // Agregar clase según categoría para estilizado adicional
    if (achData.category) {
      achievementElement.classList.add(`category-${achData.category}`);
    }
    
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
    displayedCount++;
  });
  
  // Si hay más logros de los mostrados, agregar indicador
  const totalLogros = Object.keys(achievements).length;
  if (totalLogros > maxDisplayed) {
    const moreAchievements = document.createElement('div');
    moreAchievements.className = 'more-achievements';
    moreAchievements.innerHTML = `
      <p>Y ${totalLogros - maxDisplayed} logro${totalLogros - maxDisplayed !== 1 ? 's' : ''} más...</p>
    `;
    achievementsContainer.appendChild(moreAchievements);
  }
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
  
  // Determinar estado basado en estadísticas y logros
  let status = 'Jugador Novato';
  let statusIcon = 'fa-user';
  
  const gamesPlayed = profile.gamesPlayed || 0;
  const correctAnswers = profile.totalCorrect || 0;
  const achievements = profile.achievements || {};
  const achievementCount = Object.keys(achievements).length;
  
  // Verificar si tiene logros de dificultad experto
  const expertAchievements = getAvailableAchievements()
    .filter(a => a.category === 'expert' && achievements[a.id]);
  
  if (expertAchievements.length >= 3) {
    status = 'Maestro del Rosco';
    statusIcon = 'fa-crown';
  } else if (gamesPlayed >= 20 || correctAnswers >= 200) {
    status = 'Jugador Veterano';
    statusIcon = 'fa-user-graduate';
  } else if (achievementCount >= 5 || correctAnswers >= 100) {
    status = 'Jugador Experto';
    statusIcon = 'fa-star';
  } else if (gamesPlayed >= 10 || correctAnswers >= 50) {
    status = 'Jugador Regular';
    statusIcon = 'fa-user-check';
  }
  
  statusElement.innerHTML = `<i class="fas ${statusIcon}"></i> ${status}`;
}

// Obtener lista de logros disponibles
function getAvailableAchievements() {
  // Lista completa de logros disponibles en el juego
  return [
    {
      id: 'first_game',
      name: 'Primer Juego',
      description: 'Completa tu primer rosco de PASALA CHÉ',
      icon: 'fa-gamepad',
      category: 'beginner'
    },
    {
      id: 'perfect_game',
      name: 'Partida Perfecta',
      description: 'Completa un rosco sin cometer ningún error',
      icon: 'fa-award',
      category: 'expert'
    },
    {
      id: 'speed_demon',
      name: 'Velocista',
      description: 'Completa un rosco en menos de 2 minutos',
      icon: 'fa-bolt',
      category: 'expert'
    },
    {
      id: 'five_wins',
      name: 'Experto del Rosco',
      description: 'Gana 5 partidas',
      icon: 'fa-medal',
      category: 'intermediate'
    },
    {
      id: 'hard_mode',
      name: 'Nivel Experto',
      description: 'Gana una partida en dificultad difícil',
      icon: 'fa-fire',
      category: 'expert'
    },
    {
      id: 'no_help',
      name: 'Sin Ayuda',
      description: 'Completa el rosco sin usar ninguna pista',
      icon: 'fa-brain',
      category: 'intermediate'
    },
    {
      id: 'no_pass',
      name: 'Directo al Grano',
      description: 'Completa el rosco sin saltar ninguna pregunta',
      icon: 'fa-check-double',
      category: 'expert'
    },
    {
      id: 'comeback_king',
      name: 'Rey de la Remontada',
      description: 'Gana después de tener 5 respuestas incorrectas',
      icon: 'fa-crown',
      category: 'special'
    },
    {
      id: 'night_owl',
      name: 'Búho Nocturno',
      description: 'Juega una partida después de medianoche',
      icon: 'fa-moon',
      category: 'special'
    },
    {
      id: 'challenge_accepted',
      name: 'Desafío Aceptado',
      description: 'Completa un desafío diario',
      icon: 'fa-flag',
      category: 'special'
    }
  ];
} 