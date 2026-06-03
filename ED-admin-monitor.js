// monitor.js – Full capture (console, network, errors, resource errors, unhandled rejections)
(function () {
  if (window.__monitorInjected) return;
  window.__monitorInjected = true;

  const STORAGE_KEY = '__admin_logs__';
  const MAX_ENTRIES = 2000;

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
    logs.push({ time: new Date().toISOString(), level, message, ...extra });
    save();
  }

  // Override console methods
  const orig = {};
  ['log', 'warn', 'error', 'info', 'debug'].forEach(m => {
    orig[m] = console[m];
    console[m] = function (...args) {
      orig[m].apply(console, args);
      const text = args.map(a => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch (_) { return String(a); }
        }
        return String(a);
      }).join(' ');
      add(m, text);
    };
  });
// Inside the monitor.js IIFE, after the other listeners
navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data && event.data.type === 'SW_LOG') {
    add(event.data.level, event.data.message);
  }
});
  // Global errors (bubble phase)
  window.addEventListener('error', e => {
    add('error', `${e.message} at ${e.filename}:${e.lineno}`, {
      stack: e.error ? e.error.stack : undefined
    });
  });

  // ***** Resource loading errors (capture phase) *****
  window.addEventListener('error', e => {
    // Only act if it's a resource error (no message property and target is an element)
    if (!e.message && e.target && e.target !== window) {
      const tag = e.target.tagName || 'resource';
      const src = e.target.src || e.target.href || '';
      add('error', `Failed to load ${tag}: ${src}`);
    }
  }, true);   // <--- true = capture phase

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', e => {
    add('unhandledrejection', String(e.reason), {
      stack: e.reason && e.reason.stack ? e.reason.stack : undefined
    });
  });

  // Network monitoring (fetch & XHR) – unchanged
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const start = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
    return origFetch.apply(this, args).then(response => {
      const duration = (performance.now() - start).toFixed(1);
      add('network', `${response.status} ${args[1]?.method || 'GET'} ${url} (${duration}ms)`, {
        status: response.status, url, method: args[1]?.method || 'GET', duration
      });
      return response;
    }).catch(err => {
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
  Object.keys(OrigXHR).forEach(key => { window.XMLHttpRequest[key] = OrigXHR[key]; });
  window.XMLHttpRequest.prototype = OrigXHR.prototype;

  localStorage.setItem('__monitor_active__', 'true');
  console.log('%c🔍 Advanced monitoring active – open /admin to view', 'color:#0f0; font-size:14px');
})();