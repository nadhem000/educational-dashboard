// ED-general-analytics.js – self-contained tracker with throttle + Edge Function
(function () {
  'use strict';

  // ============================================================
  // Edge Function URL – copy from Supabase dashboard
  // ============================================================
  const FUNCTION_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co/functions/v1/log-interaction';

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
    }).catch(() => {}); // silently ignore errors
  }

  // ---------- Track page visits (footer pages) ----------
  function trackPageView() {
    const path = location.pathname.replace(/^\//, '').replace('.html', '');
    const footerPages = ['contact', 'privacyPolicy', 'termsOfUse'];
    if (footerPages.includes(path)) {
      trackInteraction('page', path);
    }
  }

  // ---------- Track card clicks (dashboard + social) ----------
  function setupCardTracking() {
    document.addEventListener('click', function (e) {
      // Dashboard "Visit" buttons
      const mainBtn = e.target.closest('.ED-General-card__main-btn');
      if (mainBtn) {
        const card = mainBtn.closest('.ED-General-card');
        const cardId = card && card.getAttribute('data-card-id');
        if (cardId) trackInteraction('card', cardId);
        return;
      }

      // Social media cards (contact page)
      const socialCard = e.target.closest('.ED-General-social-card');
      if (socialCard) {
        const socialId = socialCard.getAttribute('data-social-id');
        if (socialId) trackInteraction('card', 'social-' + socialId);
        return;
      }
    });
  }

  // ---------- Track PWA installation ----------
  function setupInstallTracking() {
    window.addEventListener('appinstalled', function () {
      trackInteraction('install', 'app');
    });
  }

  // ---------- Initialise ----------
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