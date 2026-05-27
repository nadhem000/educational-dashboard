const CACHE_NAME = 'edudash-v7';  // increment when you deploy a new version
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
      .then(() => {
        // If there is already an active SW, this is an update → notify
        if (self.registration.active) {
          const title = 'Educational Dashboard';
          const options = {
            body: 'A new version is available. Click to update.',
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-96x96.png',
            data: { url: '/' }
          };
          // Show notification only if the app isn't currently visible
          self.clients.matchAll({ type: 'window' }).then(clients => {
            if (clients.length === 0) {
              self.registration.showNotification(title, options);
            }
          });
        }
        return self.skipWaiting();
      })
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
// MESSAGE (trigger SKIP_WAITING from client)
// ------------------------------------------------------------
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ------------------------------------------------------------
// PERIODIC BACKGROUND SYNC – force SW update check
// ------------------------------------------------------------
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sw-update-check') {
    event.waitUntil(
      // Fetch the SW script with cache: reload to trigger a SW update check
      fetch('/sw.js', { cache: 'reload' })
        .then(() => console.log('Periodic SW update check triggered'))
        .catch(err => console.error('Periodic sync fetch failed:', err))
    );
  }
});