// monitor.js – Ultimate capture with pause/resume support
(function () {
  if (window.__monitorInjected) return;
  window.__monitorInjected = true;

  const STORAGE_KEY = '__admin_logs__';
  const PAUSE_KEY = '__monitor_paused__';
  const MAX_ENTRIES = 2000;

  // ---------------------------------------------------------------
  // 1. Load existing logs & pause state
  // ---------------------------------------------------------------
  let logs = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) logs = JSON.parse(saved);
  } catch (_) {}

  function save() {
    try {
      if (logs.length > MAX_ENTRIES) logs = logs.slice(-MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (_) {}
  }

  // ---------------------------------------------------------------
  // 2. Pause / resume (checks a localStorage flag)
  // ---------------------------------------------------------------
  function isPaused() {
    return localStorage.getItem(PAUSE_KEY) === 'true';
  }

  // ---------------------------------------------------------------
  // 3. Add an entry (skips when paused)
  // ---------------------------------------------------------------
  function add(level, message, extra = {}) {
    if (isPaused()) return;   // <-- PAUSE CHECK
    const entry = { time: new Date().toISOString(), level, message, ...extra };
    logs.push(entry);
    save();
  }

  // ---------------------------------------------------------------
  // 4. Proxy‑based console override (bulletproof)
  // ---------------------------------------------------------------
  const origConsole = {};
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    origConsole[method] = console[method];
    Object.defineProperty(console, method, {
      get() {
        return function (...args) {
          origConsole[method].apply(console, args);
          const text = args.map(a => {
            if (a instanceof Error) return a.stack || a.message;
            if (typeof a === 'object') {
              try { return JSON.stringify(a, null, 2); } catch (_) { return String(a); }
            }
            return String(a);
          }).join(' ');
          add(method, text);
        };
      },
      configurable: true
    });
  });

  // Capture console.clear calls
  const origClear = console.clear;
  console.clear = function () {
    add('info', 'console.clear() called');
    origClear.call(console);
  };

  // ---------------------------------------------------------------
  // 5. Global script errors (bubble phase)
  // ---------------------------------------------------------------
  window.addEventListener('error', e => {
    if (e.message) {
      add('error', `${e.message} at ${e.filename}:${e.lineno}`, {
        stack: e.error ? e.error.stack : undefined
      });
    }
  });

  // ---------------------------------------------------------------
  // 6. Resource loading errors (capture phase)
  // ---------------------------------------------------------------
  window.addEventListener('error', e => {
    if (!e.message && e.target && e.target !== window) {
      const tag = e.target.tagName || 'resource';
      const src = e.target.src || e.target.href || '';
      add('error', `Failed to load ${tag}: ${src}`);
    }
  }, true);

  // ---------------------------------------------------------------
  // 7. Unhandled promise rejections
  // ---------------------------------------------------------------
  window.addEventListener('unhandledrejection', e => {
    add('unhandledrejection', String(e.reason), {
      stack: e.reason && e.reason.stack ? e.reason.stack : undefined
    });
  });

  // ---------------------------------------------------------------
  // 8. Service Worker messages (forwarded SW logs & update notices)
  // ---------------------------------------------------------------
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data) {
      if (event.data.type === 'SW_LOG') {
        add(event.data.level || 'info', event.data.message);
      } else if (event.data.type === 'NEW_VERSION_READY') {
        add('info', 'Service Worker: NEW_VERSION_READY (update ready)');
      }
    }
  });

  // ---------------------------------------------------------------
  // 9. PerformanceObserver – detect failed resource loads
  // ---------------------------------------------------------------
  if (window.PerformanceObserver) {
    try {
      const po = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const status = entry.responseStatus || 0;
            if (status === 0 || status >= 400) {
              add('error', `Resource error: ${entry.name} (status: ${status})`);
            }
          }
        }
      });
      po.observe({ type: 'resource', buffered: true });
    } catch (_) {}
  }

  // ---------------------------------------------------------------
  // 10. Network monitoring – fetch()
  // ---------------------------------------------------------------
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const start = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
    return origFetch.apply(this, args)
      .then(response => {
        const duration = (performance.now() - start).toFixed(1);
        add('network', `${response.status} ${args[1]?.method || 'GET'} ${url} (${duration}ms)`, {
          status: response.status, url, method: args[1]?.method || 'GET', duration
        });
        return response;
      })
      .catch(err => {
        add('network', `FETCH ERROR ${url}: ${err.message}`);
        throw err;
      });
  };

  // ---------------------------------------------------------------
  // 11. Network monitoring – XMLHttpRequest
  // ---------------------------------------------------------------
  const OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new OrigXHR();
    const start = performance.now();
    let method, url;
    const origOpen = xhr.open;
    xhr.open = function (m, u) {
      method = m; url = u;
      return origOpen.apply(xhr, arguments);
    };
    xhr.addEventListener('loadend', () => {
      const duration = (performance.now() - start).toFixed(1);
      add('network', `${xhr.status} ${method} ${url} (${duration}ms)`, {
        status: xhr.status, url, method, duration
      });
    });
    xhr.addEventListener('error', () => {
      add('network', `XHR ERROR ${method} ${url}`);
    });
    return xhr;
  };
  // Copy static properties and prototype
  for (const key of Object.keys(OrigXHR)) {
    window.XMLHttpRequest[key] = OrigXHR[key];
  }
  window.XMLHttpRequest.prototype = OrigXHR.prototype;

  // ---------------------------------------------------------------
  // 12. Final activation
  // ---------------------------------------------------------------
  localStorage.setItem('__monitor_active__', 'true');
  console.log('%c🔍 Ultimate monitoring active – open /admin to view', 'color:#0f0; font-size:14px');
})();