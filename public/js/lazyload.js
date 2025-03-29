/**
 * PASALA CHE - LazyLoad Module
 * Optimiza la carga de imágenes para mejorar el rendimiento del sitio
 */

class LazyLoader {
  constructor(options = {}) {
    // Opciones por defecto
    this.options = {
      rootMargin: '0px 0px 200px 0px',
      threshold: 0.1,
      loadingClass: 'lazy-loading',
      loadedClass: 'lazy-loaded',
      errorClass: 'lazy-error',
      ...options
    };
    
    // Elementos a cargar perezosamente
    this.lazyElements = [];
    
    // Observer para detectar elementos visibles
    this.observer = null;
    
    // Soporte para navegadores antiguos
    this.supportsIntersectionObserver = 'IntersectionObserver' in window;
    
    // Inicializar
    this.init();
  }
  
  /**
   * Inicializa el lazy loader
   */
  init() {
    // Seleccionar todas las imágenes con atributo data-src
    this.lazyElements = Array.from(document.querySelectorAll('img[data-src], video[data-src], iframe[data-src], .lazy-background'));
    
    if (this.lazyElements.length === 0) {
      return;
    }
    
    // Añadir clase de cargando a todos los elementos lazy
    this.lazyElements.forEach(element => {
      element.classList.add(this.options.loadingClass);
    });
    
    // Usar IntersectionObserver si está disponible
    if (this.supportsIntersectionObserver) {
      this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      });
      
      this.lazyElements.forEach(element => {
        this.observer.observe(element);
      });
    } else {
      // Fallback para navegadores antiguos
      this.loadImagesImmediately();
      
      // Añadir listener para scroll/resize
      window.addEventListener('scroll', this.throttle(this.loadVisibleImages.bind(this), 200));
      window.addEventListener('resize', this.throttle(this.loadVisibleImages.bind(this), 200));
    }
  }
  
  /**
   * Maneja elementos que cruzan el viewport
   */
  onIntersection(entries) {
    entries.forEach(entry => {
      // Cargar elemento si es visible
      if (entry.isIntersecting) {
        this.loadElement(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
    
    // Eliminar observer si ya no quedan elementos
    if (this.lazyElements.length === 0 && this.observer) {
      this.observer.disconnect();
    }
  }
  
  /**
   * Carga un elemento (imagen, video, iframe o fondo)
   */
  loadElement(element) {
    // Remover del array de elementos
    this.lazyElements = this.lazyElements.filter(el => el !== element);
    
    try {
      if (element.classList.contains('lazy-background')) {
        // Cargar imagen de fondo
        const src = element.getAttribute('data-src');
        element.style.backgroundImage = `url(${src})`;
      } else {
        // Cargar src de la imagen, video o iframe
        const src = element.getAttribute('data-src');
        const srcset = element.getAttribute('data-srcset');
        
        if (src) {
          element.src = src;
        }
        
        if (srcset) {
          element.srcset = srcset;
        }
      }
      
      // Añadir eventos para controlar la carga
      element.addEventListener('load', () => {
        this.markAsLoaded(element);
      });
      
      element.addEventListener('error', () => {
        this.markAsError(element);
      });
      
      // Para elementos que no disparan load/error
      if (element.complete) {
        this.markAsLoaded(element);
      }
    } catch (error) {
      console.error('Error al cargar elemento lazy:', error);
      this.markAsError(element);
    }
  }
  
  /**
   * Marca un elemento como cargado correctamente
   */
  markAsLoaded(element) {
    element.classList.remove(this.options.loadingClass);
    element.classList.add(this.options.loadedClass);
    
    // Aplicar efecto de aparición
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.transition = 'opacity 0.5s ease-in-out';
      element.style.opacity = '1';
    }, 50);
    
    // Disparar evento personalizado
    element.dispatchEvent(new CustomEvent('lazyloaded'));
  }
  
  /**
   * Marca un elemento que falló al cargar
   */
  markAsError(element) {
    element.classList.remove(this.options.loadingClass);
    element.classList.add(this.options.errorClass);
    
    // Disparar evento personalizado
    element.dispatchEvent(new CustomEvent('lazyerror'));
  }
  
  /**
   * Carga inmediatamente todas las imágenes (fallback)
   */
  loadImagesImmediately() {
    this.lazyElements.forEach(element => {
      this.loadElement(element);
    });
  }
  
  /**
   * Carga las imágenes que están visibles en el viewport
   */
  loadVisibleImages() {
    // Obtener posición de la ventana
    const pageYOffset = window.pageYOffset;
    const pageXOffset = window.pageXOffset;
    
    // Verificar si cada elemento está en el viewport
    this.lazyElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const isVisible = (
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) + parseInt(this.options.rootMargin) &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      if (isVisible) {
        this.loadElement(element);
      }
    });
  }
  
  /**
   * Función para limitar la frecuencia de ejecución (throttle)
   */
  throttle(fn, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) {
        return;
      }
      lastCall = now;
      return fn(...args);
    };
  }
  
  /**
   * Actualiza la lista de elementos lazy
   * Útil cuando se añaden elementos dinámicamente al DOM
   */
  update() {
    const newElements = Array.from(document.querySelectorAll('img[data-src], video[data-src], iframe[data-src], .lazy-background'))
      .filter(element => !element.classList.contains(this.options.loadedClass) && !element.classList.contains(this.options.errorClass));
    
    // Añadir solo los elementos nuevos
    newElements.forEach(element => {
      if (!this.lazyElements.includes(element)) {
        this.lazyElements.push(element);
        element.classList.add(this.options.loadingClass);
        
        if (this.supportsIntersectionObserver && this.observer) {
          this.observer.observe(element);
        }
      }
    });
    
    // Si no hay IntersectionObserver, cargar las imágenes visibles
    if (!this.supportsIntersectionObserver) {
      this.loadVisibleImages();
    }
  }
}

// Inicializar el lazy loader cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.lazyLoader = new LazyLoader();
  
  // Exponer método para actualizar elementos lazy
  window.updateLazyLoader = () => {
    window.lazyLoader.update();
  };
});

/**
 * Utilización:
 * 
 * 1. Para imágenes:
 * <img data-src="ruta/a/imagen.jpg" alt="Descripción" class="lazy-loading">
 * 
 * 2. Para imágenes con srcset:
 * <img data-src="ruta/a/imagen.jpg" data-srcset="ruta/a/imagen-sm.jpg 600w, ruta/a/imagen.jpg 1200w" alt="Descripción" class="lazy-loading">
 * 
 * 3. Para fondos de elementos:
 * <div data-src="ruta/a/imagen.jpg" class="lazy-background lazy-loading"></div>
 * 
 * 4. Para actualizar después de cargar contenido dinámico:
 * fetch('/nuevo-contenido')
 *   .then(res => res.text())
 *   .then(html => {
 *     document.getElementById('contenedor').innerHTML = html;
 *     window.updateLazyLoader();
 *   });
 */ 