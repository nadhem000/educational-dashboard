const CACHE_NAME = 'edudash-v52'; // bump version when you deploy

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json',

  '/assets/icons/arabicHub.png',
  '/assets/icons/englishHub.png',
  '/assets/icons/mathematicsHub.png',
  '/assets/icons/frenchHub.png',
  '/assets/icons/naturalScienceHub.png',
  '/assets/icons/physicsHub.png',
  '/assets/icons/philosophyHub.png',
  '/assets/icons/testsHub.png',
  '/assets/icons/wesnothTools.png',
  '/assets/icons/wesnothEditor.png',
  '/assets/icons/wesnothTimeline.png',
  '/assets/icons/multiTasksCalendar.png',
  '/assets/icons/codeHub.png',
  '/assets/icons/spiritualGuideHub.png',
  '/assets/icons/spiritArchetype.png',
  '/assets/icons/documentsManager.png',
  '/assets/icons/bacHistoryGeographyQuiz.png',
  '/assets/icons/gameHub.png',
  '/assets/icons/cosmicNews.png',
  '/assets/icons/nocTunisia.png',
  '/assets/icons/mmathematicsCalculators.png',
  '/assets/icons/calendarMultiTaskOld.png',
  '/assets/icons/encyclopediaOfCivilisations.png',
  '/assets/icons/spiritualConsultation.png',
  '/assets/icons/spiritualConsultationTest.png',
  '/assets/icons/wesnothTimelineOld.png',
  '/assets/icons/interactiveTimelineEditor.png',
  '/assets/icons/oldQuizGame.png',
  '/assets/icons/mathematicsHubOld.png',
  '/assets/icons/simpleTestAppOld.png',
  '/assets/icons/newsTestTestingShares.png',
  '/assets/icons/icon-96x96.png'
];

// ---------- Install ----------
self.addEventListener('install', event => {
  const isUpdate = self.registration.active !== null; // true if this is an update

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => {
        self.skipWaiting();
        self.isUpdate = isUpdate; // store for later use
      })
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

  // Notify all open clients if this is a version update (not first install)
  if (self.isUpdate) {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client =>
          client.postMessage({ type: 'NEW_VERSION_READY' })
        );
      })
    );
  }
});

// ---------- Fetch (offline support) ----------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
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
      )
    );
  }
});

// ========== REAL PUSH EVENT ==========
self.addEventListener('push', event => {
  let data = { title: 'Update Available', body: 'A new version is ready.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icons/icon-96x96.png',
      badge: '/assets/icons/icon-64x64.png',
      tag: 'version-update',
      requireInteraction: true
    })
  );
});

// ========== NOTIFICATION CLICK ==========
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.notification.tag === 'version-update') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            return;
          }
        }
        // No window open – open the app
        return clients.openWindow('/');
      })
    );
  }
});
// ---------- Skip waiting message (manual) ----------
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});