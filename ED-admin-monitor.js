// ED-admin-monitor.js – captures logs ONLY when admin token is present
(function() {
  if (window.__monitorInjected) return;
  window.__monitorInjected = true;

  const STORAGE_KEY = '__admin_logs__';
  const TOKEN_KEY = '__admin_monitor_token__';
  const MAX_ENTRIES = 2000;

  // -----------------------------------------------------------------
  // Only proceed if the admin token is present in sessionStorage
  // -----------------------------------------------------------------
  function isMonitoringEnabled() {
    return sessionStorage.getItem(TOKEN_KEY) === 'active';
  }

  // -----------------------------------------------------------------
  // Load existing logs (but don't add new ones if token missing)
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
    if (!isMonitoringEnabled()) return;   // <-- critical guard
    const entry = { time: new Date().toISOString(), level, message, ...extra };
    logs.push(entry);
    save();
  }

  // -----------------------------------------------------------------
  // Console overrides (same as before, but guarded by add())
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

  // Global errors
  window.addEventListener('error', e => {
    if (e.message) {
      add('error', `${e.message} at ${e.filename}:${e.lineno}`, {
        stack: e.error ? e.error.stack : undefined
      });
    }
  });

  // Resource loading errors
  window.addEventListener('error', e => {
    if (!e.message && e.target && e.target !== window) {
      const tag = e.target.tagName || 'resource';
      const src = e.target.src || e.target.href || '';
      add('error', `Failed to load ${tag}: ${src}`);
    }
  }, true);

  // Unhandled rejections
  window.addEventListener('unhandledrejection', e => {
    add('unhandledrejection', String(e.reason), {
      stack: e.reason && e.reason.stack ? e.reason.stack : undefined
    });
  });

  // Service Worker messages
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data) {
      if (event.data.type === 'SW_LOG') {
        add(event.data.level || 'info', event.data.message);
      } else if (event.data.type === 'NEW_VERSION_READY') {
        add('info', 'Service Worker: NEW_VERSION_READY (update ready)');
      }
    }
  });

  // PerformanceObserver for failed resources
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

  // Fetch & XHR interceptions (same as original, guarded)
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
  for (const key of Object.keys(OrigXHR)) {
    window.XMLHttpRequest[key] = OrigXHR[key];
  }
  window.XMLHttpRequest.prototype = OrigXHR.prototype;

  // Optional: log when monitoring becomes active (admin will see in console)
  if (isMonitoringEnabled()) {
    console.log('%c🔍 Admin monitoring ACTIVE (token present)', 'color:#0f0; font-size:14px');
  }
})();