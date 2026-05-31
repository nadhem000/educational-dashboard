// ED-general-init.js
// Shared startup logic for index.html and contact.html
(function() {
  // --- Error handlers ---
  window.addEventListener('error', function(event) {
    const entry = {
      time: new Date().toISOString(),
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    };
    const errors = JSON.parse(localStorage.getItem('startupErrors') || '[]');
    errors.push(entry);
    localStorage.setItem('startupErrors', JSON.stringify(errors));
  });
  window.addEventListener('unhandledrejection', function(event) {
    const entry = {
      time: new Date().toISOString(),
      reason: String(event.reason),
    };
    const errors = JSON.parse(localStorage.getItem('startupErrors') || '[]');
    errors.push(entry);
    localStorage.setItem('startupErrors', JSON.stringify(errors));
  });

  // --- Theme ---
  let currentTheme = localStorage.getItem('dashboardTheme') || 'light';
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('dashboardTheme', currentTheme);
    if (window.applyCardPalettes) applyCardPalettes(currentTheme);
  }
  function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
  }

  // --- Connection status ---
  function updateConnectionStatus() {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('connection-status-label');
    const statusSpan = document.getElementById('connection-status');
    if (!dot || !statusSpan) return;
    const online = navigator.onLine;
    dot.className = 'status-dot' + (online ? '' : ' offline');
    if (label) label.textContent = online
      ? EDTranslation.getText('onlineStatus')
      : EDTranslation.getText('offlineStatus');
    statusSpan.title = online
      ? EDTranslation.getText('onlineStatus')
      : EDTranslation.getText('offlineStatus');
  }
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  // Also re‑translate the status text when the language changes
  document.addEventListener('translationsApplied', updateConnectionStatus);

  // --- Load header & footer ---
  async function loadComponent(url, targetId) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load ${url}`);
    document.getElementById(targetId).innerHTML = await resp.text();
  }

  async function loadHeaderFooter() {
    try {
      await loadComponent('header.html', 'header-container');
      await loadComponent('footer.html', 'footer-container');
    } catch (err) {
      console.warn('Header/footer fallback used.');
      document.getElementById('header-container').innerHTML = `
        <header style="padding:1rem; background:var(--ED-General-color-surface); border-bottom:1px solid var(--ED-General-color-border);">
          <h1 style="color:var(--ED-General-color-text-primary);">Mejri Ziad</h1>
        </header>`;
      document.getElementById('footer-container').innerHTML = `
        <footer style="padding:1rem; text-align:center; color:var(--ED-General-color-text-secondary);">Contact page</footer>`;
    }
  }

// ------ Rating hearts (footer) ------
function setupRating() {
    const heartsContainer = document.getElementById('rateHearts');
    if (!heartsContainer) return;

    const hearts = heartsContainer.querySelectorAll('.heart');
    const STORAGE_KEY = 'appRating';   // local storage key

    // Load saved rating
    let currentRating = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;

    function updateHearts() {
        hearts.forEach(heart => {
            const rating = parseInt(heart.getAttribute('data-rating'), 10);
            if (rating <= currentRating) {
                heart.classList.add('active');
            } else {
                heart.classList.remove('active');
            }
        });
    }

    // Click handler
    hearts.forEach(heart => {
        heart.addEventListener('click', () => {
            const rating = parseInt(heart.getAttribute('data-rating'), 10);
            // If the same heart is clicked again, clear the rating; otherwise set it
            if (currentRating === rating) {
                currentRating = 0;
            } else {
                currentRating = rating;
            }
            localStorage.setItem(STORAGE_KEY, currentRating);
            updateHearts();
        });
    });

    // Show saved rating on page load
    updateHearts();
}
  // --- Init sequence ---
  async function init() {
    applyTheme();
    await loadHeaderFooter();

    // Hand the UI_TEXT dictionary to the translation engine
    EDTranslation.init(window.UI_TEXT || {});
    EDTranslation.translatePage();

    updateConnectionStatus();
    window.EDPWA.init();
    // ♥ Activate the rating hearts after footer is present
    setupRating();

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Keyboard shortcut Ctrl+Shift+T
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();