/**
 * PASALA CHE - Service Worker
 * Handles caching, offline support, and PWA functionality
 */

// Nombres de las cachés
const CACHE_NAME = 'pasala-che-v1';
const DYNAMIC_CACHE_NAME = 'pasala-che-dynamic-v1';

// Archivos a precargar en la caché principal
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/game.html',
  '/profile.html',
  '/ranking.html',
  '/about.html',
  '/offline.html',
  '/css/styles.css',
  '/css/game-styles.css',
  '/css/footer-styles.css',
  '/css/pages.css',
  '/js/utils.js',
  '/js/game.js',
  '/js/profile.js',
  '/js/ranking.js',
  '/img/icons/icon-192x192.png',
  '/img/icons/icon-512x512.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&family=Oswald:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Archivos de sonido (pueden ser grandes, considerarlos opcionales)
const AUDIO_ASSETS = [
  '/sounds/correct.mp3',
  '/sounds/incorrect.mp3',
  '/sounds/skip.mp3',
  '/sounds/gameover.mp3',
  '/sounds/click.mp3'
];

// Instalar el Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Esperar hasta que todas las promesas se completen
  event.waitUntil(
    Promise.all([
      // Caché principal (recursos críticos)
      caches.open(CACHE_NAME).then(cache => {
        console.log('[Service Worker] Precargando recursos principales...');
        return cache.addAll(PRECACHE_ASSETS);
      }),
      
      // Caché de recursos de audio (opcionales)
      caches.open('audio-cache-v1').then(cache => {
        console.log('[Service Worker] Precargando recursos de audio...');
        // Uso de Promise.allSettled para continuar incluso si algunos fallan
        return Promise.allSettled(
          AUDIO_ASSETS.map(url => cache.add(url).catch(error => {
            console.log(`[Service Worker] Error al precargar audio: ${url}`, error);
          }))
        );
      })
    ]).then(() => {
      console.log('[Service Worker] Instalación completada');
      // Forzar que el nuevo service worker tome el control inmediatamente
      return self.skipWaiting();
    })
  );
});

// Activar el Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  
  // Borrar cachés antiguas
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== 'audio-cache-v1') {
            console.log('[Service Worker] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] ¡Ahora está activo!');
      // Reclamar clientes para que el service worker tome el control inmediatamente
      return self.clients.claim();
    })
  );
});

// Interceptar solicitudes de red
self.addEventListener('fetch', event => {
  // Ignorar solicitudes POST o a servicios externos excepto fuentes
  if (event.request.method !== 'GET' || 
      (!event.request.url.includes(self.location.origin) && 
       !event.request.url.includes('fonts.googleapis') && 
       !event.request.url.includes('cdnjs.cloudflare'))) {
    return;
  }
  
  // Estrategia: Cache first, falling back to network and updating cache
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Si está en caché, devolver la respuesta de caché
      if (cachedResponse) {
        // En segundo plano, actualizar la caché con la versión más reciente
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(err => {
          console.log('[Service Worker] Error al actualizar caché:', err);
        });
        
        return cachedResponse;
      }
      
      // Si no está en caché, buscar en red
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Clonar la respuesta para guardarla en caché
        let responseToCache = networkResponse.clone();
        
        // Guardar en caché dinámica
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(error => {
        console.log('[Service Worker] Error de red:', error);
        
        // Si es una navegación a una página HTML, mostrar página offline
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/offline.html');
        }
        
        // Para otros recursos, devolver fallback genérico en lugar de placeholder
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
          // Don't attempt to return a placeholder image that doesn't exist
          return new Response('Image not available offline', { 
            status: 200, 
            headers: { 'Content-Type': 'text/plain' } 
          });
        }
      });
    })
  );
});

// Escuchar mensajes de clientes (desde la aplicación)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Forzar actualización de service worker
    self.skipWaiting();
  }
});

// Escuchar eventos push para notificaciones
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Hay nuevas noticias de PASALA CHE.',
      icon: '/img/icons/icon-192x192.png',
      badge: '/img/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'PASALA CHE', 
        options
      )
    );
  } catch (error) {
    console.error('[Service Worker] Error al procesar notificación push:', error);
  }
});

// Manejar clics en notificaciones push
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Intentar abrir una ventana existente o crear una nueva
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // URL a abrir (de la notificación o por defecto)
      const urlToOpen = event.notification.data && event.notification.data.url 
        ? event.notification.data.url 
        : '/';
      
      // Intentar encontrar una ventana abierta para navegar
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Si no hay ventanas abiertas, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gestión de sincronización en segundo plano
self.addEventListener('sync', event => {
  if (event.tag === 'sync-profile-data') {
    event.waitUntil(syncData());
  }
});

// Función para sincronizar datos pendientes con el servidor
async function syncData() {
  try {
    // Comprobar si hay datos pendientes de sincronizar
    const dbPromise = await idb.openDB('pasala-che-store', 1);
    const tx = dbPromise.transaction('pending-items', 'readonly');
    const store = tx.objectStore('pending-items');
    const items = await store.getAll();
    
    if (items.length > 0) {
      // Intentar sincronizar cada elemento pendiente
      await Promise.all(items.map(async (item) => {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          // Si la sincronización es exitosa, eliminar de pendientes
          const deleteTx = dbPromise.transaction('pending-items', 'readwrite');
          await deleteTx.objectStore('pending-items').delete(item.id);
        }
      }));
    }
  } catch (error) {
    console.error('[Service Worker] Error al sincronizar datos:', error);
    throw error; // Para que el evento de sincronización se pueda reintentar
  }
} 