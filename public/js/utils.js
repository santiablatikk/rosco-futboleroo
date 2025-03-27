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
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
      }
    };
    
// Exportar el objeto Utils para uso global
window.Utils = Utils; 