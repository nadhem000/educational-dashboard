// ED-general-pwa.js – PWA & Supabase push notifications
(function () {
  /* ============================================================
     Private state
     ============================================================ */
  let deferredPrompt;
  let isSyncActive = false;

  /* ============================================================
     Helper – convert VAPID public key to Uint8Array
     ============================================================ */
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /* ============================================================
     Supabase – store push subscription
     ============================================================ */
  async function saveSubscription(subscription) {
    const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
    const SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

    const response = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ subscription }),
    });
    if (response.status === 409) return; // duplicate – ok
    if (!response.ok) console.error('Failed to save subscription:', response.status);
  }

  /* ============================================================
     Subscribe to push notifications
     ============================================================ */
  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await saveSubscription(existingSubscription);
      return;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BO2xV3C8PcVFX-2SqsAyHZgzyDBaC0N7GzDktpoX2J5Pj5Cz9IazAcybQqxe13xYqGnEpoVmXM2jHFqmjXko1kw'
      ),
    });
    await saveSubscription(subscription);
    console.log('Push subscription saved');
  }

  /* ============================================================
     Notification button UI
     ============================================================ */
  function updateNotificationUI() {
    const btn = document.getElementById('enableNotifications');
    if (!btn) return;
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        btn.style.display = 'inline-block';
      } else {
        btn.style.display = 'none';
        if (Notification.permission === 'granted') {
          subscribeToPush(); // auto‑subscribe
        }
      }
    } else {
      btn.style.display = 'none';
    }
  }

  /* ============================================================
     PWA install prompt
     ============================================================ */
  function setupInstallPrompt() {
    const installBtn = document.getElementById('installBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.style.display = 'inline-flex';
    });
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install outcome:', outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      if (installBtn) installBtn.style.display = 'none';
    });
  }

  /* ============================================================
     Offline banner
     ============================================================ */
  function setupOfflineBanner() {
    const offlineBanner = document.getElementById('offline-banner');
    if (!offlineBanner) return;
    window.addEventListener('offline', () => {
      offlineBanner.style.display = 'block';
    });
    window.addEventListener('online', () => {
      offlineBanner.style.display = 'none';
    });
    if (!navigator.onLine) offlineBanner.style.display = 'block';
  }

  /* ============================================================
     Service Worker registration & update banner
     ============================================================ */
  function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Only register after the page is really fully loaded and we are in a secure context
  function tryRegister() {
    if (document.readyState !== 'complete' || !window.isSecureContext) {
      setTimeout(tryRegister, 500);
      return;
    }
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              const banner = document.getElementById('update-banner');
              if (banner) banner.style.display = 'flex';
            }
          });
        });
      })
      .catch(err => {
        // Only log if it's not the common InvalidStateError (which we ignore safely)
        if (err.name !== 'InvalidStateError') console.warn('SW could not be registered:', err.message);
      });
  }

  // Wait for a user click or 5 seconds, whichever comes first
  let registered = false;
  const doRegister = () => { if (!registered) { registered = true; tryRegister(); } };
  window.addEventListener('click', doRegister, { once: true });
  window.addEventListener('keydown', doRegister, { once: true });
  setTimeout(doRegister, 5000); // fallback
}

  function setupUpdateBanner() {
    const reloadBtn = document.getElementById('update-reload-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  /* ============================================================
     Periodic Background Sync
     ============================================================ */
  function setupPeriodicSync() {
    const periodicBtn = document.getElementById('enablePeriodicSync');
    if (
      !periodicBtn ||
      !('serviceWorker' in navigator) ||
      !('periodicSync' in ServiceWorkerRegistration.prototype)
    )
      return;
    periodicBtn.style.display = 'inline-block';

    async function checkRegistrationState() {
      try {
        const reg = await navigator.serviceWorker.ready;
        if ('periodicSync' in reg) {
          const tags = await reg.periodicSync.getTags();
          isSyncActive = tags.includes('periodic-update');
        }
      } catch (e) {
        isSyncActive = localStorage.getItem('periodicSyncActive') === 'true';
      }
      refreshButtonText();
    }

    function refreshButtonText() {
      // Call the global function that pages provide to update i18n button text
      if (window.updatePeriodicSyncButton) window.updatePeriodicSyncButton();
      localStorage.setItem('periodicSyncActive', isSyncActive);
    }

    // Make the state‑aware button text updater available globally
    window.updatePeriodicSyncButton = function () {
      const btn = document.getElementById('enablePeriodicSync');
      if (!btn || typeof window.t !== 'function') return;
      const key = isSyncActive ? 'disablePeriodicSyncBtn' : 'enablePeriodicSyncBtn';
      btn.textContent = window.t(key);
    };

    checkRegistrationState();

    periodicBtn.addEventListener('click', async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!('periodicSync' in reg)) return;
      if (isSyncActive) {
        try {
          await reg.periodicSync.unregister('periodic-update');
          isSyncActive = false;
          refreshButtonText();
          alert(window.t ? window.t('periodicSyncDisabled') : 'Background updates disabled!');
        } catch (err) {
          console.error('Unregister failed:', err);
          alert('Could not disable background updates.');
        }
      } else {
        try {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync',
          });
          if (status.state !== 'granted') {
            alert(
              window.t
                ? window.t('periodicSyncDenied')
                : 'Permission not granted. Please check site settings.'
            );
            return;
          }
          await reg.periodicSync.register('periodic-update', {
            minInterval: 6 * 60 * 60 * 1000,
          });
          isSyncActive = true;
          refreshButtonText();
          alert(window.t ? window.t('periodicSyncEnabled') : 'Background updates enabled!');
        } catch (err) {
          console.error('Register failed:', err);
          alert(
            window.t
              ? window.t('periodicSyncDenied')
              : 'Permission not granted. Please check site settings.'
          );
        }
      }
    });
  }

  /* ============================================================
     Public initialisation (call after header/footer are loaded)
     ============================================================ */
  function init() {
    setupInstallPrompt();
    setupOfflineBanner();
    setupServiceWorker();
    setupUpdateBanner();
    updateNotificationUI();
    setupPeriodicSync();

    // Notification button click handler
    const notifBtn = document.getElementById('enableNotifications');
    if (notifBtn) {
      notifBtn.addEventListener('click', async () => {
        await subscribeToPush();
        updateNotificationUI();
      });
    }
  }

  // Expose a global object so pages can call the init
  window.EDPWA = {
    init,
    subscribeToPush,
    updateNotificationUI,
  };
})();