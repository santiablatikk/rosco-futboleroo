// ranking.js

// Cuando el DOM esté listo, iniciamos la carga del ranking global
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM cargado - Inicializando ranking global");

  // (Opcional) Obtener el nombre de usuario guardado (si usás esto para destacar al jugador)
  const username = getUsernameFromStorage();
  console.log("Usuario detectado:", username || "Anónimo");

  // Cargamos el ranking global desde el servidor
  await loadGlobalRanking("global");

  // Configuramos los botones de períodos, búsqueda y navegación
  setupPeriodButtons();
  setupPlayerSearch();
  setupNavigationButtons();
});

/**
 * Función para cargar el ranking global desde el servidor.
 * Hace una petición fetch a nuestro endpoint /api/ranking y genera la tabla.
 */
async function loadGlobalRanking(period = "global") {
  const loadingContainer = document.getElementById("loading-container");
  const rankingTable = document.getElementById("ranking-table");
  const rankingTableBody = document.getElementById("ranking-body");
  const noResultsContainer = document.getElementById("no-results");

  // Mostrar spinner de carga y ocultar tabla y mensajes
  if (loadingContainer) loadingContainer.style.display = "flex";
  if (rankingTable) rankingTable.style.display = "none";
  if (noResultsContainer) noResultsContainer.style.display = "none";

  try {
    // Realizamos la petición al servidor (cambiar la URL si no es localhost)
    const response = await fetch("http://localhost:3002/api/ranking");
    const rankingData = await response.json();

    // Ocultar el spinner
    if (loadingContainer) loadingContainer.style.display = "none";

    // Limpiar la tabla anterior
    rankingTableBody.innerHTML = "";

    if (!rankingData || rankingData.length === 0) {
      // Si no hay datos, mostramos mensaje de sin resultados
      if (noResultsContainer) {
        noResultsContainer.style.display = "flex";
        const periodName = period === "weekly" ? "esta semana" : (period === "monthly" ? "este mes" : "global");
        noResultsContainer.innerHTML = `
          <i class="fas fa-info-circle"></i>
          <h3>No hay resultados disponibles</h3>
          <p>No se encontraron datos de ranking para el período ${periodName}.</p>
          <button onclick="loadGlobalRanking('${period}')" class="retry-button">
            <i class="fas fa-sync-alt"></i> Reintentar
          </button>
        `;
      }
      return;
    }

    // Mostrar la tabla
    if (rankingTable) rankingTable.style.display = "table";

    // Ordenar los datos por puntaje (de mayor a menor) en caso de que no estén ordenados
    rankingData.sort((a, b) => b.score - a.score);

    // Obtener nombre del jugador actual para resaltar su posición (si corresponde)
    const currentPlayer = getUsernameFromStorage();
    let currentPlayerPosition = -1;

    // Generamos las filas de la tabla
    rankingData.forEach((item, index) => {
      const position = index + 1;
      const tr = document.createElement("tr");

      // Si es el jugador actual, lo resaltamos
      const isCurrentPlayer = currentPlayer && item.name && item.name.toLowerCase() === currentPlayer.toLowerCase();
      if (isCurrentPlayer) {
        currentPlayerPosition = position;
        tr.classList.add("highlight");
      }

      // Determinar clase para la posición (top 1, top 2, etc.)
      let positionClass = "";
      if (position === 1) positionClass = "top-1";
      else if (position === 2) positionClass = "top-2";
      else if (position === 3) positionClass = "top-3";

      // Formatear la fecha de la partida
      const gameDate = item.date ? new Date(item.date) : null;
      const formattedDate = gameDate ? `${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}` : "-";

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

    // Actualizamos estadísticas globales en la UI
    updateGlobalStats(rankingData);

    // Mostramos la posición del jugador actual (si existe)
    updatePlayerPositionDisplay(currentPlayerPosition, currentPlayer);

    // Configuramos la paginación (si la usás)
    setupPagination(rankingData.length);
    handlePaginationClick("1");

    // Opcional: hacer scroll al jugador actual
    if (currentPlayerPosition > 0) {
      scrollToCurrentPlayer();
    }

    console.log("Ranking global cargado correctamente");
  } catch (err) {
    console.error("Error al cargar el ranking global:", err);
    if (loadingContainer) {
      loadingContainer.innerHTML = `
        <div class="ranking-empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Error al cargar el ranking</h3>
          <p>${err.message}</p>
          <button onclick="loadGlobalRanking('${period}')" class="retry-button">
            <i class="fas fa-sync-alt"></i> Reintentar
          </button>
        </div>
      `;
      loadingContainer.style.display = "flex";
    }
  }
}

/* --- Funciones de ayuda que podés mantener sin cambios --- */

// Función para obtener el nombre de usuario (puede seguir leyendo de localStorage si lo tenés guardado)
function getUsernameFromStorage() {
  return localStorage.getItem("username") || "Anónimo";
}

// Función para formatear la dificultad
function formatDifficulty(difficulty) {
  switch (difficulty) {
    case "facil":
      return "Fácil";
    case "normal":
      return "Normal";
    case "dificil":
      return "Difícil";
    default:
      return difficulty || "-";
  }
}

// Función para actualizar estadísticas globales en la UI
function updateGlobalStats(rankingData) {
  const uniquePlayers = new Set(rankingData.map(item => item.name)).size;
  const totalGames = rankingData.length;
  let totalCorrect = 0;
  let totalQuestions = 0;
  
  rankingData.forEach(item => {
    totalCorrect += item.correct || 0;
    totalQuestions += (item.correct || 0) + (item.wrong || 0);
  });
  
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  document.getElementById("total-players").textContent = uniquePlayers;
  document.getElementById("total-games").textContent = totalGames;
  document.getElementById("success-rate").textContent = `${successRate}%`;
}

// Función para mostrar la posición del jugador actual
function updatePlayerPositionDisplay(position, playerName) {
  const playerPositionNote = document.getElementById("player-position-note");
  const playerPositionText = document.getElementById("player-position-text");
  
  if (playerPositionNote && playerPositionText) {
    if (playerName && position > 0) {
      playerPositionText.innerHTML = `
        Estás en la posición <strong>${position}</strong> de ${document.querySelectorAll("#ranking-body tr").length} jugadores
      `;
      playerPositionNote.style.display = "flex";
      playerPositionNote.className = position <= 3 ? "player-position-info top-position" : "player-position-info";
    } else if (playerName) {
      playerPositionText.innerHTML = `
        No estás entre los mejores jugadores del ranking. ¡Sigue intentándolo!
      `;
      playerPositionNote.style.display = "flex";
      playerPositionNote.className = "player-position-info not-in-ranking";
    } else {
      playerPositionNote.style.display = "none";
    }
  }
}

// Función para configurar la paginación
function setupPagination(totalItems, itemsPerPage = 20) {
  const container = document.getElementById("ranking-pagination");
  if (!container) return;
  
  container.innerHTML = "";
  if (totalItems <= itemsPerPage) return;
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentPage = 1;
  
  const prevButton = document.createElement("button");
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.setAttribute("data-page", "prev");
  container.appendChild(prevButton);
  
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    const firstPageBtn = document.createElement("button");
    firstPageBtn.textContent = "1";
    firstPageBtn.setAttribute("data-page", "1");
    container.appendChild(firstPageBtn);
    
    if (startPage > 2) {
      const separator = document.createElement("span");
      separator.className = "pagination-separator";
      separator.textContent = "...";
      container.appendChild(separator);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.setAttribute("data-page", i);
    if (i === currentPage) {
      button.classList.add("active");
    }
    container.appendChild(button);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const separator = document.createElement("span");
      separator.className = "pagination-separator";
      separator.textContent = "...";
      container.appendChild(separator);
    }
    
    const lastPageBtn = document.createElement("button");
    lastPageBtn.textContent = totalPages;
    lastPageBtn.setAttribute("data-page", totalPages);
    container.appendChild(lastPageBtn);
  }
  
  const nextButton = document.createElement("button");
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages;
  nextButton.setAttribute("data-page", "next");
  container.appendChild(nextButton);
  
  container.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", function() {
      handlePaginationClick(this.getAttribute("data-page"));
    });
  });
}

