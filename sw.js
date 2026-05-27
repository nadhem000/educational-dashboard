const CACHE_NAME = 'edudash-v15';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => {
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

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'sw-update-check') {
    event.waitUntil(
      fetch('/sw.js', { cache: 'reload' })
        .then(() => console.log('Periodic SW update check triggered'))
        .catch(err => console.error('Periodic sync fetch failed:', err))
    );
  }
});