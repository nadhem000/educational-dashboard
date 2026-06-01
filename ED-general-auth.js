// ED-general-auth.js – Sign in / up / out, no extra script tags needed
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // ---------- 1. Load Supabase client dynamically ----------
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

  // ---------- 2. Load the modal HTML (signin.html) ----------
  let modalHTMLPromise = null;
  function loadModalHTML() {
    if (!modalHTMLPromise) {
      modalHTMLPromise = fetch('signin.html')
        .then(response => {
          if (!response.ok) throw new Error('Could not load signin.html');
          return response.text();
        });
    }
    return modalHTMLPromise;
  }

  // ---------- 3. Wait until header controls exist ----------
  // ---------- 3. Wait until header controls exist ----------
  function waitForHeaderControls() {
    return new Promise(resolve => {
      const controls = document.querySelector('.ED-General-header__controls');
      if (controls) {
        resolve(controls);
        return;
      }
      const headerContainer = document.getElementById('header-container');
      if (headerContainer) {
        const observer = new MutationObserver(() => {
          const c = document.querySelector('.ED-General-header__controls');
          if (c) {
            observer.disconnect();
            resolve(c);
          }
        });
        observer.observe(headerContainer, { childList: true, subtree: true });
      } else {
        // header-container not yet in DOM – retry every 100ms
        const checkInterval = setInterval(() => {
          const c = document.querySelector('.ED-General-header__controls');
          if (c) {
            clearInterval(checkInterval);
            resolve(c);
          }
        }, 100);
      }
    });
  }

  // ---------- 4. Main initialisation ----------
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Wait for the header to be fully loaded
      await waitForHeaderControls();

      // Now safe to insert the auth button
      function insertAuthButton() {
        const controls = document.querySelector('.ED-General-header__controls');
        if (!controls || document.getElementById('ED-General-auth-btn-container')) return;

        const btnContainer = document.createElement('span');
        btnContainer.id = 'ED-General-auth-btn-container';
        btnContainer.style.display = 'inline-flex';
        btnContainer.innerHTML = `<button id="ED-General-auth-btn" class="ED-General-header-btn" style="display:none;">Loading…</button>`;
        controls.appendChild(btnContainer);
      }

      function updateAuthUI(user) {
        const btn = document.getElementById('ED-General-auth-btn');
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
          btn.onclick = showAuthModal;
          btn.style.display = 'inline-flex';
        }
      }

      supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session?.user ?? null);
      });

      insertAuthButton();
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthUI(session?.user ?? null);

      // ---------- 5. Show the sign‑in modal ----------
      async function showAuthModal() {
        const existing = document.getElementById('ED-General-auth-modal');
        if (existing) existing.remove();

        const html = await loadModalHTML();
        document.body.insertAdjacentHTML('beforeend', html);
        const modal = document.getElementById('ED-General-auth-modal');

        if (window.EDTranslation) {
          EDTranslation.translatePage();
        }

        let mode = 'signIn';

        const form = document.getElementById('ED-General-auth-form');
        const emailInput = document.getElementById('ED-General-auth-email');
        const passwordInput = document.getElementById('ED-General-auth-password');
        const errorEl = document.getElementById('ED-General-auth-error');
        const modeLink = document.getElementById('ED-General-auth-toggle-mode');
        const titleEl = document.getElementById('ED-General-auth-modal-title');
        const forgotLink = document.getElementById('ED-General-auth-forgot-password');
        const cancelBtn = document.getElementById('ED-General-auth-cancel-btn');

        const t = window.EDTranslation?.getText || ((k) => k);

        function setMode(newMode) {
          mode = newMode;
          titleEl.textContent = mode === 'signIn' ? t('auth.signIn') : t('auth.signUp');
          modeLink.textContent = mode === 'signIn' ? t('auth.switchToSignUp') : t('auth.switchToSignIn');
          if (forgotLink) {
            forgotLink.style.display = mode === 'signIn' ? '' : 'none';
          }
          errorEl.style.display = 'none';
        }

        setMode(mode);

        modeLink.addEventListener('click', (e) => {
          e.preventDefault();
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
        });

        if (forgotLink) {
          forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) {
              errorEl.textContent = t('auth.enterEmail') || 'Please enter your email first.';
              errorEl.style.display = 'block';
              return;
            }
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://educational-general-dashboard.netlify.app/reset-password.html',
              });
              if (error) throw error;
              errorEl.textContent = t('auth.forgotPasswordSent');
              errorEl.style.color = 'var(--ED-General-color-accent-default)';
              errorEl.style.display = 'block';
            } catch (err) {
              errorEl.textContent = (t('auth.forgotPasswordError') || 'Failed to send reset email.') + ' ' + err.message;
              errorEl.style.color = '#f44336';
              errorEl.style.display = 'block';
            }
          });
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          errorEl.style.display = 'none';
          errorEl.style.color = '#f44336';
          const email = emailInput.value.trim();
          const password = passwordInput.value;

          try {
            if (mode === 'signIn') {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
            } else {
              const { error } = await supabase.auth.signUp({ email, password });
              if (error) throw error;
              alert('Check your email for a confirmation link (if email confirmation is enabled).');
            }
            modal.remove();
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
          }
        });

        cancelBtn.addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.remove();
        });
      }

    } catch (err) {
      console.error('ED-auth initialisation failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();