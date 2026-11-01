// Easy & Fast Earn - Offline Asset Cache Service Worker
const CACHE_NAME = 'easy-earn-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/about.html',
  '/privacy.html',
  '/terms.html',
  '/contact.html',
  '/disclaimer.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let network handle all API requests and external ad widgets
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('tads.me') || 
      event.request.url.includes('google') ||
      event.request.url.includes('pagead2')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});
