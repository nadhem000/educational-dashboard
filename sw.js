const CACHE_NAME = 'edudash-v173'; // bump version when deploy
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/contact.html',
  '/privacyPolicy.html',
  '/reset-password.html',
  '/signin.html',
  '/termsOfUse.html',
  '/admin.html',
  '/ED-general-common.css',
  '/ED-general-pwa.js',
  '/ED-general-cards.js',
  '/ED-general-shortcuts.js',
  '/ED-general-translations-data.js',
  '/data_general.js',
  '/ED-general-translation.js',
  '/ED-general-analytics.js',
  '/ED-general-init.js',
  '/ED-general-auth.js',
  '/ED-general-profile.js',
  '/ED-general-encrypted-backup.js',
  '/header.html',
  '/footer.html',
  '/manifest.json'
];

// ---------- Helper: send message to all clients ----------
function sendToAllClients(type, data = {}) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type, ...data });
    });
  });
}

// Forward all SW console output to the client (original functionality)
const swConsole = {};
['log','warn','error','info','debug'].forEach(m => {
  swConsole[m] = console[m];
  console[m] = function(...args) {
    swConsole[m].apply(console, args);
    sendToAllClients('SW_LOG', {
      level: m,
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    });
  };
});

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
  // Notify about install event (for debugging)
  sendToAllClients('SW_INSTALL', { isUpdate });
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
    sendToAllClients('NEW_VERSION_READY');
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

  // Notify that activation is complete
  sendToAllClients('SW_ACTIVATE');
});

// ---------- Fetch (offline support) + forward to client ----------
self.addEventListener('fetch', event => {
  // Forward the fetch event to client for monitoring (only the URL and method)
  sendToAllClients('SW_FETCH', {
    url: event.request.url,
    method: event.request.method
  });

  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        // If the URL doesn’t end with .html, try adding .html and matching again
        if (!event.request.url.endsWith('.html')) {
          const withHtml = new URL(event.request.url);
          withHtml.pathname += '.html';
          return caches.match(withHtml).then(htmlCached => htmlCached || caches.match('/index.html'));
        }
        return caches.match('/index.html');
      })
    )
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
  sendToAllClients('SW_SYNC', { tag: event.tag });

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
      self.clients.matchAll().then(clients => {
        // Only update if at least one client is on an unmetered connection
        const allowed = clients.some(client =>
          client.connection?.effectiveType !== 'cellular' &&
          !client.connection?.saveData
        );
        if (!allowed) return;
        return Promise.all(
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
        );
      })
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

  // Forward push event to client for monitoring
  sendToAllClients('SW_PUSH', { data: JSON.stringify(data) });

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

// (Optional) Handle widget actions – template uses Action.OpenUrl,
// which the OS handles automatically, but we must still register the event.
self.addEventListener('widgetclick', event => {
  console.log(`Widget action: ${event.action}`);
});