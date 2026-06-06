// ED-admin-monitor.js – Full capture with separate SW pause flag
(function () {
  if (window.__monitorInjected) return;
  window.__monitorInjected = true;

  const STORAGE_KEY = '__admin_logs__';
  const TOKEN_KEY = '__admin_monitor_token__';
  const SW_PAUSE_KEY = '__admin_sw_paused__';   // true = SW logs disabled
  const MAX_ENTRIES = 2000;

  // -----------------------------------------------------------------
  // Flag checks
  // -----------------------------------------------------------------
  function isMonitoringEnabled() {
    return localStorage.getItem(TOKEN_KEY) === 'active';
  }

  function isSWMonitoringEnabled() {
    // SW logs are allowed only if main monitor is active AND SW pause is NOT set
    return isMonitoringEnabled() && localStorage.getItem(SW_PAUSE_KEY) !== 'true';
  }

  // -----------------------------------------------------------------
  // Log storage
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
    if (!isMonitoringEnabled()) return;
    const entry = { time: new Date().toISOString(), level, message, ...extra };
    logs.push(entry);
    save();
  }

  // -----------------------------------------------------------------
  // Console interception (unchanged)
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

  const origClear = console.clear;
  console.clear = function () {
    add('info', 'console.clear() called');
    origClear.call(console);
  };

  // -----------------------------------------------------------------
  // Global errors
  // -----------------------------------------------------------------
  window.addEventListener('error', e => {
    if (e.message) {
      add('error', `${e.message} at ${e.filename}:${e.lineno}`, {
        stack: e.error ? e.error.stack : undefined
      });
    }
  });

  window.addEventListener('error', e => {
    if (!e.message && e.target && e.target !== window) {
      const tag = e.target.tagName || 'resource';
      const src = e.target.src || e.target.href || '';
      add('error', `Failed to load ${tag}: ${src}`);
    }
  }, true);

  window.addEventListener('unhandledrejection', e => {
    add('unhandledrejection', String(e.reason), {
      stack: e.reason && e.reason.stack ? e.reason.stack : undefined
    });
  });

  // -----------------------------------------------------------------
  // Service Worker messages (with independent pause flag)
  // -----------------------------------------------------------------
  navigator.serviceWorker?.addEventListener('message', event => {
    if (!event.data) return;
    // Only log SW messages if SW monitoring is enabled
    if (!isSWMonitoringEnabled()) return;

    if (event.data.type === 'SW_LOG') {
      add(event.data.level || 'info', event.data.message, { source: 'sw' });
    } else if (event.data.type === 'NEW_VERSION_READY') {
      add('info', 'Service Worker: NEW_VERSION_READY (update ready)', { source: 'sw' });
    } else if (event.data.type === 'SW_FETCH') {
      add('network', `SW fetch: ${event.data.method} ${event.data.url}`, { source: 'sw' });
    } else if (event.data.type === 'SW_SYNC') {
      add('info', `SW sync: ${event.data.tag}`, { source: 'sw' });
    } else if (event.data.type === 'SW_PUSH') {
      add('info', `SW push received: ${event.data.data}`, { source: 'sw' });
    }
  });

  // -----------------------------------------------------------------
  // PerformanceObserver – treat 409 as info, not error
  // -----------------------------------------------------------------
  if (window.PerformanceObserver) {
    try {
      const po = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const status = entry.responseStatus || 0;
            if (status === 409) {
              add('info', `Duplicate resource (409): ${entry.name}`, { source: 'resource' });
            } else if (status === 0 || status >= 400) {
              add('error', `Resource error: ${entry.name} (status: ${status})`, { source: 'resource' });
            }
          }
        }
      });
      po.observe({ type: 'resource', buffered: true });
    } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Fetch – treat 409 as info
  // -----------------------------------------------------------------
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const start = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
    return origFetch.apply(this, args)
      .then(response => {
        const duration = (performance.now() - start).toFixed(1);
        const level = response.status === 409 ? 'info' : 'network';
        add(level, `${response.status} ${args[1]?.method || 'GET'} ${url} (${duration}ms)`, {
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
  // XMLHttpRequest – treat 409 as info
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
      const level = xhr.status === 409 ? 'info' : 'network';
      add(level, `${xhr.status} ${method} ${url} (${duration}ms)`, {
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

  // -----------------------------------------------------------------
  // Security: CSP violation logging
  // -----------------------------------------------------------------
  document.addEventListener('securitypolicyviolation', (e) => {
    add('error', `CSP violation: ${e.violatedDirective} – ${e.blockedURI}`, { source: 'security' });
  });

  // -----------------------------------------------------------------
  // Notify when main monitor becomes active
  // -----------------------------------------------------------------
  if (isMonitoringEnabled()) {
    console.log('%c🔍 Admin monitoring ACTIVE (token present)', 'color:#0f0; font-size:14px');
  }
})();