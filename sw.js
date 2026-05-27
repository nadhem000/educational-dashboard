const CACHE_NAME = 'edudash-v13';  // increment with each deploy
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => {
        // Show notification only if no client is focused and app is updated
        if (self.registration.active) {
          self.clients.matchAll({ type: 'window' }).then(clients => {
            if (clients.length === 0) {
              const title = 'Educational Dashboard';
              const options = {
                body: 'A new version is available. Click to update.',
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/icon-96x96.png',
                data: { url: '/' }
              };
              self.registration.showNotification(title, options);
            }
          });
        }
        return self.skipWaiting();
      })
  );
});

// ACTIVATE
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

// FETCH – improved with offline navigation fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // For navigation requests (HTML pages), use network-first, then cache, then offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fall back to cached index.html (or root)
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // For all other requests, cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});

// MESSAGE (SKIP_WAITING from client)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// PERIODIC BACKGROUND SYNC – check for SW updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sw-update-check') {
    event.waitUntil(
      fetch('/sw.js', { cache: 'reload' })
        .then(() => console.log('Periodic SW update check triggered'))
        .catch(err => console.error('Periodic sync fetch failed:', err))
    );
  }
});