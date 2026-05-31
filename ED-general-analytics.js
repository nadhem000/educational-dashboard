// ED-general-analytics.js – self‑contained interaction tracker
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // ---------- generic tracking function ----------
  function trackInteraction(entityType, entityId) {
    const url = `${SUPABASE_URL}/rest/v1/rpc/increment_interaction`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        p_entity_type: entityType,
        p_entity_id: entityId,
      }),
    }).catch(() => {}); // fail silently – never break the site
  }

  // ---------- 1. Track page visits (footer pages) ----------
  function trackPageView() {
    const path = location.pathname.replace(/^\//, '').replace('.html', '');
    const footerPages = ['contact', 'privacyPolicy', 'termsOfUse'];
    if (footerPages.includes(path)) {
      trackInteraction('page', path);
    }
    // Optionally you can track every page – just remove the if-condition.
  }

  // ---------- 2. Track card clicks (dashboard + contact social) ----------
  function setupCardTracking() {
    document.addEventListener('click', function (e) {
      // --- Dashboard “Visit” buttons ---
      const mainBtn = e.target.closest('.ED-General-card__main-btn');
      if (mainBtn) {
        const card = mainBtn.closest('.ED-General-card');
        const cardId = card && card.getAttribute('data-card-id');
        if (cardId) {
          trackInteraction('card', cardId);
        }
        return;
      }

      // --- Social media cards (contact page) ---
      const socialCard = e.target.closest('.ED-General-social-card');
      if (socialCard) {
        const socialId = socialCard.getAttribute('data-social-id');
        if (socialId) {
          trackInteraction('card', 'social-' + socialId);
        }
        return;
      }
    });
  }

  // ---------- 3. Track PWA installation ----------
  function setupInstallTracking() {
    window.addEventListener('appinstalled', function () {
      trackInteraction('install', 'app');
    });
  }

  // ---------- Initialise everything ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView();
      setupCardTracking();
    });
  } else {
    trackPageView();
    setupCardTracking();
  }
  setupInstallTracking(); // can be called immediately
})();