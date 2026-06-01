// ED-general-auth.js – Sign in / up / out, no extra script tags needed
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // ----------------------------------------------------------------
  // 1. Ensure Supabase client is loaded (from CDN if needed)
  // ----------------------------------------------------------------
  function loadSupabaseClient() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve(window.supabase);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Failed to load Supabase client'));
      document.head.appendChild(script);
    });
  }

  // ----------------------------------------------------------------
  // 2. Initialise everything once the client is ready
  // ----------------------------------------------------------------
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // ---- Auth UI button (placed in header) ----
      function insertAuthButton() {
        const controls = document.querySelector('.ED-General-header__controls');
        if (!controls || document.getElementById('auth-btn-container')) return;

        const btnContainer = document.createElement('span');
        btnContainer.id = 'auth-btn-container';
        btnContainer.style.display = 'inline-flex';
        btnContainer.innerHTML = `<button id="auth-btn" class="ED-General-header-btn" style="display:none;">Loading…</button>`;
        controls.appendChild(btnContainer);
      }

      function updateAuthUI(user) {
        const btn = document.getElementById('auth-btn');
        if (!btn) return;

        const t = window.EDTranslation?.getText || ((k) => k);

        if (user) {
          btn.textContent = t('auth.signOut') || 'Sign out';
          btn.title = user.email || '';
          btn.onclick = async () => {
            await supabase.auth.signOut();
          };
          btn.style.display = 'inline-flex';
        } else {
          btn.textContent = t('auth.signIn') || 'Sign in';
          btn.title = '';
          btn.onclick = () => showAuthModal(supabase);
          btn.style.display = 'inline-flex';
        }
      }

      // Listen to auth state changes
      supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session?.user ?? null);
      });

      // Initial state
      insertAuthButton();
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthUI(session?.user ?? null);

      // ---- Modal for sign‑in / sign‑up ----
      function showAuthModal(supabaseClient) {
        const existing = document.getElementById('auth-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.innerHTML = `
          <div style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex;
                      align-items:center; justify-content:center; z-index:9999;">
            <div style="background:var(--ED-General-color-surface,#fff); padding:2rem;
                        border-radius:16px; max-width:380px; width:90%;
                        box-shadow:0 8px 30px rgba(0,0,0,0.3);
                        color:var(--ED-General-color-text-primary,#1e293b);">
              <h3 id="auth-modal-title" style="margin-top:0;">Sign in</h3>
              <form id="auth-form">
                <input id="auth-email" type="email" placeholder="Email" required
                  style="display:block; width:100%; margin:0.8rem 0; padding:0.5rem;
                         border:1px solid var(--ED-General-color-border,#ccc);
                         border-radius:8px; background:var(--ED-General-color-bg,#fff);
                         color:var(--ED-General-color-text-primary,#1e293b);">
                <input id="auth-password" type="password" placeholder="Password" required
                  style="display:block; width:100%; margin:0.8rem 0; padding:0.5rem;
                         border:1px solid var(--ED-General-color-border,#ccc);
                         border-radius:8px; background:var(--ED-General-color-bg,#fff);
                         color:var(--ED-General-color-text-primary,#1e293b);">
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
                  <button type="button" id="auth-cancel-btn" class="ED-General-header-btn"
                    style="background:var(--ED-General-color-bg-secondary);">Cancel</button>
                  <button type="submit" class="ED-General-header-btn"
                    style="background:var(--ED-General-color-accent-default); color:var(--ED-General-color-text-on-accent);">
                    Continue
                  </button>
                </div>
              </form>
              <p style="margin-top:1rem; font-size:0.85rem; text-align:center;">
                <a href="#" id="auth-toggle-mode" style="color:var(--ED-General-color-accent-default);">Create an account</a>
              </p>
              <p id="auth-error" style="color:red; display:none; margin-top:0.5rem;"></p>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        let mode = 'signIn';

        const form = document.getElementById('auth-form');
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const errorEl = document.getElementById('auth-error');
        const modeLink = document.getElementById('auth-toggle-mode');
        const titleEl = document.getElementById('auth-modal-title');

        function setMode(newMode) {
          mode = newMode;
          titleEl.textContent = mode === 'signIn' ? 'Sign in' : 'Create account';
          modeLink.textContent = mode === 'signIn' ? 'Create an account' : 'Already have an account? Sign in';
        }

        modeLink.addEventListener('click', (e) => {
          e.preventDefault();
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          errorEl.style.display = 'none';
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          errorEl.style.display = 'none';
          const email = emailInput.value.trim();
          const password = passwordInput.value;

          try {
            if (mode === 'signIn') {
              const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
              if (error) throw error;
            } else {
              const { error } = await supabaseClient.auth.signUp({ email, password });
              if (error) throw error;
              alert('Check your email for a confirmation link (if email confirmation is enabled).');
            }
            modal.remove(); // success
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
          }
        });

        document.getElementById('auth-cancel-btn').addEventListener('click', () => modal.remove());
        modal.firstElementChild.addEventListener('click', (e) => e.stopPropagation());
        modal.addEventListener('click', () => modal.remove());
      }

    } catch (err) {
      console.error('ED-auth initialisation failed:', err);
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();