// Función para manejar el click en la paginación
function handlePaginationClick(pageStr) {
  const tableRows = document.querySelectorAll("#ranking-body tr");
  const itemsPerPage = 20;
  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  
  let newPage = parseInt(pageStr);
  if (pageStr === "prev") {
    const currentPage = parseInt(document.querySelector("#ranking-pagination button.active").getAttribute("data-page"));
    newPage = Math.max(1, currentPage - 1);
  } else if (pageStr === "next") {
    const currentPage = parseInt(document.querySelector("#ranking-pagination button.active").getAttribute("data-page"));
    newPage = Math.min(totalPages, currentPage + 1);
  }
  
  document.querySelectorAll("#ranking-pagination button").forEach(button => {
    if (button.getAttribute("data-page") == newPage) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
    if (button.getAttribute("data-page") === "prev") {
      button.disabled = newPage === 1;
    }
    if (button.getAttribute("data-page") === "next") {
      button.disabled = newPage === totalPages;
    }
  });
  
  tableRows.forEach((row, index) => {
    const rowPage = Math.floor(index / itemsPerPage) + 1;
    row.style.display = rowPage === newPage ? "" : "none";
  });
  
  const tableContainer = document.querySelector(".ranking-table-container");
  if (tableContainer) {
    tableContainer.scrollTop = 0;
  }
}

