const CACHE_NAME = 'edudash-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json'
];

// ------------------------------------------------------------
// INSTALL
// ------------------------------------------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ------------------------------------------------------------
// ACTIVATE
// ------------------------------------------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ------------------------------------------------------------
// FETCH
// ------------------------------------------------------------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  );
});

// ------------------------------------------------------------
// PUSH NOTIFICATIONS
// ------------------------------------------------------------
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Educational Dashboard';
    const options = {
      body: payload.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: payload.data || {}
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // plain text fallback
    event.waitUntil(
      self.registration.showNotification('Educational Dashboard', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png'
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});