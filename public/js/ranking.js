// ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  await loadRanking();
  
  // Verificar si venimos de finalizar una partida
  const urlParams = new URLSearchParams(window.location.search);
  const fromGame = urlParams.get('fromGame');
  if (fromGame === 'true') {
    // Limpiar URL para evitar recargas duplicadas
    window.history.replaceState({}, document.title, 'ranking.html');
  }
});

async function loadRanking() {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-table tbody'");
    return;
  }
  
  try {
    // Limpiar contenido anterior
    rankingTableBody.innerHTML = '';
    
    // Mostrar estado de carga
    rankingTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">
          <i class="fas fa-spinner fa-spin"></i> Cargando ranking...
        </td>
      </tr>`;
    
    const res = await fetch("/api/ranking");
    if (!res.ok) throw new Error(`Respuesta HTTP no válida: ${res.status}`);
    const rankingData = await res.json();
    
    // Obtener el nombre del jugador actual del localStorage
    const currentPlayer = localStorage.getItem('playerName');
    
    if (!Array.isArray(rankingData) || rankingData.length === 0) {
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center;">No hay datos en el ranking.</td>
        </tr>`;
    } else {
      // Limpiar contenido antes de agregar filas
      rankingTableBody.innerHTML = '';
      
      // Ordenar por puntaje (score) de mayor a menor
      rankingData.sort((a, b) => b.score - a.score);
      
      rankingData.forEach((item, index) => {
        const position = index + 1;
        const tr = document.createElement("tr");
        
        // Determinar si es el jugador actual
        const isCurrentPlayer = currentPlayer && item.name === currentPlayer;
        if (isCurrentPlayer) {
          tr.classList.add('current-player');
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
          <td>${item.name || ""}</td>
          <td>${item.score || 0}</td>
          <td>${item.correct || 0}</td>
          <td>${item.wrong || 0}</td>
          <td>${timeFormatted}</td>
          <td>${item.difficulty || "-"}</td>
        `;
        rankingTableBody.appendChild(tr);
      });
      
      // Si existe el jugador actual pero no se ha resaltado (está fuera del top)
      if (currentPlayer && !rankingTableBody.querySelector('.current-player')) {
        const playerPosition = rankingData.findIndex(item => item.name === currentPlayer);
        if (playerPosition !== -1) {
          // Agregar nota sobre la posición del jugador
          const noteDiv = document.createElement('div');
          noteDiv.className = 'player-position-note';
          noteDiv.innerHTML = `Tu posición actual: <strong>${playerPosition + 1}</strong> de ${rankingData.length}`;
          document.getElementById('ranking-container').appendChild(noteDiv);
        }
      }
    }
  } catch (err) {
    console.error("Error al leer ranking global:", err);
    rankingTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">Error al cargar el ranking.</td>
      </tr>`;
  }
}
