// profile.js - Funcionalidad para la página de perfil
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado - Inicializando perfil');
  
  // Detectar IP del usuario para sincronizar con los logros
  detectUserIP();
  
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

// Función para detectar la IP del usuario
async function detectUserIP() {
  try {
    // Verificar si ya tenemos la IP guardada
    const savedIP = localStorage.getItem('userIP');
    if (savedIP) {
      console.log('IP del usuario ya almacenada:', savedIP);
      return savedIP;
    }
    
    // Obtener IP usando servicio externo
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      throw new Error('No se pudo obtener la IP');
    }
    
    const data = await response.json();
    const userIP = data.ip;
    
    // Guardar IP en localStorage para uso futuro
    localStorage.setItem('userIP', userIP);
    console.log('IP del usuario detectada y guardada:', userIP);
    
    return userIP;
  } catch (error) {
    console.error('Error al detectar IP del usuario:', error);
    // Usar un valor por defecto si falla
    const defaultIP = 'unknown-ip';
    localStorage.setItem('userIP', defaultIP);
    return defaultIP;
  }
}

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
    // Obtener IP del usuario (si está disponible)
    const userIP = localStorage.getItem('userIP') || 'unknown-ip';
    const storageKey = `userAchievements_${userIP}`;
    
    // Intentar cargar los logros con la clave específica para esta IP
    const savedAchievements = localStorage.getItem(storageKey);
    
    // Si no hay logros para esta IP específica, intentar con la clave general
    if (!savedAchievements) {
      const generalAchievements = localStorage.getItem('userAchievements');
      if (!generalAchievements) return {};
      
      return processAchievementsJson(generalAchievements);
    }
    
    return processAchievementsJson(savedAchievements);
  } catch (error) {
    console.error('Error cargando logros desde localStorage:', error);
    return {};
  }
}

// Procesar el JSON de logros
function processAchievementsJson(achievementsJson) {
  if (!achievementsJson) return {};
  
  try {
    const achievementsArray = JSON.parse(achievementsJson);
    const achievementsMap = {};
    
    // Convertir array a objeto para facilitar el manejo
    achievementsArray.forEach(achievement => {
      if (achievement.unlocked) {
        achievementsMap[achievement.id] = {
          count: achievement.count || 1,
          date: achievement.date || new Date().toISOString(),
          category: achievement.category || 'beginner'
        };
      }
    });
    
    return achievementsMap;
  } catch (error) {
    console.error('Error procesando JSON de logros:', error);
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
  const container = document.querySelector('.achievements-container');
  if (!container) return;
  
  // Limpiar contenedor
  container.innerHTML = '';
  
  // Si no hay logros, mostrar mensaje
  if (!achievements || Object.keys(achievements).length === 0) {
    container.innerHTML = `
      <div class="no-achievements">
        <i class="fas fa-trophy"></i>
        <p>Aún no has desbloqueado ningún logro. ¡Juega para conseguirlos!</p>
      </div>
    `;
    return;
  }
  
  // Obtener definiciones de todos los logros disponibles
  const allAchievements = getAvailableAchievements();
  
  // Crear cards para cada logro desbloqueado
  Object.keys(achievements).forEach(id => {
    const achievementData = achievements[id];
    const achievementDefinition = allAchievements.find(a => a.id === id);
    
    if (!achievementDefinition) return; // Ignorar si no se encuentra la definición
    
    const achievementElement = createAchievementCard(
      achievementDefinition, 
      achievementData.count,
      achievementData.date,
      achievementData.category || achievementDefinition.category
    );
    
    container.appendChild(achievementElement);
  });
  
  // Agregar botón para ver todos los logros
  const footerDiv = document.createElement('div');
  footerDiv.className = 'achievements-footer';
  footerDiv.innerHTML = `
    <a href="logros.html" class="view-all-achievements">
      <i class="fas fa-trophy"></i> Ver todos los logros
    </a>
  `;
  container.insertAdjacentElement('afterend', footerDiv);
}

// Crear tarjeta de logro
function createAchievementCard(achievement, count, date, category) {
  const card = document.createElement('div');
  card.className = 'achievement-item';
  card.setAttribute('data-category', category);
  
  // Calcular progreso
  const progress = achievement.maxCount > 1 
    ? Math.min(100, (count / achievement.maxCount) * 100) 
    : 100;
  
  // Formatear fecha
  const achievementDate = formatAchievementDate(date);
  
  // Obtener texto para la categoría
  const categoryText = getCategoryText(category);
  
  card.innerHTML = `
    <div class="achievement-header">
      <div class="achievement-icon">
        <i class="${achievement.icon}"></i>
      </div>
      <div class="achievement-title-wrapper">
        <h4 class="achievement-title">${achievement.title}</h4>
        <span class="achievement-category ${category}">${categoryText}</span>
      </div>
    </div>
    <div class="achievement-body">
      <div class="achievement-description">${achievement.description}</div>
      <div class="achievement-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${achievement.maxCount > 1 ? `${count}/${achievement.maxCount}` : 'Completado'}</span>
          <span class="progress-date">${progress}%</span>
        </div>
      </div>
    </div>
    <div class="achievement-footer">
      <div class="achievement-date">
        <i class="fas fa-calendar-check"></i>
        <span>Desbloqueado: ${achievementDate}</span>
      </div>
    </div>
  `;
  
  // Animar la barra de progreso
  setTimeout(() => {
    const progressBar = card.querySelector('.progress-fill');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }, 100);
  
  return card;
}

// Formatear fecha para logros
function formatAchievementDate(dateString) {
  if (!dateString) return 'Desconocido';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return 'Fecha inválida';
  }
}

// Obtener texto descriptivo de categoría
function getCategoryText(category) {
  switch (category) {
    case 'beginner': return 'Principiante';
    case 'intermediate': return 'Intermedio';
    case 'expert': return 'Experto';
    case 'special': return 'Especial';
    default: return 'Desconocido';
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