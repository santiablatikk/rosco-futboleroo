/**
 * PASALA CHE - Theme Switcher
 * Manages theme preferences and allows toggling between dark and light themes
 */

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  initThemeSwitcher();
});

// Inicializar el cambiador de tema
function initThemeSwitcher() {
  // Crear el botón de cambio de tema si no existe
  createThemeSwitcherButton();
  
  // Aplicar el tema guardado o el predeterminado
  applyTheme();
  
  // Configurar eventos para cambio de tema
  setupThemeEvents();
}

// Crear el botón de cambio de tema
function createThemeSwitcherButton() {
  // Verificar si ya existe
  if (document.getElementById('theme-switcher')) return;
  
  // Crear botón flotante
  const switcherButton = document.createElement('button');
  switcherButton.id = 'theme-switcher';
  switcherButton.classList.add('theme-switcher-btn');
  switcherButton.setAttribute('aria-label', 'Cambiar tema');
  switcherButton.setAttribute('title', 'Cambiar tema');
  
  // Iconos para tema claro y oscuro
  switcherButton.innerHTML = `
    <i class="fas fa-moon dark-icon"></i>
    <i class="fas fa-sun light-icon"></i>
  `;
  
  // Añadir estilo para el botón
  const style = document.createElement('style');
  style.textContent = `
    .theme-switcher-btn {
      position: fixed;
      bottom: 30px;
      left: 30px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #334155, #1e293b);
      border: none;
      color: white;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 999;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    .theme-switcher-btn:hover {
      transform: rotate(15deg) scale(1.1);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }
    
    .theme-switcher-btn .dark-icon,
    .theme-switcher-btn .light-icon {
      position: absolute;
      transition: transform 0.5s ease, opacity 0.3s ease;
    }
    
    body.light-theme .theme-switcher-btn {
      background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
      color: #334155;
    }
    
    body.light-theme .theme-switcher-btn .dark-icon {
      transform: translateY(-100%);
      opacity: 0;
    }
    
    body.light-theme .theme-switcher-btn .light-icon {
      transform: translateY(0);
      opacity: 1;
    }
    
    body:not(.light-theme) .theme-switcher-btn .dark-icon {
      transform: translateY(0);
      opacity: 1;
    }
    
    body:not(.light-theme) .theme-switcher-btn .light-icon {
      transform: translateY(100%);
      opacity: 0;
    }
    
    @media (max-width: 768px) {
      .theme-switcher-btn {
        width: 40px;
        height: 40px;
        bottom: 20px;
        left: 20px;
        font-size: 1rem;
      }
    }
    
    /* Estilos para tema claro */
    body.light-theme {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
      color: #1e293b !important;
    }
    
    body.light-theme .app-header,
    body.light-theme .game-header {
      background-color: rgba(255, 255, 255, 0.95) !important;
      border-bottom: 1px solid rgba(203, 213, 225, 0.5) !important;
    }
    
    body.light-theme .title-text {
      color: #0f172a !important;
    }
    
    body.light-theme .subtitle {
      color: #475569 !important;
    }
    
    body.light-theme .content-card,
    body.light-theme .question-card,
    body.light-theme .about-section,
    body.light-theme .content-container {
      background: rgba(255, 255, 255, 0.8) !important;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
      border: 1px solid rgba(203, 213, 225, 0.5) !important;
    }
    
    body.light-theme .btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
    }
    
    body.light-theme .policy-footer {
      background: rgba(255, 255, 255, 0.8) !important;
      border-top: 1px solid rgba(203, 213, 225, 0.5) !important;
    }
    
    body.light-theme .footer-links-mini a {
      color: #334155 !important;
    }
    
    body.light-theme .copyright-text {
      color: #64748b !important;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(switcherButton);
  
  // Evento de clic para cambiar tema
  switcherButton.addEventListener('click', toggleTheme);
}

// Cambiar entre temas
function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Guardar preferencia
  localStorage.setItem('theme', newTheme);
  
  // Aplicar nuevo tema
  applyTheme();
  
  // Animación de transición
  animateThemeChange();
}

// Aplicar el tema actual
function applyTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  
  // Actualizar meta theme-color para coincidir con el tema
  updateMetaThemeColor(savedTheme);
}

// Configurar eventos relacionados con el tema
function setupThemeEvents() {
  // Detectar preferencia del sistema si no hay preferencia guardada
  if (!localStorage.getItem('theme')) {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (prefersDarkScheme.matches) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
    
    applyTheme();
  }
  
  // Escuchar cambios en la preferencia del sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    // Solo cambiar automáticamente si el usuario no ha establecido una preferencia
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', e.matches ? 'dark' : 'light');
      applyTheme();
    }
  });
}

// Actualizar el meta tag theme-color para coincidir con el tema
function updateMetaThemeColor(theme) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  // Si no existe, crear uno nuevo
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    document.head.appendChild(metaThemeColor);
  }
  
  // Establecer color basado en el tema
  metaThemeColor.content = theme === 'light' ? '#f8fafc' : '#0f172a';
}

// Añadir animación al cambiar tema
function animateThemeChange() {
  // Crear elemento para la animación
  const overlay = document.createElement('div');
  overlay.className = 'theme-transition-overlay';
  
  // Estilos para el overlay
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  overlay.style.opacity = '0';
  overlay.style.zIndex = '9998';
  overlay.style.pointerEvents = 'none';
  overlay.style.transition = 'opacity 0.5s ease';
  
  // Añadir al DOM
  document.body.appendChild(overlay);
  
  // Forzar reflow
  void overlay.offsetWidth;
  
  // Animar
  overlay.style.opacity = '0.8';
  
  // Eliminar después de la animación
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 500);
  }, 500);
} 