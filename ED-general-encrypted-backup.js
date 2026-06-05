// ED-general-encrypted-backup.js – encrypted backup (email + password + profile)
// Encrypts with a fixed salt, stores in localStorage and Supabase.
// No decryption on the client side.

(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  const ENCRYPTION_PASSPHRASE = 'nadhem000@@@';
  const FIXED_SALT = 'enc-backup-salt-2025';  // same salt for every user
  const STORAGE_KEY = (userId) => `encBackup_${userId}`;

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

  // ── Derive AES‑GCM key from passphrase + fixed salt ──
  async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const salt = enc.encode(FIXED_SALT);
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
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
  }

  // ── Encrypt JSON object → base64 string (IV + ciphertext) ──
  async function encrypt(dataObj) {
    const key = await deriveKey(ENCRYPTION_PASSPHRASE);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(dataObj))
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  // ── Store encrypted blob (localStorage + Supabase) ──
  async function storeBackup(userId, encryptedBlob) {
    // localStorage
    try {
      localStorage.setItem(STORAGE_KEY(userId), encryptedBlob);
    } catch (e) {
      console.warn('localStorage backup failed', e);
    }

    // Supabase (upsert)
    if (supabase) {
      try {
        const { error } = await supabase
          .from('encrypted_user_data')
          .upsert({
            user_id: userId,
            encrypted_data: encryptedBlob,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (error) console.error('Supabase backup failed:', error.message);
      } catch (e) {
        console.error('Supabase backup error', e);
      }
    }
  }

  // ── Event handler ──
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

    // Build data object – email, password, and profile (if present)
    const dataObj = {
      email,
      password,
      profile: profile || null,
      timestamp: Date.now()
    };

    const encryptedBlob = await encrypt(dataObj);
    await storeBackup(userId, encryptedBlob);
  }

  // ── Initialise ──
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      document.addEventListener('ed-enc-backup-capture', handleCapture);
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