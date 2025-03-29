// Variables globales
let allProfiles = [];
let filteredProfiles = [];
let currentPage = 1;
let profilesPerPage = 12;
let currentSort = 'score';
let currentSearch = '';
let autoRefreshEnabled = true;

// Al cargar el documento
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de todos los perfiles');
    
    // Cargar perfiles
    loadAllProfiles();
    
    // Configurar eventos
    setupEventListeners();
    
    // Iniciar actualización automática
    if (autoRefreshEnabled) {
        startAutoRefresh();
    }
});

// Configurar eventos
function setupEventListeners() {
    // Buscador
    const searchInput = document.getElementById('profile-search');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput && searchButton) {
        // Buscar al hacer clic en botón
        searchButton.addEventListener('click', function() {
            currentSearch = searchInput.value.trim().toLowerCase();
            currentPage = 1;
            filterAndDisplayProfiles();
        });
        
        // Buscar al presionar Enter
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                currentSearch = searchInput.value.trim().toLowerCase();
                currentPage = 1;
                filterAndDisplayProfiles();
            }
        });
    }
    
    // Ordenar
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            filterAndDisplayProfiles();
        });
    }
    
    // Botón de actualizar
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Mostrar animación de giro
            this.querySelector('i').classList.add('fa-spin');
            
            // Recargar perfiles
            loadAllProfiles(true).finally(() => {
                // Detener animación
                setTimeout(() => {
                    this.querySelector('i').classList.remove('fa-spin');
                }, 500);
            });
        });
    }
}

// Cargar todos los perfiles
async function loadAllProfiles(forceRefresh = false) {
    showLoading(true);
    
    try {
        // Obtener perfiles usando las utilidades compartidas
        allProfiles = await ProfileUtils.getAllProfiles();
        
        // Mostrar perfiles
        filterAndDisplayProfiles();
    } catch (error) {
        console.error('Error al cargar perfiles:', error);
        showError('No se pudieron cargar los perfiles. Por favor, inténtalo de nuevo más tarde.');
    } finally {
        showLoading(false);
    }
}

// Filtrar y mostrar perfiles
function filterAndDisplayProfiles() {
    // Aplicar filtro de búsqueda
    if (currentSearch) {
        filteredProfiles = allProfiles.filter(profile => 
            profile.name && profile.name.toLowerCase().includes(currentSearch)
        );
    } else {
        filteredProfiles = [...allProfiles];
    }
    
    // Ordenar perfiles
    sortProfiles();
    
    // Mostrar perfiles
    displayProfiles();
    
    // Actualizar paginación
    updatePagination();
}

// Ordenar perfiles según criterio seleccionado
function sortProfiles() {
    switch (currentSort) {
        case 'score':
            filteredProfiles.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
            break;
        case 'games':
            filteredProfiles.sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0));
            break;
        case 'level':
            filteredProfiles.sort((a, b) => calculateLevel(b) - calculateLevel(a));
            break;
        case 'name':
            filteredProfiles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'date':
            filteredProfiles.sort((a, b) => {
                const dateA = a.last_login ? new Date(a.last_login) : new Date(0);
                const dateB = b.last_login ? new Date(b.last_login) : new Date(0);
                return dateB - dateA;
            });
            break;
    }
}

// Calcular nivel del jugador
function calculateLevel(profile) {
    if (!profile) return 0;
    
    // Base en partidas jugadas y score
    const gamesPlayed = profile.gamesPlayed || 0;
    const totalScore = profile.bestScore || 0;
    
    // Fórmula básica: cada 5 partidas sube un nivel, más bonificación por puntuación
    return Math.floor(gamesPlayed / 5) + Math.floor(totalScore / 100);
}

