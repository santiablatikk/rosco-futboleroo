/**
 * utils.js - Funciones de utilidad para el juego PASALA CHE
 */

const Utils = {
  /**
   * Normaliza un texto para comparación (elimina acentos, mayúsculas, etc.)
   * @param {string} text - Texto a normalizar
   * @returns {string} - Texto normalizado
   */
  normalizeText: function(text) {
    return text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z0-9]/g, ""); // Solo letras y números
  },

  /**
   * Calcula la distancia de Levenshtein entre dos cadenas
   * (útil para permitir pequeños errores de tipeo)
   * @param {string} str1 - Primera cadena
   * @param {string} str2 - Segunda cadena
   * @returns {number} - Distancia calculada
   */
  levenshteinDistance: function(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // eliminación
          matrix[j - 1][i] + 1, // inserción
          matrix[j - 1][i - 1] + cost // sustitución
        );
      }
    }
    
    return matrix[len2][len1];
  },

  /**
   * Comprueba si dos cadenas son iguales permitiendo una tolerancia
   * @param {string} userAnswer - Respuesta del usuario
   * @param {string} correctAnswer - Respuesta correcta
   * @param {number} tolerance - Tolerancia máxima (n° caracteres diferentes permitidos)
   * @returns {boolean} - true si son similares dentro de la tolerancia
   */
  checkAnswerSimilarity: function(userAnswer, correctAnswer, tolerance = 1) {
    // Normalizar textos
    const normalizedUser = this.normalizeText(userAnswer);
    const normalizedCorrect = this.normalizeText(correctAnswer);
    
    // Si son exactamente iguales
    if (normalizedUser === normalizedCorrect) {
      return true;
    }
    
    // Calcular distancia
    const distance = this.levenshteinDistance(normalizedUser, normalizedCorrect);
    
    // Para palabras largas, permitir mayor tolerancia
    let adjustedTolerance = tolerance;
    if (normalizedCorrect.length > 8) {
      adjustedTolerance = Math.min(tolerance + 1, 3); // Máximo 3 caracteres de diferencia
    }
    
    return distance <= adjustedTolerance;
  },

  /**
   * Formatea el tiempo en segundos a formato MM:SS
   * @param {number} seconds - Tiempo en segundos
   * @returns {string} - Tiempo formateado "MM:SS"
   */
  formatTime: function(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  /**
   * Formatea el nivel de dificultad 
   * @param {string} difficulty - Nivel de dificultad (facil, normal, dificil)
   * @returns {string} - Texto formateado
   */
  formatDifficulty: function(difficulty) {
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
  },

  /**
   * Obtener nombre de usuario desde localStorage
   * @returns {string} - Nombre de usuario o null si no existe
   */
  getUsernameFromStorage: function() {
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
  },

  /**
   * Obtener datos del ranking del servidor
   * @param {string} period - Periodo (global, monthly, weekly)
   * @returns {Promise<Array>} - Promise con datos del ranking
   */
  fetchRankingsData: async function(period = 'global') {
    try {
      console.log(`Obteniendo datos del ranking para el período ${period}...`);
      
      // Intentar primero /api/rankings
      let response = await fetch('/api/rankings');
      let data = await response.json();
      let rankingData = [];
      
      if (data && data.rankings && Array.isArray(data.rankings)) {
        rankingData = data.rankings;
        console.log('Datos de ranking obtenidos de /api/rankings');
      } else if (Array.isArray(data)) {
        rankingData = data;
        console.log('Datos de ranking obtenidos de /api/rankings (formato array)');
      } else {
        // Si el primer endpoint falla, intentar con el alternativo
        response = await fetch('/api/ranking');
        
        if (!response.ok) {
          throw new Error('Error al obtener datos del ranking');
        }
        
        data = await response.json();
        
        if (Array.isArray(data)) {
          rankingData = data;
          console.log('Datos de ranking obtenidos de /api/ranking');
        } else {
          throw new Error('Formato de datos inválido de ambos endpoints');
        }
      }
      
      // Filtrar datos según el período seleccionado si es necesario
      if (period !== 'global') {
        const dateRange = this.getPeriodDateRange(period);
        
        rankingData = rankingData.filter(entry => {
          const gameDate = entry.date ? new Date(entry.date) : null;
          if (!gameDate) return false;
          
          return gameDate >= dateRange.start && gameDate <= dateRange.end;
        });
      }
      
      console.log(`Datos de ranking obtenidos: ${rankingData.length} registros para período ${period}`);
      return rankingData;
    } catch (error) {
      console.error('Error al obtener datos del ranking:', error);
      return [];
    }
  },
  
  /**
   * Obtener rango de fechas para el período seleccionado
   * @param {string} period - Periodo (global, monthly, weekly)
   * @returns {Object|null} - Objeto con fechas de inicio y fin, o null
   */
  getPeriodDateRange: function(period) {
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
  },

  /**
   * Genera un ID único
   * @returns {string} - ID único
   */
  generateUniqueId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },

  /**
   * Guarda un objeto en localStorage
   * @param {string} key - Clave para almacenar
   * @param {any} value - Valor a almacenar (se convertirá a JSON)
   */
  saveToLocalStorage: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
      return false;
    }
  },

  /**
   * Recupera un objeto de localStorage
   * @param {string} key - Clave a recuperar
   * @param {any} defaultValue - Valor por defecto si la clave no existe
   * @returns {any} - Valor recuperado o defaultValue
   */
  getFromLocalStorage: function(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error('Error al recuperar de localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Obtiene un parámetro de la URL
   * @param {string} name - Nombre del parámetro
   * @returns {string|null} - Valor del parámetro o null si no existe
   */
  getUrlParameter: function(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  },

  /**
   * Selecciona un elemento aleatorio de un array
   * @param {Array} array - Array del que seleccionar
   * @returns {any} - Elemento seleccionado aleatoriamente
   */
  randomFromArray: function(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Mezcla aleatoriamente los elementos de un array (Fisher-Yates algorithm)
   * @param {Array} array - Array a mezclar
   * @returns {Array} - Array mezclado
   */
  shuffleArray: function(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * Limita una llamada a una función (útil para eventos como resize)
   * @param {Function} func - Función a limitar
   * @param {number} wait - Tiempo de espera en ms
   * @returns {Function} - Función limitada
   */
  debounce: function(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Función para detectar y guardar la IP del usuario
  async detectUserIP() {
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
  },

  // Función para obtener la IP actual del usuario (versión sincrónica)
  getCurrentUserIP() {
    return localStorage.getItem('userIP') || 'unknown-ip';
  },

  // Guardar datos de partida completada
  saveGameResult(gameData) {
    if (!gameData) return false;
    
    try {
      // Asegurarnos de que existe la IP del usuario
      const userIP = this.getCurrentUserIP();
      
      // Usar las funciones de perfil.js para guardar los datos
      if (typeof processGameCompletion === 'function') {
        return processGameCompletion(gameData);
      } else {
        console.warn('La función processGameCompletion no está disponible. Asegúrate de cargar profile.js');
        
        // Implementación de respaldo básica
        // Guardar historial de juego
        this.saveGameHistoryBackup(gameData, userIP);
        return true;
      }
    } catch (error) {
      console.error('Error guardando resultados del juego:', error);
      return false;
    }
  },

  // Función de respaldo para guardar historial si profile.js no está cargado
  saveGameHistoryBackup(gameData, userIP) {
    try {
      // Clave específica para el historial de esta IP
      const historyKey = `gameHistory_${userIP}`;
      
      // Obtener historial existente o crear uno nuevo
      let history = [];
      const existingHistory = localStorage.getItem(historyKey);
      
      if (existingHistory) {
        history = JSON.parse(existingHistory);
      }
      
      // Añadir esta partida al historial
      history.unshift({
        ...gameData,
        date: new Date().toISOString() // Asegurar que tiene timestamp
      });
      
      // Guardar historial actualizado
      localStorage.setItem(historyKey, JSON.stringify(history));
      
      console.log('Partida guardada en historial (respaldo) para IP:', userIP);
      return true;
    } catch (error) {
      console.error('Error guardando partida en historial (respaldo):', error);
      return false;
    }
  },

  // Mostrar loading indicator
  showLoading(message = 'Cargando...') {
    // Crear o actualizar el loading indicator
    let loadingOverlay = document.getElementById('loading-overlay');
    
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'loading-overlay';
      loadingOverlay.style.position = 'fixed';
      loadingOverlay.style.top = '0';
      loadingOverlay.style.left = '0';
      loadingOverlay.style.width = '100%';
      loadingOverlay.style.height = '100%';
      loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.justifyContent = 'center';
      loadingOverlay.style.alignItems = 'center';
      loadingOverlay.style.zIndex = '1000';
      loadingOverlay.style.backdropFilter = 'blur(5px)';
      loadingOverlay.style.transition = 'opacity 0.3s ease';
      loadingOverlay.style.opacity = '0';
      
      document.body.appendChild(loadingOverlay);
      
      // Forzar reflow para permitir la animación
      void loadingOverlay.offsetWidth;
    }
    
    loadingOverlay.innerHTML = `
      <div style="text-align: center; color: white;">
        <div style="font-size: 50px; margin-bottom: 20px;">
          <i class="fas fa-futbol fa-spin"></i>
        </div>
        <p style="font-size: 18px; margin: 0;">${message}</p>
      </div>
    `;
    
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';
    
    return loadingOverlay;
  },

  // Ocultar loading indicator
  hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loadingOverlay) {
      loadingOverlay.style.opacity = '0';
      
      // Esperar a que termine la transición para eliminar
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 300);
    }
  },

  // Mostrar mensaje de error
  showError: function(message) {
    // Crear o actualizar el mensaje
    let errorMessage = document.getElementById('error-message');
    
    if (!errorMessage) {
      errorMessage = document.createElement('div');
      errorMessage.id = 'error-message';
      errorMessage.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '15px';
      errorMessage.style.borderRadius = '8px';
      errorMessage.style.marginBottom = '20px';
      errorMessage.style.textAlign = 'center';
      errorMessage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      errorMessage.style.display = 'flex';
      errorMessage.style.alignItems = 'center';
      errorMessage.style.justifyContent = 'center';
      errorMessage.style.gap = '10px';
      
      // Insertar al principio del contenido principal
      const contentContainer = document.querySelector('.profile-content') || document.body;
      contentContainer.insertBefore(errorMessage, contentContainer.firstChild);
    }
    
    errorMessage.innerHTML = `
      <i class="fas fa-exclamation-triangle" style="font-size: 20px;"></i>
      <span>${message}</span>
    `;
    
    errorMessage.style.display = 'flex';
    
    // Animar aparición
    errorMessage.style.animation = 'shakeError 0.5s ease-in-out';
    
    // Añadir el estilo de la animación si no existe
    if (!document.getElementById('error-animation-style')) {
      const style = document.createElement('style');
      style.id = 'error-animation-style';
      style.textContent = `
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
      `;
      document.head.appendChild(style);
    }
  },

  // Mostrar mensaje (info, success, warning)
  showMessage: function(message, type = 'info') {
    // Determinar colores según el tipo
    let bgColor, icon;
    switch (type) {
      case 'success':
        bgColor = 'rgba(34, 197, 94, 0.9)';
        icon = 'fa-check-circle';
        break;
      case 'warning':
        bgColor = 'rgba(245, 158, 11, 0.9)';
        icon = 'fa-exclamation-triangle';
        break;
      case 'info':
      default:
        bgColor = 'rgba(59, 130, 246, 0.9)';
        icon = 'fa-info-circle';
        break;
    }
    
    // Crear o actualizar el mensaje
    let infoMessage = document.getElementById('info-message');
    
    if (!infoMessage) {
      infoMessage = document.createElement('div');
      infoMessage.id = 'info-message';
      infoMessage.style.color = 'white';
      infoMessage.style.padding = '15px';
      infoMessage.style.borderRadius = '8px';
      infoMessage.style.marginBottom = '20px';
      infoMessage.style.textAlign = 'center';
      infoMessage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      infoMessage.style.display = 'flex';
      infoMessage.style.alignItems = 'center';
      infoMessage.style.justifyContent = 'center';
      infoMessage.style.gap = '10px';
      
      // Insertar al principio del contenido principal
      const contentContainer = document.querySelector('.profile-content') || document.body;
      contentContainer.insertBefore(infoMessage, contentContainer.firstChild);
    }
    
    infoMessage.style.backgroundColor = bgColor;
    infoMessage.innerHTML = `
      <i class="fas ${icon}" style="font-size: 20px;"></i>
      <span>${message}</span>
    `;
    
    infoMessage.style.display = 'flex';
    
    // Animar aparición
    infoMessage.style.animation = 'fadeInMessage 0.3s ease-in-out';
    
    // Añadir el estilo de la animación si no existe
    if (!document.getElementById('message-animation-style')) {
      const style = document.createElement('style');
      style.id = 'message-animation-style';
      style.textContent = `
        @keyframes fadeInMessage {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Automáticamente ocultar después de 5 segundos para tipos que no sean error
    if (type !== 'error') {
      setTimeout(() => {
        infoMessage.style.display = 'none';
      }, 5000);
    }
  },

  /**
   * Función para inicializar las utilidades
   */
  init: function() {
    console.log('Inicializando utilidades...');
    // Detectar IP del usuario
    this.detectUserIP().then(ip => {
      console.log('Utilidades inicializadas, IP del usuario:', ip);
    });
  }
};

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
  Utils.init();
}); 