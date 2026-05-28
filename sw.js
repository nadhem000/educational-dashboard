const CACHE_NAME = 'edudash-v42'; // bump version when you deploy this

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/header.html',
  '/footer.html',
  '/manifest.json',

  // All card icons (from data_general.js)
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

  // Header icon
  '/assets/icons/icon-96x96.png'
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

// ---------- Skip waiting message ----------
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});