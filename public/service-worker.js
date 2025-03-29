/**
 * PASALA CHE - Service Worker
 * Handles caching and offline capabilities
 */

// Cache name - update version to refresh cache
const CACHE_NAME = 'pasalache-cache-v1';

// Resources to cache on install
const CACHE_ASSETS = [
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
  '/js/game.js',
  '/js/profile.js',
  '/js/ranking.js',
  '/js/utils.js',
  '/js/theme-switcher.js',
  '/manifest.json',
  '/img/favicon.ico',
  // Icons and core images
  '/img/icons/icon-72x72.png',
  '/img/icons/icon-96x96.png',
  '/img/icons/icon-128x128.png',
  '/img/icons/icon-144x144.png',
  '/img/icons/icon-152x152.png',
  '/img/icons/icon-192x192.png',
  '/img/icons/icon-384x384.png',
  '/img/icons/icon-512x512.png',
  '/img/icons/maskable-icon.png',
  // Sound effects
  '/sounds/correct.mp3',
  '/sounds/incorrect.mp3',
  '/sounds/skip.mp3',
  '/sounds/gameover.mp3',
  '/sounds/click.mp3',
  // Font Awesome (from CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&family=Oswald:wght@500;700&display=swap'
];

// Data resources to be handled with stale-while-revalidate strategy
const DATA_ASSETS = [
  '/data/questions.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching app shell and content');
      return cache.addAll(CACHE_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients for new worker');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin && !event.request.url.includes('cdnjs.cloudflare.com') && !event.request.url.includes('fonts.googleapis.com')) {
    return;
  }
  
  // For data resources like questions.json, use stale-while-revalidate
  if (DATA_ASSETS.some(asset => event.request.url.includes(asset))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(error => {
            console.log('[Service Worker] Fetch failed for data; returning from cache', error);
          });
          
          return response || fetchPromise;
        });
      })
    );
    return;
  }
  
  // For HTML pages, network-first approach to always get latest content
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline page if no cached version of the page is available
          if (event.request.url.includes('game.html') || 
              event.request.url.includes('profile.html') || 
              event.request.url.includes('ranking.html')) {
            return caches.match('/offline.html');
          }
          
          return caches.match('/offline.html');
        });
      })
    );
    return;
  }
  
  // For other assets (CSS, JS, images, etc.), cache-first approach
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      
      // Clone the request - requests are one-time use
      const fetchRequest = event.request.clone();
      
      return fetch(fetchRequest).then(response => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response - responses are one-time use
        const responseToCache = response.clone();
        
        // Open the cache and add the new response
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(error => {
        console.log('[Service Worker] Fetch failed; returning offline page', error);
        
        // For images, return a fallback image
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
          return caches.match('/img/offline-image.svg');
        }
        
        // For other resources, fail gracefully
        return new Response('Resource not available offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});

// Periodic background sync for updating game data
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-game-data') {
      event.waitUntil(updateGameData());
    }
  });
}

// Function to update game data in the background
async function updateGameData() {
  try {
    const response = await fetch('/data/questions.json');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/data/questions.json', response);
      console.log('[Service Worker] Successfully updated game data in background');
    }
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
  }
}

// Push notification event handler
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Hay novedades en PASALA CHE',
      icon: '/img/icons/icon-192x192.png',
      badge: '/img/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'PASALA CHE', options)
    );
  } catch (error) {
    console.error('[Service Worker] Push notification error:', error);
    
    // Fallback for non-JSON notifications
    const options = {
      body: event.data.text(),
      icon: '/img/icons/icon-192x192.png',
      badge: '/img/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('PASALA CHE', options)
    );
  }
});

// Notification click event - open the app at the specified URL
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Get the URL from the notification data or default to root
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // Check if there's already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
}); 