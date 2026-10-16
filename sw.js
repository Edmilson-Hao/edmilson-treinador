/* Service Worker - Edmilson Treinador v2 */
const CACHE_NAME = 'edmilson-v2';
const BASE = self.registration.scope; // funciona em subpath GitHub Pages

const ASSETS = [
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/firebase-config.js',
  'js/shared/utils.js',
  'js/shared/db.js',
  'js/shared/auth.js',
  'js/shared/rateLimit.js',
  'manifest.json',
  'assets/logo.png',
  'assets/icons/icon-192.png'
].map(p => new URL(p, BASE).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS.map(u => cache.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cacheia Firebase, analytics, nem mídia pesada (gif/vídeo)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('giphy.com') ||
    url.hostname.includes('tenor.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.pathname.match(/\.(gif|mp4|webm|mov)(\?|$)/i)
  ) {
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // network first para HTML/JS (atualizações), cache fallback offline
      if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
        return fetched.then(r => r || cached);
      }
      return cached || fetched;
    })
  );
});
