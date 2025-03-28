// ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM cargado - Inicializando ranking');
  
  // Obtener el nombre de usuario guardado
  const username = getUsernameFromStorage();
  console.log('Usuario detectado:', username || 'Anónimo');
  
  // Verificar si venimos de finalizar una partida
  const urlParams = new URLSearchParams(window.location.search);
  const fromGame = urlParams.get('fromGame');
  
  // Si venimos de una partida, forzar recarga del ranking
  if (fromGame === 'true') {
    await loadRanking(true); // Forzar recarga al venir de partida
    showGameCompletionMessage();
  } else {
    // Generar datos de prueba si no hay datos en localStorage
    const hasRankingData = checkForRankingData();
    if (!hasRankingData) {
      console.log('No se encontraron datos de ranking, generando datos de prueba...');
      generateTestData();
    }
    
    // Forzamos la recarga para tener siempre datos actualizados
    await loadRanking(true); // Forzar recarga siempre
  }
  
  // Configurar los botones de períodos
  setupPeriodButtons();
  
  // Configurar el buscador de jugadores
  setupPlayerSearch();
  
  // Configurar los botones de navegación
  setupNavigationButtons();
});

// Verificar si hay datos de ranking en localStorage
function checkForRankingData() {
  const keys = Object.keys(localStorage);
  return keys.some(key => key.startsWith('gameHistory_'));
}

// Generar datos de prueba para el ranking
function generateTestData() {
  // Nombres de ejemplo para jugadores
  const nombres = [
    'Carlos', 'Ana', 'Javier', 'María', 'Pedro', 'Laura', 'Miguel', 'Sofía', 
    'Antonio', 'Elena', 'David', 'Lucía', 'Jorge', 'Carmen', 'Alberto', 'Marta',
    'Francisco', 'Isabel', 'José', 'Cristina', 'Manuel', 'Natalia', 'Raúl', 'Paula',
    'Fernando', 'Sandra', 'Álvaro', 'Silvia', 'Sergio', 'Beatriz', 'Pablo', 'Eva',
    'Diego', 'Adriana', 'Enrique', 'Alicia', 'Andrés', 'Lorena', 'Óscar', 'Patricia'
  ];
  
  // Niveles de dificultad disponibles
  const dificultades = ['facil', 'normal', 'dificil'];
  
  // Generar entre 50 y 100 jugadores aleatorios
  const numJugadores = Math.floor(Math.random() * 50) + 50;
  
  // Para cada jugador, generar un historial de juegos
  for (let i = 0; i < numJugadores; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    const historialKey = `gameHistory_${ip}`;
    
    // Crear historial para este jugador
    const historial = [];
    
    // Generar entre 1 y 5 partidas para este jugador
    const numPartidas = Math.floor(Math.random() * 5) + 1;
    
    for (let j = 0; j < numPartidas; j++) {
      // Fecha aleatoria en los últimos 30 días
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      // Datos aleatorios de la partida
      const dificultad = dificultades[Math.floor(Math.random() * dificultades.length)];
      const correctas = Math.floor(Math.random() * 27);
      const incorrectas = Math.floor(Math.random() * (27 - correctas));
      const pendientes = 27 - correctas - incorrectas;
      const score = calculateScore(correctas, incorrectas, dificultad);
      
      // Añadir partida al historial
      historial.push({
        name: nombre,
        date: date.toISOString(),
        difficulty: dificultad,
        correct: correctas,
        wrong: incorrectas,
        pending: pendientes,
        score: score,
        victory: correctas === 27
      });
    }
    
    // Guardar historial en localStorage
    localStorage.setItem(historialKey, JSON.stringify(historial));
    
    // También guardar el perfil para este jugador
    const profileKey = `profile_${ip}`;
    const profile = {
      name: nombre,
      avatar: null,
      joined: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      totalGames: numPartidas,
      victories: Math.floor(Math.random() * numPartidas),
      bestScore: Math.max(...historial.map(game => game.score)),
    };
    
    localStorage.setItem(profileKey, JSON.stringify(profile));
  }
  
  // Asignar un nombre de usuario para el usuario actual
  const currentUsername = nombres[Math.floor(Math.random() * nombres.length)];
  localStorage.setItem('username', currentUsername);
  
  console.log(`Datos de prueba generados: ${numJugadores} jugadores con un total de partidas.`);
}

