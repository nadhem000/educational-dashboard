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
            clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
            const options = {
              body: 'A new version is available.',
              icon: '/assets/icons/icon-192x192.png',
              badge: '/assets/icons/icon-96x96.png',
              actions: [{ action: 'update', title: 'Update now' }],
              data: { url: '/' }
            };
            self.registration.showNotification('Educational Dashboard', options);
          });
        }
        return self.skipWaiting();
      })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'update' || !event.action) {
    event.waitUntil(
      self.skipWaiting().then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      }))
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html') || caches.match('/')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});