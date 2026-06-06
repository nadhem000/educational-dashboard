// ED-admin-monitor.js – Full capture, token stored in localStorage (shared across tabs)
(function () {
  if (window.__monitorInjected) return;
  window.__monitorInjected = true;

  const STORAGE_KEY = '__admin_logs__';
  const TOKEN_KEY = '__admin_monitor_token__';
  const MAX_ENTRIES = 2000;

  // -----------------------------------------------------------------
  // Check token in localStorage (shared across all tabs)
  // -----------------------------------------------------------------
  function isMonitoringEnabled() {
    return localStorage.getItem(TOKEN_KEY) === 'active';
  }

  // -----------------------------------------------------------------
  // Log storage – only modified when token is present
  // -----------------------------------------------------------------
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

  function add(level, message, extra = {}) {
    if (!isMonitoringEnabled()) return;   // no token → no logs
    const entry = { time: new Date().toISOString(), level, message, ...extra };
    logs.push(entry);
    save();
  }

  // -----------------------------------------------------------------
  // 1. Console interception (log, warn, error, info, debug)
  // -----------------------------------------------------------------
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

  // console.clear
  const origClear = console.clear;
  console.clear = function () {
    add('info', 'console.clear() called');
    origClear.call(console);
  };

  // -----------------------------------------------------------------
  // 2. Global script errors
  // -----------------------------------------------------------------
  window.addEventListener('error', e => {
    if (e.message) {
      add('error', `${e.message} at ${e.filename}:${e.lineno}`, {
        stack: e.error ? e.error.stack : undefined
      });
    }
  });

  // -----------------------------------------------------------------
  // 3. Resource loading errors (capture phase)
  // -----------------------------------------------------------------
  window.addEventListener('error', e => {
    if (!e.message && e.target && e.target !== window) {
      const tag = e.target.tagName || 'resource';
      const src = e.target.src || e.target.href || '';
      add('error', `Failed to load ${tag}: ${src}`);
    }
  }, true);

  // -----------------------------------------------------------------
  // 4. Unhandled promise rejections
  // -----------------------------------------------------------------
  window.addEventListener('unhandledrejection', e => {
    add('unhandledrejection', String(e.reason), {
      stack: e.reason && e.reason.stack ? e.reason.stack : undefined
    });
  });

  // -----------------------------------------------------------------
  // 5. Service Worker messages (logs from SW)
  // -----------------------------------------------------------------
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data) {
      if (event.data.type === 'SW_LOG') {
        add(event.data.level || 'info', event.data.message);
      } else if (event.data.type === 'NEW_VERSION_READY') {
        add('info', 'Service Worker: NEW_VERSION_READY (update ready)');
      }
    }
  });

  // -----------------------------------------------------------------
  // 6. PerformanceObserver – detect failed resource loads
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // 7. Fetch monitoring
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // 8. XMLHttpRequest monitoring
  // -----------------------------------------------------------------
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
  // Copy static properties
  for (const key of Object.keys(OrigXHR)) {
    window.XMLHttpRequest[key] = OrigXHR[key];
  }
  window.XMLHttpRequest.prototype = OrigXHR.prototype;

  // -----------------------------------------------------------------
  // 9. Notify when active (visible in console)
  // -----------------------------------------------------------------
  if (isMonitoringEnabled()) {
    console.log('%c🔍 Admin monitoring ACTIVE (token present)', 'color:#0f0; font-size:14px');
  }
})();