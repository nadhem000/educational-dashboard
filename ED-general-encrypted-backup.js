// ED-general-encrypted-backup.js
// Strong random‑salt encryption, stores blob in localStorage temporarily,
// sends to Supabase immediately, removes from localStorage on success.
// Offline‑aware: retries when connectivity returns.

(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  const ENCRYPTION_PASSPHRASE = 'nadhem000@@@';
  const PBKDF2_ITERATIONS = 200000;        // stronger key derivation
  const SALT_LENGTH = 16;                  // 128‑bit random salt
  const LOCAL_KEY_PREFIX = 'encBackup_pending_';

  let supabase = null;

  // ── Load Supabase client ──
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

  // ── Derive AES‑GCM key from passphrase + random salt ──
  async function deriveKey(passphrase, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
  }

  // ── Encrypt dataObj → base64 string: salt + IV + ciphertext ──
  async function encrypt(dataObj) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(ENCRYPTION_PASSPHRASE, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(dataObj))
    );

    // Combine: salt (16) + iv (12) + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // ── Send encrypted blob to Supabase (insert new row) ──
  async function sendToSupabase(userId, encryptedBlob) {
    if (!supabase) throw new Error('Supabase not ready');
    const { error } = await supabase
      .from('encrypted_user_data')
      .insert({
        user_id: userId,
        encrypted_data: encryptedBlob
      });
    if (error) throw error;
  }

  // ── Persist a pending backup in localStorage for offline resilience ──
  function storePending(userId, encryptedBlob) {
    localStorage.setItem(LOCAL_KEY_PREFIX + userId, JSON.stringify({
      encrypted_data: encryptedBlob,
      timestamp: Date.now()
    }));
  }

  function removePending(userId) {
    localStorage.removeItem(LOCAL_KEY_PREFIX + userId);
  }

  function getPending(userId) {
    const raw = localStorage.getItem(LOCAL_KEY_PREFIX + userId);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // ── Try to flush a pending backup to Supabase ──
  async function flushPending(userId) {
    const pending = getPending(userId);
    if (!pending) return;

    try {
      await sendToSupabase(userId, pending.encrypted_data);
      removePending(userId);
      console.log('Encrypted backup synced to Supabase');
    } catch (e) {
      // Will stay in localStorage until next online event
      console.warn('Failed to sync encrypted backup, will retry later', e);
    }
  }

  // ── Main handler for capture event ──
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

    // Store in localStorage first (offline safety)
    storePending(userId, encryptedBlob);

    // Immediately try to send to Supabase
    if (navigator.onLine) {
      await flushPending(userId);
    }
  }

  // ── Retry pending backups when coming back online ──
  async function handleOnline() {
    if (!supabase) return;
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      if (userId) {
        await flushPending(userId);
      }
    } catch (e) {
      // ignore
    }
  }

  // ── Initialise ──
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      document.addEventListener('ed-enc-backup-capture', handleCapture);
      window.addEventListener('online', handleOnline);

      // Also flush any pending backup right away if online and signed in
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id && navigator.onLine) {
        flushPending(data.session.user.id);
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