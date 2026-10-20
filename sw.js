// Service Worker — Edmilson Treinador
// Cache-first shell para offline estável na sessão de treino (mídia online)

const CACHE_NAME = 'edmilson-v5';
const BASE = self.registration.scope;

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

  // Firebase / mídia externa: network only (nunca cache)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('googlevideo.com') ||
    url.hostname.includes('giphy.com') ||
    url.hostname.includes('tenor.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('drive.google.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.pathname.match(/\.(gif|mp4|webm|mov)(\?|$)/i)
  ) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // App shell: cache-first (offline confiável)
  const isShell =
    ASSETS.includes(event.request.url) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html');

  if (isShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Demais: network, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Notificações locais (quando o app agenda via postMessage)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(BASE);
    })
  );
});
