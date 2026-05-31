// ED-general-analytics.js – self‑contained tracker with client‑side throttle
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co/functions/v1/log-interaction';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // Throttle: allow only one event per (entityType + entityId) every 3 seconds
  const lastSent = {};
  function shouldThrottle(entityType, entityId) {
    const key = `${entityType}::${entityId}`;
    const now = Date.now();
    if (lastSent[key] && now - lastSent[key] < 3000) {
      return true; // too soon, block it
    }
    lastSent[key] = now;
    return false;
  }

 function trackInteraction(entityType, entityId) {
  if (shouldThrottle(entityType, entityId)) return;
  fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entity_type: entityType,
      entity_id: entityId,
    }),
  }).catch(() => {});
}

  // ---------- track page visits ----------
  function trackPageView() {
    const path = location.pathname.replace(/^\//, '').replace('.html', '');
    const footerPages = ['contact', 'privacyPolicy', 'termsOfUse'];
    if (footerPages.includes(path)) {
      trackInteraction('page', path);
    }
  }

  // ---------- card clicks (dashboard + social) ----------
  function setupCardTracking() {
    document.addEventListener('click', function (e) {
      const mainBtn = e.target.closest('.ED-General-card__main-btn');
      if (mainBtn) {
        const card = mainBtn.closest('.ED-General-card');
        const cardId = card && card.getAttribute('data-card-id');
        if (cardId) trackInteraction('card', cardId);
        return;
      }

      const socialCard = e.target.closest('.ED-General-social-card');
      if (socialCard) {
        const socialId = socialCard.getAttribute('data-social-id');
        if (socialId) trackInteraction('card', 'social-' + socialId);
        return;
      }
    });
  }

  // ---------- PWA install ----------
  function setupInstallTracking() {
    window.addEventListener('appinstalled', function () {
      trackInteraction('install', 'app');
    });
  }

  // ---------- init ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView();
      setupCardTracking();
    });
  } else {
    trackPageView();
    setupCardTracking();
  }
  setupInstallTracking();
})();