const CACHE_NAME = 'edudash-v34';             // bump version
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json'
];

// ---------- Install ----------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ---------- Activate ----------
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

// ---------- Fetch (offline support) ----------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Navigation: network first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Other requests: cache first, then network (and update cache in background)
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => cached);  // if network fails, use cached (or nothing)

      return cached || fetchPromise;
    })
  );
});

// ---------- Background Sync ----------
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Example: re-fetch the data file and update cache
      fetch('/data_general.js')
        .then(response => {
          if (response.ok) {
            return caches.open(CACHE_NAME).then(cache =>
              cache.put('/data_general.js', response)
            );
          }
        })
        .then(() => {
          // Notify all clients that data may have changed
          return self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'DATA_UPDATED' }));
          });
        })
        .catch(err => console.error('Background sync failed:', err))
    );
  }
});

// ---------- Periodic Background Sync ----------
self.addEventListener('periodicsync', event => {
  if (event.tag === 'periodic-update') {
    event.waitUntil(
      // Fetch all important assets and update cache
      Promise.all(
        PRECACHE_ASSETS.map(url =>
          fetch(url, { cache: 'no-cache' })
            .then(response => {
              if (response.ok) {
                return caches.open(CACHE_NAME).then(cache =>
                  cache.put(url, response)
                );
              }
            })
            .catch(() => {})   // ignore failures for individual files
        )
      ).then(() => {
        console.log('Periodic sync completed');
        // Optionally notify clients
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'PERIODIC_UPDATE_DONE' }));
        });
      })
    );
  }
});

// ---------- Skip waiting message ----------
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});