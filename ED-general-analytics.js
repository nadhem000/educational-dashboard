// ED-general-analytics.js – self-contained tracker with throttle + offline queue
(function () {
  'use strict';

  const FUNCTION_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co/functions/v1/log-interaction';
  const QUEUE_KEY = '__analytics_offline_queue__';

  // Throttle: allow only one event per (entityType + entityId) every 3 seconds
  const lastSent = {};
  function shouldThrottle(entityType, entityId) {
    const key = `${entityType}::${entityId}`;
    const now = Date.now();
    if (lastSent[key] && now - lastSent[key] < 3000) {
      return true;
    }
    lastSent[key] = now;
    return false;
  }

  function sendEvent(entityType, entityId) {
    return fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
      }),
    });
  }

  // Offline queue
  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function addToQueue(entityType, entityId) {
    const queue = getQueue();
    queue.push({ entity_type: entityType, entity_id: entityId, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function removeFromQueue(count) {
    const queue = getQueue();
    if (count <= 0) return;
    const remaining = queue.slice(count);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }

  async function flushQueue() {
    const queue = getQueue();
    if (queue.length === 0) return;
    let sent = 0;
    for (const item of queue) {
      try {
        await sendEvent(item.entity_type, item.entity_id);
        sent++;
      } catch (err) {
        console.warn('Failed to flush analytics event', err);
        break; // stop on first failure, keep the rest for next time
      }
    }
    removeFromQueue(sent);
  }

  function trackInteraction(entityType, entityId) {
    if (shouldThrottle(entityType, entityId)) return;

    if (navigator.onLine) {
      sendEvent(entityType, entityId).catch(() => {
        // If online but request failed, queue it as well
        addToQueue(entityType, entityId);
      });
    } else {
      addToQueue(entityType, entityId);
    }
  }

  // Listen for online event to flush
  window.addEventListener('online', () => {
    flushQueue();
  });

  // Flush any leftover on startup if online
  if (navigator.onLine) {
    flushQueue();
  }

  // ---------- Track page visits ----------
  function trackPageView() {
    const path = location.pathname.replace(/^\//, '').replace('.html', '');
    const footerPages = ['contact', 'privacyPolicy', 'termsOfUse'];
    if (footerPages.includes(path)) {
      trackInteraction('page', path);
    }
  }

  // ---------- Track card clicks ----------
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