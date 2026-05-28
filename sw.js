const CACHE_NAME = 'edudash-v38';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json',
  // Essential icons used by the shell (adjust if needed)
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-144x144.png',
  // Uncomment if you want to cache all card icons (add others as needed)
  // '/assets/icons/arabicHub.png',
  // '/assets/icons/englishHub.png',
  // ...
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
      fetch(event.request).catch(() =>
        caches.match('/index.html').then(r => r || caches.match('/'))
      )
    );
    return;
  }

  // All other requests: cache first, with network fallback that never fails
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Return cached copy and refresh cache in background
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return response;
        }).catch(() => {}); // ignore background refresh failures
        // Fire-and-forget background update; we immediately return cached
        // (we don't await this promise)
        return cached;
      }

      // Not cached – try network, with a safe fallback if offline
      return fetch(event.request).then(response => {
        // Optionally cache the response for future offline use
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        // Network completely unavailable – return a minimal response to prevent SW crash
        // For images, you could return a 1x1 transparent GIF or a 404
        // Here, we simply return an empty 404 response
        return new Response('', {
          status: 404,
          statusText: 'Not Found'
        });
      });
    })
  );
});

// ---------- Background Sync ----------
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      fetch('/data_general.js')
        .then(response => {
          if (response.ok) {
            return caches.open(CACHE_NAME).then(cache =>
              cache.put('/data_general.js', response)
            );
          }
        })
        .then(() => {
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
            .catch(() => {})
        )
      ).then(() => {
        console.log('Periodic sync completed');
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