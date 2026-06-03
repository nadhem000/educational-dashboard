const CACHE_NAME = 'edudash-v123'; // bump version when  deploy
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/data_general.js',
  '/ED-general-pwa.js',
  '/ED-general-cards.js',
  '/ED-general-shortcuts.js',
  '/ED-general-common.css',
  '/header.html',
  '/footer.html',
  '/contact.html',
  '/manifest.json',
  '/widgets/dashboard-widgets.json',
  '/widgets/dashboard-template.json',
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
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-96x96.png'
];

// ---------- Install ----------
self.addEventListener('install', event => {
  const isUpdate = self.registration.active !== null;
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => {
        self.skipWaiting();
        self.isUpdate = isUpdate;
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

  // Notify open clients about version update
  if (self.isUpdate) {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client =>
          client.postMessage({ type: 'NEW_VERSION_READY' })
        );
      })
    );
  }

  // Update all existing widget instances
  if ('widgets' in self) {
    event.waitUntil(
      (async () => {
        const widgets = await self.widgets.matchAll({ installed: true });
        for (const w of widgets) {
          await renderWidgetByTag(w.definition.tag);
        }
      })()
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

// ========== PUSH NOTIFICATION ==========
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

// ========== WIDGET SUPPORT ==========

// Helper to fetch template and data, then render the widget
async function renderWidgetByTag(tag) {
  const widget = await self.widgets.getByTag(tag);
  if (!widget) return;

  const definition = widget.definition;

  // Fetch the Adaptive Card template
  const templateUrl = definition.msAcTemplate;
  const templateResponse = await fetch(templateUrl);
  if (!templateResponse.ok) {
    console.error('Template fetch failed');
    return;
  }
  const template = await templateResponse.text();

  // Fetch the data (if defined)
  let data = '{}';
  if (definition.data) {
    const dataResponse = await fetch(definition.data);
    if (dataResponse.ok) {
      data = await dataResponse.text();
    }
  }

  // Render all instances of this widget
  await self.widgets.updateByTag(tag, { template, data });
}

// When user adds the widget to the dashboard
self.addEventListener('widgetinstall', event => {
  event.waitUntil(renderWidgetByTag(event.widget.definition.tag));
});

// (Optional) Handle widget actions –  template uses Action.OpenUrl,
// which the OS handles automatically, but  must still register the event.
self.addEventListener('widgetclick', event => {
  console.log(`Widget action: ${event.action}`);
});