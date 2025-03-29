/**
 * PASALA CHE - Theme Switcher
 * Sistema de cambio de tema oscuro/claro con guardado de preferencias
 */

class ThemeSwitcher {
  constructor() {
    // Constantes de temas
    this.DARK_THEME = 'dark';
    this.LIGHT_THEME = 'light';
    
    // Obtener tema del usuario desde localStorage o preferencia del sistema
    this.currentTheme = localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? this.DARK_THEME : this.LIGHT_THEME);
    
    // Estado del toggle
    this.isInitialized = false;
    
    // Inicializar
    this.init();
  }

  /**
   * Inicializa el theme switcher
   */
  init() {
    if (this.isInitialized) return;
    
    // Aplicar tema inicial
    this.applyTheme(this.currentTheme);
    
    // Crear el toggle switch
    this.createToggleButton();
    
    // Escuchar cambios en las preferencias del sistema
    this.listenForSystemPreferenceChanges();
    
    // Marcar como inicializado
    this.isInitialized = true;
    
    // Para debugging
    console.log(`Theme Switcher iniciado en modo: ${this.currentTheme}`);
  }

  /**
   * Crea el botón de cambio de tema
   */
  createToggleButton() {
    // Verificar si el botón ya existe
    if (document.getElementById('theme-toggle')) return;
    
    // Crear contenedor del botón
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'theme-toggle-container';
    
    // Crear botón
    const toggleButton = document.createElement('button');
    toggleButton.id = 'theme-toggle';
    toggleButton.className = 'theme-toggle-button';
    toggleButton.setAttribute('aria-label', this.currentTheme === this.DARK_THEME ? 
      'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    
    // Contenido del botón
    toggleButton.innerHTML = `
      <div class="toggle-icons">
        <div class="toggle-icon toggle-icon-sun">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </div>
        <div class="toggle-icon toggle-icon-moon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </div>
      </div>
      <span class="toggle-track">
        <span class="toggle-thumb"></span>
      </span>
    `;
    
    // Añadir clase inicial según el tema
    toggleButton.classList.add(this.currentTheme === this.DARK_THEME ? 'dark-active' : 'light-active');
    
    // Añadir evento click
    toggleButton.addEventListener('click', () => this.toggleTheme());
    
    // Añadir estilos CSS
    const style = document.createElement('style');
    style.textContent = `
      .theme-toggle-container {
        position: fixed;
        bottom: 90px;
        right: 30px;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      @media (max-width: 768px) {
        .theme-toggle-container {
          bottom: 100px;
          right: 20px;
        }
      }
      
      .theme-toggle-button {
        display: flex;
        align-items: center;
        background: rgba(20, 20, 35, 0.8);
        border: none;
        border-radius: 50px;
        cursor: pointer;
        padding: 6px;
        height: 32px;
        width: 70px;
        position: relative;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3), 
                    inset 0 0 5px rgba(255, 255, 255, 0.2),
                    0 0 0 2px rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.17, 0.67, 0.14, 1.03);
        backdrop-filter: blur(10px);
      }
      
      .light-active .theme-toggle-button {
        background: rgba(240, 240, 255, 0.9);
        box-shadow: 0 4px 10px rgba(0, 30, 100, 0.15), 
                    inset 0 0 5px rgba(0, 0, 0, 0.05),
                    0 0 0 2px rgba(0, 0, 0, 0.025);
      }
      
      .toggle-track {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 50px;
        overflow: hidden;
      }
      
      .toggle-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 28px;
        height: 28px;
        background: #e11d48;
        border-radius: 50%;
        transform: translateX(0);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.5s cubic-bezier(0.17, 0.67, 0.14, 1.03),
                    background 0.5s ease;
        z-index: 2;
      }
      
      .light-active .toggle-thumb {
        transform: translateX(38px);
        background: #0284c7;
      }
      
      .toggle-thumb::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2));
        border-radius: 50%;
        opacity: 0.8;
      }
      
      .toggle-icons {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 8px;
        z-index: 1;
        pointer-events: none;
      }
      
      .toggle-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.3s ease;
      }
      
      .toggle-icon-sun {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .toggle-icon-moon {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .light-active .toggle-icon-sun {
        color: #ff9d00;
        text-shadow: 0 0 8px rgba(255, 157, 0, 0.5);
      }
      
      .dark-active .toggle-icon-moon {
        color: #a5f3fc;
        text-shadow: 0 0 8px rgba(165, 243, 252, 0.5);
      }
      
      /* Animación de hover */
      .theme-toggle-button:hover {
        transform: translateY(-2px);
      }
      
      .theme-toggle-button:active {
        transform: translateY(0px);
      }
      
      /* Foco para accesibilidad */
      .theme-toggle-button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.5);
      }
      
      /* Para pantallas pequeñas */
      @media (max-width: 480px) {
        .theme-toggle-button {
          width: 60px;
          height: 28px;
        }
        
        .toggle-thumb {
          width: 24px;
          height: 24px;
        }
        
        .light-active .toggle-thumb {
          transform: translateX(32px);
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // Añadir a la página
    toggleContainer.appendChild(toggleButton);
    document.body.appendChild(toggleContainer);
  }

  /**
   * Cambia entre temas oscuro y claro
   */
  toggleTheme() {
    // Cambiar tema
    const newTheme = this.currentTheme === this.DARK_THEME ? this.LIGHT_THEME : this.DARK_THEME;
    
    // Efecto de animación durante el cambio
    this.animateThemeTransition();
    
    // Actualizar botón
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.classList.remove(`${this.currentTheme}-active`);
      toggleButton.classList.add(`${newTheme}-active`);
      toggleButton.setAttribute('aria-label', newTheme === this.DARK_THEME ? 
        'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
    
    // Aplicar nuevo tema
    this.currentTheme = newTheme;
    this.applyTheme(this.currentTheme);
    
    // Guardar preferencia
    localStorage.setItem('theme', this.currentTheme);
    
    console.log(`Tema cambiado a: ${this.currentTheme}`);
  }

  /**
   * Aplica un tema específico
   */
  applyTheme(theme) {
    // Añadir/quitar clase en el html
    document.documentElement.classList.remove(this.DARK_THEME, this.LIGHT_THEME);
    document.documentElement.classList.add(theme);
    
    // Establecer colores del tema
    this.applyThemeStyles(theme);
    
    // Actualizar meta theme-color para móviles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', 
        theme === this.DARK_THEME ? '#0f172a' : '#f8fafc');
    }
  }

  /**
   * Aplica los estilos CSS del tema
   */
  applyThemeStyles(theme) {
    const darkStyles = {
      // Colores de fondo
      '--bg-primary': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--bg-card': 'rgba(30, 41, 59, 0.8)',
      '--bg-tooltip': 'rgba(15, 23, 42, 0.9)',
      '--bg-hover': 'rgba(51, 65, 85, 0.9)',
      
      // Colores de texto
      '--text-primary': '#f8fafc',
      '--text-secondary': '#e2e8f0',
      '--text-tertiary': '#94a3b8',
      '--text-muted': '#64748b',
      
      // Colores de acento
      '--accent-primary': '#e11d48',
      '--accent-secondary': '#fb7185',
      '--accent-tertiary': '#fda4af',
      '--accent-hover': '#be123c',
      '--accent-focus': '#9f1239',
      
      // Bordeados
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--border-light': 'rgba(255, 255, 255, 0.05)',
      '--rounded-sm': '0.25rem',
      '--rounded-md': '0.5rem',
      '--rounded-lg': '1rem',
      
      // Sombras
      '--shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.5)',
      '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.5)',
      '--shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.5), 0 4px 6px rgba(0, 0, 0, 0.5)',
      '--shadow-focus': '0 0 0 3px rgba(225, 29, 72, 0.5)',
      '--backdrop-blur': 'blur(12px)',
      
      // Efectos especiales
      '--gradient-primary': 'linear-gradient(135deg, #e11d48, #be123c)',
      '--gradient-secondary': 'linear-gradient(135deg, #fb7185, #e11d48)',
      '--transition-normal': 'all 0.3s ease',
      '--transition-fast': 'all 0.15s ease',
      
      // Overlay
      '--overlay-light': 'rgba(15, 23, 42, 0.7)',
      '--overlay-dark': 'rgba(15, 23, 42, 0.9)',
      
      // Estados
      '--success-color': '#10b981',
      '--error-color': '#ef4444',
      '--warning-color': '#f59e0b',
      '--info-color': '#0ea5e9'
    };
    
    const lightStyles = {
      // Colores de fondo
      '--bg-primary': '#f8fafc',
      '--bg-secondary': '#f1f5f9',
      '--bg-tertiary': '#e2e8f0',
      '--bg-card': 'rgba(255, 255, 255, 0.8)',
      '--bg-tooltip': 'rgba(255, 255, 255, 0.9)',
      '--bg-hover': 'rgba(226, 232, 240, 0.9)',
      
      // Colores de texto
      '--text-primary': '#0f172a',
      '--text-secondary': '#1e293b',
      '--text-tertiary': '#334155',
      '--text-muted': '#64748b',
      
      // Colores de acento
      '--accent-primary': '#0284c7',
      '--accent-secondary': '#0ea5e9',
      '--accent-tertiary': '#38bdf8',
      '--accent-hover': '#0369a1',
      '--accent-focus': '#075985',
      
      // Bordeados
      '--border-color': 'rgba(0, 0, 0, 0.1)',
      '--border-light': 'rgba(0, 0, 0, 0.05)',
      '--rounded-sm': '0.25rem',
      '--rounded-md': '0.5rem',
      '--rounded-lg': '1rem',
      
      // Sombras
      '--shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
      '--shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      '--shadow-focus': '0 0 0 3px rgba(2, 132, 199, 0.5)',
      '--backdrop-blur': 'blur(12px)',
      
      // Efectos especiales
      '--gradient-primary': 'linear-gradient(135deg, #0284c7, #0369a1)',
      '--gradient-secondary': 'linear-gradient(135deg, #0ea5e9, #0284c7)',
      '--transition-normal': 'all 0.3s ease',
      '--transition-fast': 'all 0.15s ease',
      
      // Overlay
      '--overlay-light': 'rgba(255, 255, 255, 0.7)',
      '--overlay-dark': 'rgba(255, 255, 255, 0.9)',
      
      // Estados
      '--success-color': '#10b981',
      '--error-color': '#ef4444',
      '--warning-color': '#f59e0b',
      '--info-color': '#0ea5e9'
    };
    
    // Aplicar variables CSS
    const styles = theme === this.DARK_THEME ? darkStyles : lightStyles;
    Object.entries(styles).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    
    // Agregar estilos globales para el tema si no existen
    if (!document.getElementById('theme-global-styles')) {
      const globalStyles = document.createElement('style');
      globalStyles.id = 'theme-global-styles';
      globalStyles.textContent = `
        /* Estilos base para ambos temas */
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.5s ease, color 0.5s ease;
        }

        /* Estilos para los botones estándar */
        .btn, button:not(.theme-toggle-button) {
          transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
        }
        
        /* Ajustes para el modo oscuro */
        .dark .container::before,
        .dark .container::after {
          opacity: 0.4;
        }
        
        /* Ajustes para el modo claro */
        .light .container::before,
        .light .container::after {
          opacity: 0.2;
          filter: hue-rotate(190deg);
        }
        
        /* Transiciones suaves para cambios de tema */
        .container, .game-container, .question-card, 
        .rosco-letter, .modal-content, .toast,
        .navbar, .footer, .profile-card, table,
        .card, .answer-input, .status-item, input, textarea {
          transition: background-color 0.5s ease, 
                    color 0.5s ease, 
                    border-color 0.5s ease, 
                    box-shadow 0.5s ease;
        }
      `;
      
      document.head.appendChild(globalStyles);
    }
  }

  /**
   * Escucha cambios en las preferencias del sistema
   */
  listenForSystemPreferenceChanges() {
    // Detectar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Listener para cambios
    const handleSystemThemeChange = (event) => {
      // Solo aplicar si el usuario no ha establecido una preferencia
      if (!localStorage.getItem('theme')) {
        const newTheme = event.matches ? this.DARK_THEME : this.LIGHT_THEME;
        
        // Actualizar botón
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
          toggleButton.classList.remove(`${this.currentTheme}-active`);
          toggleButton.classList.add(`${newTheme}-active`);
        }
        
        // Aplicar tema
        this.currentTheme = newTheme;
        this.applyTheme(this.currentTheme);
        
        console.log(`Tema cambiado según preferencia del sistema: ${this.currentTheme}`);
      }
    };
    
    // Añadir evento
    try {
      // Chrome, Firefox
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } catch (e) {
      try {
        // Safari
        mediaQuery.addListener(handleSystemThemeChange);
      } catch (e2) {
        console.error('No se pudo añadir listener para cambios de tema:', e2);
      }
    }
  }

  /**
   * Anima la transición entre temas
   */
  animateThemeTransition() {
    // Crear overlay para efecto de transición
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    
    // Aplicar estilos
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${this.currentTheme === this.DARK_THEME ? 'rgba(248, 250, 252, 0.1)' : 'rgba(15, 23, 42, 0.1)'};
      backdrop-filter: blur(8px);
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    
    // Añadir al DOM
    document.body.appendChild(overlay);
    
    // Animar
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      
      // Eliminar después de la animación
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
        }, 500);
      }, 200);
    });
  }
}

// Inicializar el theme switcher al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  window.themeSwitcher = new ThemeSwitcher();
}); 