// Función para hacer scroll al jugador actual (opcional)
function scrollToCurrentPlayer() {
  setTimeout(() => {
    const currentPlayerRow = document.querySelector("tr.current-player");
    if (currentPlayerRow) {
      const tableContainer = document.querySelector(".ranking-table-container");
      if (tableContainer) {
        const rowPosition = currentPlayerRow.offsetTop;
        const containerHeight = tableContainer.clientHeight;
        const rowHeight = currentPlayerRow.clientHeight;
        const scrollPosition = rowPosition - (containerHeight / 2) + (rowHeight / 2);
        tableContainer.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: "smooth"
        });
        currentPlayerRow.classList.add("highlight");
        setTimeout(() => {
          currentPlayerRow.classList.remove("highlight");
          setTimeout(() => {
            currentPlayerRow.classList.add("highlight");
          }, 300);
        }, 300);
      }
    }
  }, 500);
}

// Función para configurar los botones de períodos
function setupPeriodButtons() {
  const periodButtons = document.querySelectorAll(".period-selector button");
  if (periodButtons.length === 0) return;
  
  periodButtons.forEach(button => {
    button.addEventListener("click", function() {
      periodButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const period = this.getAttribute("data-period");
      loadGlobalRanking(period);
    });
  });
}

// Función para configurar el buscador de jugadores (si lo usás)
function setupPlayerSearch() {
  const searchInput = document.getElementById("player-search");
  if (searchInput) {
    searchInput.addEventListener("input", function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      filterRankingTable(searchTerm);
    });
  }
}

// Función para filtrar la tabla de ranking según la búsqueda
function filterRankingTable(searchTerm) {
  const tableRows = document.querySelectorAll("#ranking-body tr");
  let visibleRows = 0;
  
  tableRows.forEach(row => {
    const playerName = row.querySelector(".username")?.textContent.toLowerCase() || "";
    if (playerName.includes(searchTerm) || searchTerm === "") {
      row.style.display = "";
      visibleRows++;
    } else {
      row.style.display = "none";
    }
  });
  
  const noResults = document.getElementById("no-results");
  if (noResults) {
    if (visibleRows === 0 && searchTerm !== "") {
      noResults.style.display = "flex";
      noResults.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>No se encontraron jugadores</h3>
        <p>No hay jugadores que coincidan con "${searchTerm}"</p>
      `;
    } else {
      noResults.style.display = "none";
    }
  }
}

// Función para configurar botones de navegación (p.ej. para volver o ver perfil)
function setupNavigationButtons() {
  const backButton = document.getElementById("back-button");
  if (backButton) {
    backButton.addEventListener("click", function() {
      if (localStorage.getItem("hasPlayed") === "true") {
        window.location.href = "game.html";
      } else {
        window.location.href = "index.html";
      }
    });
  }
  
  const viewProfileButton = document.getElementById("view-profile");
  if (viewProfileButton) {
    viewProfileButton.addEventListener("click", function() {
      window.location.href = "profile.html";
    });
  }
}
