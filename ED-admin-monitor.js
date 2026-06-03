// monitor.js – Early-loading debug monitor
(function () {
  if (window.__monitorInjected) return;
  window.__monitorInjected = true;

  const STORAGE_KEY = '__admin_logs__';
  const MAX_ENTRIES = 2000;

  // Load existing logs
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
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      ...extra
    };
    logs.push(entry);
    save();
  }

  // ---- Console override ----
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

  // ---- Global errors ----
  window.addEventListener('error', e => {
    add('error', `${e.message} at ${e.filename}:${e.lineno}`, {
      stack: e.error ? e.error.stack : undefined
    });
  });

  window.addEventListener('unhandledrejection', e => {
    add('unhandledrejection', String(e.reason), {
      stack: e.reason && e.reason.stack ? e.reason.stack : undefined
    });
  });

  // ---- Network monitoring (fetch) ----
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const start = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
    return origFetch.apply(this, args).then(response => {
      const duration = (performance.now() - start).toFixed(1);
      add('network', `${response.status} ${args[1]?.method || 'GET'} ${url} (${duration}ms)`, {
        status: response.status,
        url,
        method: args[1]?.method || 'GET',
        duration
      });
      return response;
    }).catch(err => {
      add('network', `FETCH ERROR ${url}: ${err.message}`);
      throw err;
    });
  };

  // ---- Network monitoring (XMLHttpRequest) ----
  const OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new OrigXHR();
    const start = performance.now();
    let method, url;
    const origOpen = xhr.open;
    xhr.open = function (m, u) {
      method = m;
      url = u;
      return origOpen.apply(xhr, arguments);
    };
    xhr.addEventListener('loadend', () => {
      const duration = (performance.now() - start).toFixed(1);
      add('network', `${xhr.status} ${method} ${url} (${duration}ms)`, {
        status: xhr.status,
        url,
        method,
        duration
      });
    });
    xhr.addEventListener('error', () => {
      add('network', `XHR ERROR ${method} ${url}`);
    });
    return xhr;
  };
  // Copy static properties
  Object.keys(OrigXHR).forEach(key => { window.XMLHttpRequest[key] = OrigXHR[key]; });
  window.XMLHttpRequest.prototype = OrigXHR.prototype;

  // Signal that monitoring is active (so admin can show status)
  localStorage.setItem('__monitor_active__', 'true');
  console.log('%c🔍 Advanced monitoring active – open /admin to view', 'color:#0f0; font-size:14px');
})();