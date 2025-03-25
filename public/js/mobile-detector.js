/**
 * Mobile Detector for PASALA CHE
 * 
 * This script detects if the user is on a mobile device and redirects
 * to the mobile-optimized version of the game automatically.
 */

(function() {
  // Función para detectar si es un dispositivo móvil
  function isMobileDevice() {
    // Check if the user agent string contains mobile indicators
    const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Check screen width (common mobile breakpoint is 768px)
    const isMobileWidth = window.innerWidth <= 768;
    
    // Check if touch is the primary input method
    const isTouchDevice = ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0) ||
                         (navigator.msMaxTouchPoints > 0);
    
    return mobileKeywords.test(navigator.userAgent) || (isMobileWidth && isTouchDevice);
  }

  // Función para establecer cookie
  function setCookie(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
  }

  // Función para obtener cookie
  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Función para redirigir a la versión móvil
  function redirectToMobileVersion() {
    // Solo redirigir si estamos en la página del juego y no ya en la versión móvil
    const currentPath = window.location.pathname;
    if (currentPath.includes('game.html') && !currentPath.includes('game-mobile.html')) {
      // Verificar si hay preferencia guardada
      const preferDesktop = getCookie('preferDesktop');
      if (preferDesktop === 'true') {
        // El usuario prefiere la versión desktop incluso en móvil
        document.body.classList.add('mobile-device');
        return;
      }
      
      // Construir URL de la versión móvil
      const currentUrl = window.location.href;
      const mobileUrl = currentUrl.replace('game.html', 'game-mobile.html');
      
      // Comprobar si la versión móvil existe antes de redirigir
      fetch(new URL('game-mobile.html', window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))).href, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // La versión móvil existe, redirigir
            window.location.href = mobileUrl;
          } else {
            // La versión móvil no existe, aplicar estilos responsivos
            document.body.classList.add('mobile-device');
          }
        })
        .catch(error => {
          // Error al comprobar, aplicar estilos responsivos
          console.log('Error al comprobar versión móvil, usando diseño responsivo', error);
          document.body.classList.add('mobile-device');
        });
    }
  }

  // Función para agregar botón de cambio de versión
  function addVersionToggle() {
    // Si estamos en versión móvil, agregar botón para cambiar a versión desktop
    if (window.location.href.includes('game-mobile.html')) {
      const container = document.querySelector('.game-footer') || document.body;
      const toggleButton = document.createElement('button');
      toggleButton.className = 'version-toggle';
      toggleButton.innerHTML = '<i class="fas fa-desktop"></i> Versión Escritorio';
      toggleButton.style.margin = '10px auto';
      toggleButton.style.display = 'block';
      toggleButton.style.padding = '8px 15px';
      toggleButton.style.background = 'rgba(30, 41, 59, 0.8)';
      toggleButton.style.color = 'white';
      toggleButton.style.border = '1px solid rgba(100, 150, 255, 0.3)';
      toggleButton.style.borderRadius = '8px';
      
      toggleButton.addEventListener('click', function() {
        setCookie('preferDesktop', 'true', 30);
        window.location.href = window.location.href.replace('game-mobile.html', 'game.html');
      });
      
      container.appendChild(toggleButton);
    }
    // Si estamos en versión desktop con clase mobile-device, agregar botón para cambiar a móvil
    else if (document.body.classList.contains('mobile-device')) {
      const container = document.querySelector('.policy-footer') || document.body;
      const toggleButton = document.createElement('button');
      toggleButton.className = 'version-toggle';
      toggleButton.innerHTML = '<i class="fas fa-mobile-alt"></i> Versión Móvil';
      toggleButton.style.margin = '10px auto';
      toggleButton.style.display = 'block';
      toggleButton.style.padding = '8px 15px';
      toggleButton.style.background = 'rgba(30, 41, 59, 0.8)';
      toggleButton.style.color = 'white';
      toggleButton.style.border = '1px solid rgba(100, 150, 255, 0.3)';
      toggleButton.style.borderRadius = '8px';
      
      toggleButton.addEventListener('click', function() {
        setCookie('preferDesktop', 'false', 30);
        if (window.location.href.includes('game.html')) {
          window.location.href = window.location.href.replace('game.html', 'game-mobile.html');
        }
      });
      
      container.appendChild(toggleButton);
    }
  }

  // Ejecutar detección cuando se carga la página
  document.addEventListener('DOMContentLoaded', function() {
    if (isMobileDevice()) {
      redirectToMobileVersion();
    }
    
    // Agregar botón de cambio después de un corto retraso para que se cargue el DOM
    setTimeout(addVersionToggle, 1000);
  });
})(); 