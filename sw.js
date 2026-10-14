/* =====================================================
   SERVICE WORKER - Edmilson Treinador
   Cache de assets + dados de treino para offline
   ===================================================== */

const CACHE_NAME = 'edmilson-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/js/shared/utils.js',
  '/js/shared/db.js',
  '/js/shared/auth.js',
  '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate - limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network first para Firebase, cache first para assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não cacheia chamadas do Firebase / Google
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('google.com')
  ) {
    return; // deixa o browser lidar
  }

  // Assets estáticos → cache first
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});

// Push notifications (básico)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Edmilson Treinador', body: 'Nova notificação' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Edmilson Treinador', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
