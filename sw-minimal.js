const CACHE_NAME = 'pwabuilder-pass-v1';
const PRECACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .catch(() => new Response(
          '<!DOCTYPE html><html><body><h1>Offline</h1></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        ))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(r => r || fetch(event.request))
    );
  }
});