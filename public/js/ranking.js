// ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM cargado - Inicializando ranking');
  
  // Obtener el perfil del jugador y el ranking
  await loadPlayerProfile();
  await loadRanking();
  
  // Verificar si venimos de finalizar una partida
  const urlParams = new URLSearchParams(window.location.search);
  const fromGame = urlParams.get('fromGame');
  if (fromGame === 'true') {
    showGameCompletionMessage();
  }
  
  // Configurar los botones
  document.getElementById('back-to-game').addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  document.getElementById('view-profile').addEventListener('click', function() {
    window.location.href = 'profile.html';
  });
});

// Obtener el perfil del jugador basado en su IP
async function loadPlayerProfile() {
  try {
    console.log('Cargando perfil del jugador...');
    const response = await fetch('/api/profile');
    if (!response.ok) {
      throw new Error('No se pudo cargar el perfil del jugador');
    }
    
    const profileData = await response.json();
    if (profileData && profileData.name) {
      console.log('Perfil cargado:', profileData.name);
      // Guardar nombre del jugador en localStorage para uso global
      localStorage.setItem('username', profileData.name);
      localStorage.setItem('playerRankingData', JSON.stringify({
        name: profileData.name,
        totalScore: profileData.totalScore || 0,
        gamesPlayed: profileData.gamesPlayed || 0
      }));
    } else {
      console.log('No se encontró perfil para este usuario');
    }
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
  }
}

async function loadRanking() {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-table tbody'");
    return;
  }
  
  try {
    console.log('Cargando ranking...');
    // Obtener nombre del jugador actual para destacarlo
    const currentPlayer = localStorage.getItem('username');
    
    // Obtener datos del ranking desde el servidor
    const res = await fetch("/api/ranking");
    if (!res.ok) throw new Error(`Respuesta HTTP no válida: ${res.status}`);
    const rankingData = await res.json();
    
    // Limpiar contenido anterior
    rankingTableBody.innerHTML = '';
    
    // Mostrar estado de carga
    rankingTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">
          <i class="fas fa-spinner fa-spin"></i> Cargando ranking...
        </td>
      </tr>`;
    
    if (rankingData.length === 0) {
      // Si no hay datos, mostrar mensaje
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="7" class="no-data">
          No hay datos de ranking disponibles. ¡Sé el primero en jugar!
        </td>
      `;
      rankingTableBody.appendChild(emptyRow);
      return;
    }
    
    // Ordenar por puntaje (score) de mayor a menor
    rankingData.sort((a, b) => b.score - a.score);
    
    // Variable para rastrear si el jugador actual está en la tabla
    let currentPlayerPosition = -1;
    
    rankingData.forEach((item, index) => {
      const position = index + 1;
      const tr = document.createElement("tr");
      
      // Determinar si es el jugador actual
      const isCurrentPlayer = currentPlayer && item.name === currentPlayer;
      if (isCurrentPlayer) {
        tr.classList.add('current-player');
        currentPlayerPosition = position;
      }
      
      // Determinar clase para posición
      let positionClass = '';
      if (position === 1) positionClass = 'gold';
      else if (position === 2) positionClass = 'silver';
      else if (position === 3) positionClass = 'bronze';
      
      // Formatear fecha
      const date = item.date ? new Date(item.date).toLocaleDateString() : '-';
      
      // Formatear tiempo en minutos:segundos
      let timeFormatted = '-';
      if (item.time) {
        const minutes = Math.floor(item.time / 60);
        const seconds = item.time % 60;
        timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      tr.innerHTML = `
        <td class="position ${positionClass}">${position}</td>
        <td>${item.name || "Anónimo"}</td>
        <td>${item.score || 0}</td>
        <td>${item.correct || 0}</td>
        <td>${item.wrong || 0}</td>
        <td>${timeFormatted}</td>
        <td>${formatDifficulty(item.difficulty) || "-"}</td>
      `;
      rankingTableBody.appendChild(tr);
    });
    
    // Si el jugador actual no está en el ranking visible, mostrar mensaje
    if (currentPlayer && currentPlayerPosition === -1) {
      const playerNotInRankingMessage = document.querySelector('.player-position');
      if (playerNotInRankingMessage) {
        playerNotInRankingMessage.innerHTML = `
          <i class="fas fa-info-circle"></i>
          No estás entre los mejores jugadores del ranking. ¡Sigue intentándolo!
        `;
        playerNotInRankingMessage.style.display = 'block';
      }
    } else if (currentPlayerPosition > 0) {
      // Si el jugador está en el ranking, mostrar su posición
      const playerPositionMessage = document.querySelector('.player-position');
      if (playerPositionMessage) {
        playerPositionMessage.innerHTML = `
          <i class="fas fa-trophy"></i>
          Tu posición actual en el ranking: <strong>${currentPlayerPosition}</strong>
        `;
        playerPositionMessage.style.display = 'block';
      }
    }
    
    console.log('Ranking cargado correctamente');
  } catch (err) {
    console.error("Error al leer ranking global:", err);
    rankingTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">Error al cargar el ranking. Intenta recargar la página.</td>
      </tr>`;
  }
}

// Mostrar mensaje si el jugador viene de completar una partida
function showGameCompletionMessage() {
  const messageContainer = document.querySelector('.game-completion-message');
  if (messageContainer) {
    const position = localStorage.getItem('playerRankingPosition');
    
    if (position) {
      messageContainer.innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <p>¡Partida completada! Tu posición en el ranking es: <strong>${position}</strong></p>
        </div>
      `;
    } else {
      messageContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <p>¡Partida completada! Tus estadísticas han sido actualizadas.</p>
        </div>
      `;
    }
    
    messageContainer.style.display = 'block';
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
      messageContainer.style.display = 'none';
    }, 5000);
  }
}

// Función para formatear la dificultad
function formatDifficulty(difficulty) {
  switch(difficulty) {
    case 'facil':
      return 'Fácil';
    case 'normal':
      return 'Normal';
    case 'dificil':
      return 'Difícil';
    default:
      return difficulty || '-';
  }
}