// Calcular puntuación en base a respuestas correctas, incorrectas y dificultad
function calculateScore(correctas, incorrectas, dificultad) {
  let multiplicador = 1;
  switch (dificultad) {
    case 'facil': multiplicador = 0.8; break;
    case 'normal': multiplicador = 1; break;
    case 'dificil': multiplicador = 1.5; break;
  }
  
  // Fórmula básica: 100 puntos por correcta, -50 por incorrecta, ajustado por dificultad
  const puntuacionBase = (correctas * 100) - (incorrectas * 50);
  return Math.max(0, Math.round(puntuacionBase * multiplicador));
}

// Configurar el buscador de jugadores
function setupPlayerSearch() {
  const searchInput = document.getElementById('player-search');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      filterRankingTable(searchTerm);
    });
  }
}

// Filtrar tabla de ranking según el término de búsqueda
function filterRankingTable(searchTerm) {
  const tableRows = document.querySelectorAll('#ranking-body tr');
  let visibleRows = 0;
  
  tableRows.forEach(row => {
    const playerName = row.querySelector('.username')?.textContent.toLowerCase() || '';
    if (playerName.includes(searchTerm) || searchTerm === '') {
      row.style.display = '';
      visibleRows++;
    } else {
      row.style.display = 'none';
    }
  });
  
  // Mostrar mensaje si no hay resultados visibles
  const noResults = document.getElementById('no-results');
  if (noResults) {
    if (visibleRows === 0 && searchTerm !== '') {
      noResults.style.display = 'flex';
      noResults.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>No se encontraron jugadores</h3>
        <p>No hay jugadores que coincidan con "${searchTerm}"</p>
      `;
    } else {
      noResults.style.display = 'none';
    }
  }
}

// Obtener nombre de usuario desde localStorage
function getUsernameFromStorage() {
  // Intentar obtener del localStorage
  const username = localStorage.getItem('username');
  
  // Si no existe en localStorage, verificar si hay un nombre guardado con la IP
  if (!username) {
    const userIP = localStorage.getItem('userIP');
    if (userIP) {
      try {
        // Intentar obtener perfil guardado para esta IP
        const profileKey = `profile_${userIP}`;
        const profileData = localStorage.getItem(profileKey);
        
        if (profileData) {
          const profile = JSON.parse(profileData);
          if (profile && profile.name) {
            return profile.name;
          }
        }
      } catch (error) {
        console.error('Error al obtener nombre desde perfil:', error);
      }
    }
    return null;
  }
  
  return username;
}

// Configurar botones de navegación
function setupNavigationButtons() {
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', function() {
      if (localStorage.getItem('hasPlayed') === 'true') {
        window.location.href = 'game.html';
      } else {
        window.location.href = 'index.html';
      }
    });
  }
  
  const viewProfileButton = document.getElementById('view-profile');
  if (viewProfileButton) {
    viewProfileButton.addEventListener('click', function() {
      window.location.href = 'profile.html';
    });
  }
}

// Configurar botones de período
function setupPeriodButtons() {
  const periodButtons = document.querySelectorAll('.period-selector button');
  if (periodButtons.length === 0) return;
  
  periodButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Eliminar clase active de todos los botones
      periodButtons.forEach(b => b.classList.remove('active'));
      
      // Añadir clase active al botón clickeado
      this.classList.add('active');
      
      // Obtener período seleccionado
      const period = this.getAttribute('data-period');
      
      // Cargar datos según el período
      loadRanking(true, period);
    });
  });
}

// Obtener datos del ranking desde el localStorage (actuando como base de datos global)
async function getRankingDataFromStorage(period = 'global') {
  try {
    // Limpiar la cache local del navegador para forzar lectura de datos actualizados
    localStorage.removeItem('rankingDataCache');
    
    // Cargamos todos los historiales de juego guardados en localStorage
    let rankingData = [];
    const keys = Object.keys(localStorage);
    
    // Obtener rangos de fecha según el período
    const dateRange = getPeriodDateRange(period);
    
    // Obtener todos los registros que comienzan con "gameHistory_"
    for (const key of keys) {
      if (key.startsWith('gameHistory_')) {
        try {
          const history = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(history)) {
            // Filtrar partidas según el período seleccionado
            const filteredHistory = history.filter(game => {
              if (!dateRange) return true; // Si no hay filtro, incluir todas
              
              const gameDate = game.date ? new Date(game.date) : null;
              if (!gameDate) return false;
              
              return gameDate >= dateRange.start && gameDate <= dateRange.end;
            });
            
            // Añadir cada partida como una entrada en el ranking
            filteredHistory.forEach(game => {
              if (game.name) { // Usar el nombre guardado en la partida
                rankingData.push({
                  name: game.name,
                  score: game.score || 0,
                  correct: game.correct || 0,
                  wrong: game.wrong || 0,
                  difficulty: game.difficulty || 'normal',
                  date: game.date
                });
              }
            });
          }
        } catch (e) {
          console.error(`Error al procesar clave ${key}:`, e);
        }
      }
    }
    
    console.log(`Datos de ranking obtenidos: ${rankingData.length} registros para período ${period}`);
    return rankingData;
  } catch (error) {
    console.error('Error al obtener datos del ranking:', error);
    return [];
  }
}

// Obtener rango de fechas para el período seleccionado
function getPeriodDateRange(period) {
  if (period === 'global') return null; // Sin límite de fecha
  
  const now = new Date();
  const start = new Date();
  
  if (period === 'monthly') {
    // Primer día del mes actual
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    // Primer día de la semana actual (lunes)
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que la semana comience el lunes
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
  }
  
  return {
    start: start,
    end: now
  };
}

// Actualizar estadísticas globales mostradas en la página
function updateGlobalStats(rankingData) {
  // Actualizar jugadores totales (nombres únicos)
  const uniquePlayers = new Set(rankingData.map(item => item.name)).size;
  const totalGames = rankingData.length;
  
  // Calcular tasa de aciertos total
  let totalCorrect = 0;
  let totalQuestions = 0;
  
  rankingData.forEach(item => {
    totalCorrect += item.correct || 0;
    totalQuestions += (item.correct || 0) + (item.wrong || 0);
  });
  
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  // Actualizar valores en la UI
  document.getElementById('total-players').textContent = uniquePlayers;
  document.getElementById('total-games').textContent = totalGames;
  document.getElementById('success-rate').textContent = `${successRate}%`;
}

// Actualizar visualización de posición del jugador
function updatePlayerPositionDisplay(position, playerName) {
  const playerPositionNote = document.getElementById('player-position-note');
  const playerPositionText = document.getElementById('player-position-text');
  
  if (playerPositionNote && playerPositionText) {
    if (playerName && position > 0) {
      // Si el jugador está en el ranking, mostrar su posición
      playerPositionText.innerHTML = `
        Estás en la posición <strong>${position}</strong> de ${document.querySelectorAll('#ranking-body tr').length} jugadores
      `;
      playerPositionNote.style.display = 'flex';
      playerPositionNote.className = position <= 3 ? 
        'player-position-info top-position' : 
        'player-position-info';
    } else if (playerName) {
      // Si el jugador no está en el ranking visible, mostrar mensaje
      playerPositionText.innerHTML = `
        No estás entre los mejores jugadores del ranking. ¡Sigue intentándolo!
      `;
      playerPositionNote.style.display = 'flex';
      playerPositionNote.className = 'player-position-info not-in-ranking';
    } else {
      playerPositionNote.style.display = 'none';
    }
  }
}

// Función para configurar la paginación
function setupPagination(totalItems, itemsPerPage = 20) {
  const container = document.getElementById('ranking-pagination');
  if (!container) return;
  
  // Limpiar contenedor de paginación
  container.innerHTML = '';
  
  // Si hay pocos items, no necesitamos paginación
  if (totalItems <= itemsPerPage) return;
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentPage = 1; // Por defecto, primera página
  
  // Botón anterior
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.setAttribute('data-page', 'prev');
  container.appendChild(prevButton);
  
  // Crear botones de página
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Ajustar si estamos cerca del final
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // Botón de primera página
  if (startPage > 1) {
    const firstPageBtn = document.createElement('button');
    firstPageBtn.textContent = '1';
    firstPageBtn.setAttribute('data-page', '1');
    container.appendChild(firstPageBtn);
    
    // Separador si es necesario
    if (startPage > 2) {
      const separator = document.createElement('span');
      separator.className = 'pagination-separator';
      separator.textContent = '...';
      container.appendChild(separator);
    }
  }
  
  // Botones numerados
  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.setAttribute('data-page', i);
    if (i === currentPage) {
      button.classList.add('active');
    }
    container.appendChild(button);
  }
  
  // Separador final y última página
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const separator = document.createElement('span');
      separator.className = 'pagination-separator';
      separator.textContent = '...';
      container.appendChild(separator);
    }
    
    const lastPageBtn = document.createElement('button');
    lastPageBtn.textContent = totalPages;
    lastPageBtn.setAttribute('data-page', totalPages);
    container.appendChild(lastPageBtn);
  }
  
  // Botón siguiente
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages;
  nextButton.setAttribute('data-page', 'next');
  container.appendChild(nextButton);
  
  // Configurar eventos
  container.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function() {
      handlePaginationClick(this.getAttribute('data-page'));
    });
  });
}

// Manejar click en paginación
function handlePaginationClick(pageStr) {
  const tableRows = document.querySelectorAll('#ranking-body tr');
  const itemsPerPage = 20;
  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  
  let newPage = parseInt(pageStr);
  
  // Manejo especial para botones prev/next
  if (pageStr === 'prev') {
    const currentPage = parseInt(document.querySelector('#ranking-pagination button.active').getAttribute('data-page'));
    newPage = Math.max(1, currentPage - 1);
  } else if (pageStr === 'next') {
    const currentPage = parseInt(document.querySelector('#ranking-pagination button.active').getAttribute('data-page'));
    newPage = Math.min(totalPages, currentPage + 1);
  }
  
  // Actualizar botones de paginación
  document.querySelectorAll('#ranking-pagination button').forEach(button => {
    if (button.getAttribute('data-page') == newPage) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
    
    // Actualizar estado de botones prev/next
    if (button.getAttribute('data-page') === 'prev') {
      button.disabled = newPage === 1;
    }
    if (button.getAttribute('data-page') === 'next') {
      button.disabled = newPage === totalPages;
    }
  });
  
  // Mostrar filas correspondientes a la página seleccionada
  tableRows.forEach((row, index) => {
    const rowPage = Math.floor(index / itemsPerPage) + 1;
    row.style.display = rowPage === newPage ? '' : 'none';
  });
  
  // Scroll al principio de la tabla
      const tableContainer = document.querySelector('.ranking-table-container');
      if (tableContainer) {
    tableContainer.scrollTop = 0;
  }
}

// Mostrar mensaje si el jugador viene de completar una partida
function showGameCompletionMessage() {
  // Check if we already have a message div
  let messageElement = document.getElementById('game-completion-message');
  
  if (!messageElement) {
    // Create message element if it doesn't exist
    messageElement = document.createElement('div');
    messageElement.id = 'game-completion-message';
    messageElement.className = 'game-completion-message';
    
    // Apply styles
    messageElement.style.backgroundColor = 'rgba(34, 197, 94, 0.9)';
    messageElement.style.borderRadius = '10px';
    messageElement.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '20px';
    messageElement.style.margin = '20px auto';
    messageElement.style.maxWidth = '90%';
    messageElement.style.position = 'relative';
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(-20px)';
    messageElement.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    // Obtener datos de la última partida
    const playerName = localStorage.getItem('username') || 'Jugador';
    const lastGameStats = JSON.parse(localStorage.getItem('lastGameStats') || '{}');
    const score = lastGameStats.score || 0;
    const correct = lastGameStats.correct || 0;
    const wrong = lastGameStats.wrong || 0;
    const victory = lastGameStats.victory;
    
    const resultIcon = victory ? 
      '<i class="fas fa-trophy" style="color: gold; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);"></i>' : 
      '<i class="fas fa-medal" style="color: #e11d48;"></i>';
    
    messageElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 40px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
          ${resultIcon}
        </div>
        <div>
          <h3 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">¡Partida Registrada!</h3>
          <p style="margin: 0 0 5px 0; font-size: 16px;">
            <strong>${playerName}</strong>, tu puntuación de <strong>${score} puntos</strong> 
            (${correct} aciertos, ${wrong} errores) ha sido registrada.
          </p>
          <p style="margin: 0; font-size: 14px; font-style: italic;">
            El ranking global ha sido actualizado instantáneamente.
            ${victory ? '¡Felicidades por tu desempeño!' : 'Sigue intentándolo para mejorar tu posición.'}
          </p>
        </div>
        <button onclick="this.parentNode.parentNode.style.display='none';" 
                style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Insertar antes de la tabla pero después del encabezado
    const rankingHeader = document.querySelector('.ranking-header');
    if (rankingHeader && rankingHeader.nextSibling) {
      rankingHeader.parentNode.insertBefore(messageElement, rankingHeader.nextSibling);
    } else {
      // Si no se encuentra el encabezado
      const container = document.querySelector('.ranking-container');
      if (container) {
        container.insertBefore(messageElement, container.firstChild);
      }
    }
    
    // Añadir estilos para la animación de pulso
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    }, 100);
  }
  
  // Auto-ocultar mensaje después de 8 segundos
  setTimeout(() => {
    if (messageElement) {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 500);
    }
  }, 12000); // Aumentamos el tiempo a 12 segundos para que el usuario pueda leerlo bien
}

// Formatear nivel de dificultad
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

// Nueva función para hacer scroll al jugador actual
function scrollToCurrentPlayer() {
  setTimeout(() => {
    const currentPlayerRow = document.querySelector('tr.current-player');
    if (currentPlayerRow) {
      const tableContainer = document.querySelector('.ranking-table-container');
      if (tableContainer) {
        // Posicionar el jugador actual en el centro del contenedor
        const rowPosition = currentPlayerRow.offsetTop;
        const containerHeight = tableContainer.clientHeight;
        const rowHeight = currentPlayerRow.clientHeight;
        
        // Calcular posición para centrar la fila
        const scrollPosition = rowPosition - (containerHeight / 2) + (rowHeight / 2);
        
        // Hacer scroll suave
        tableContainer.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
        
        // Aplicar efecto de destaque
        currentPlayerRow.classList.add('highlight');
        setTimeout(() => {
          currentPlayerRow.classList.remove('highlight');
          setTimeout(() => {
            currentPlayerRow.classList.add('highlight');
          }, 300);
        }, 300);
      }
    }
  }, 500);
}

// Modificar la función loadRanking para asegurar que siempre obtenemos los datos más recientes
async function loadRanking(forceRefresh = false, period = 'global') {
  const loadingContainer = document.getElementById('loading-container');
  const rankingTable = document.getElementById('ranking-table');
  const rankingTableBody = document.getElementById('ranking-body');
  const noResultsContainer = document.getElementById('no-results');
  
  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-body'");
    return;
  }
  
  // Mostrar el spinner de carga
  if (loadingContainer) loadingContainer.style.display = 'flex';
  if (rankingTable) rankingTable.style.display = 'none';
  if (noResultsContainer) noResultsContainer.style.display = 'none';
  
  try {
    console.log('Cargando ranking ' + period + (forceRefresh ? ' (forzando recarga)' : ''));
    
    // Pequeña espera para asegurar que el spinner se muestre (evita parpadeos)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Siempre forzamos obtener los datos más recientes
    let rankingData = await getRankingDataFromStorage(period);
    
    // Ocultar spinner de carga
    if (loadingContainer) loadingContainer.style.display = 'none';
    
    // Limpiar contenido anterior
    rankingTableBody.innerHTML = '';
    
    if (!rankingData || rankingData.length === 0) {
      // Si no hay datos, mostrar mensaje
      if (noResultsContainer) {
        noResultsContainer.style.display = 'flex';
        // Actualizar mensaje para mostrar período correcto
        const periodName = period === 'weekly' ? 'esta semana' : (period === 'monthly' ? 'este mes' : 'global');
        noResultsContainer.innerHTML = `
          <i class="fas fa-info-circle"></i>
          <h3>No hay resultados disponibles</h3>
          <p>No se encontraron datos de ranking para el período ${periodName}.</p>
          <button onclick="loadRanking(true)" class="retry-button">
            <i class="fas fa-sync-alt"></i> Reintentar
          </button>
        `;
      }
      return;
    }
    
    // Mostrar tabla
    if (rankingTable) rankingTable.style.display = 'table';
    
    // Ordenar por puntaje (score) de mayor a menor
    rankingData.sort((a, b) => b.score - a.score);
    
    // Obtener nombre del jugador actual para destacarlo
    const currentPlayer = getUsernameFromStorage();
    
    // Variable para rastrear si el jugador actual está en la tabla
    let currentPlayerPosition = -1;
    
    // Generar filas de la tabla principal
    rankingData.forEach((item, index) => {
      const position = index + 1;
      
      // Determinar si es el jugador actual (comparar sin importar mayúsculas/minúsculas)
      const isCurrentPlayer = currentPlayer && item.name && 
                             item.name.toLowerCase() === currentPlayer.toLowerCase();
      if (isCurrentPlayer) {
        currentPlayerPosition = position;
      }
      
      const tr = document.createElement("tr");
      
      // Añadir clase si es el jugador actual
      if (isCurrentPlayer) {
        tr.classList.add('highlight'); // Añadir highlight directamente
      }
      
      // Determinar clase para posición
      let positionClass = '';
      if (position === 1) positionClass = 'top-1';
      else if (position === 2) positionClass = 'top-2';
      else if (position === 3) positionClass = 'top-3';
      
      // Formatear fecha
      const gameDate = item.date ? new Date(item.date) : null;
      const formattedDate = gameDate ? 
        `${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
        '-';
      
      tr.innerHTML = `
        <td class="position ${positionClass}">${position}</td>
        <td class="player">${item.name || "Anónimo"}</td>
        <td class="score">${item.score || 0}</td>
        <td>${item.correct || 0}</td>
        <td>${item.wrong || 0}</td>
        <td>${formatDifficulty(item.difficulty)}</td>
        <td class="date">${formattedDate}</td>
      `;
      
      rankingTableBody.appendChild(tr);
    });
    
    // Mostrar posición del jugador actual si está en el ranking
    updatePlayerPositionDisplay(currentPlayerPosition, currentPlayer);
    
    // Configurar paginación
    setupPagination(rankingData.length);
    
    // Mostrar primera página de resultados
    handlePaginationClick('1');
    
    // Scroll al jugador actual si está en el ranking
    if (currentPlayerPosition > 0) {
      scrollToCurrentPlayer();
    }
    
    // Actualizar estadísticas globales
    updateGlobalStats(rankingData);
    
    console.log('Ranking cargado correctamente');
  } catch (err) {
    console.error("Error general al cargar ranking:", err);
    if (loadingContainer) {
      loadingContainer.innerHTML = `
        <div class="ranking-empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Error al cargar el ranking</h3>
          <p>${err.message}</p>
          <button onclick="loadRanking(true)" class="retry-button">
            <i class="fas fa-sync-alt"></i> Reintentar
          </button>
        </div>
      `;
      loadingContainer.style.display = 'flex';
    }
  }
}