// Mostrar perfiles en pantalla
function displayProfiles() {
    const profilesContainer = document.getElementById('profiles-list');
    const noProfilesMsg = document.getElementById('no-profiles');
    
    if (!profilesContainer) return;
    
    // Limpiar contenedor
    profilesContainer.innerHTML = '';
    
    // Mostrar mensaje si no hay resultados
    if (filteredProfiles.length === 0) {
        if (noProfilesMsg) noProfilesMsg.style.display = 'flex';
        return;
    }
    
    // Ocultar mensaje de sin resultados
    if (noProfilesMsg) noProfilesMsg.style.display = 'none';
    
    // Calcular índices para paginación
    const startIndex = (currentPage - 1) * profilesPerPage;
    const endIndex = startIndex + profilesPerPage;
    const paginated = filteredProfiles.slice(startIndex, endIndex);
    
    // Obtener template
    const template = document.getElementById('profile-card-template');
    if (!template) return;
    
    // Crear elementos para cada perfil
    paginated.forEach(profile => {
        const card = document.importNode(template.content, true);
        
        // Rellenar datos
        card.querySelector('.profile-name').textContent = profile.name || 'Jugador';
        card.querySelector('.profile-games').textContent = profile.gamesPlayed || 0;
        card.querySelector('.profile-rank').textContent = profile.global_ranking?.current_position || '-';
        
        // Nivel
        const level = calculateLevel(profile);
        card.querySelector('.profile-level').textContent = level;
        
        // Puntuación
        card.querySelector('.profile-score').textContent = profile.bestScore || 0;
        
        // Última partida
        let lastGameText = 'Sin partidas';
        if (profile.last_login) {
            const lastGameDate = new Date(profile.last_login);
            lastGameText = formatDate(lastGameDate);
        }
        card.querySelector('.profile-last-game').textContent = lastGameText;
        
        // Resultado última partida
        const resultBadge = card.querySelector('.profile-result');
        if (profile.history && profile.history.length > 0) {
            const lastGame = profile.history[0];
            if (lastGame.victory) {
                resultBadge.textContent = 'Victoria';
                resultBadge.className = 'badge success profile-result';
            } else {
                resultBadge.textContent = 'Derrota';
                resultBadge.className = 'badge danger profile-result';
            }
        } else {
            resultBadge.style.display = 'none';
        }
        
        // Enlace al perfil
        const profileLink = card.querySelector('.profile-link');
        profileLink.href = `profile.html?username=${encodeURIComponent(profile.name || 'Jugador')}`;
        
        // Agregar al contenedor
        profilesContainer.appendChild(card);
    });
}

// Actualizar paginación
function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    // Limpiar contenedor
    paginationContainer.innerHTML = '';
    
    // Calcular páginas
    const totalPages = Math.ceil(filteredProfiles.length / profilesPerPage);
    
    // Si no hay suficientes resultados para paginar
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Botón anterior
    const prevButton = document.createElement('button');
    prevButton.className = 'action-button';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayProfiles();
            updatePagination();
            window.scrollTo(0, 0);
        }
    });
    paginationContainer.appendChild(prevButton);
    
    // Límites para mostrar un número razonable de páginas
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // Botones de página
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = i === currentPage ? 'action-button primary' : 'action-button';
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayProfiles();
            updatePagination();
            window.scrollTo(0, 0);
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // Botón siguiente
    const nextButton = document.createElement('button');
    nextButton.className = 'action-button';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayProfiles();
            updatePagination();
            window.scrollTo(0, 0);
        }
    });
    paginationContainer.appendChild(nextButton);
}

// Iniciar actualización automática
function startAutoRefresh() {
    ProfileUtils.startAutoRefresh(
        null, // No necesitamos actualizar perfil individual
        (rankings) => {
            // Actualizar perfiles con los nuevos datos
            if (rankings && rankings.length) {
                allProfiles = rankings;
                filterAndDisplayProfiles();
            }
        }
    );
}

// Mostrar mensaje de carga
function showLoading(show) {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// Mostrar mensaje de error
function showError(message) {
    const container = document.getElementById('profiles-container');
    
    if (!container) return;
    
    // Eliminar errores anteriores
    const existingErrors = container.querySelectorAll('.notification.error');
    existingErrors.forEach(error => error.remove());
    
    // Crear nuevo mensaje de error
    const errorMsg = document.createElement('div');
    errorMsg.className = 'notification error';
    errorMsg.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="notification-content">
            <h3 class="notification-title">Error</h3>
            <p class="notification-message">${message}</p>
        </div>
    `;
    
    // Insertar después del mensaje de carga
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) {
        loadingMsg.after(errorMsg);
    } else {
        container.prepend(errorMsg);
    }
}

// Formato de fecha
function formatDate(date) {
    if (!date) return 'Desconocido';
    
    const now = new Date();
    const diff = now - date;
    
    // Menos de un día
    if (diff < 24 * 60 * 60 * 1000) {
        return 'Hoy';
    }
    
    // Menos de 2 días
    if (diff < 2 * 24 * 60 * 60 * 1000) {
        return 'Ayer';
    }
    
    // Menos de una semana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return 'Esta semana';
    }
    
    // Formato normal
    return date.toLocaleDateString();
} 