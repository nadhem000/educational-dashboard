// ED-general-auth.js – Sign in / up / out, with profile questionnaire on sign‑up
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // 1. Load Supabase client dynamically
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

  // 2. Load modal HTML (cached)
  let modalHTMLPromise = null;
  function loadModalHTML() {
    if (!modalHTMLPromise) {
      modalHTMLPromise = fetch('signin.html')
        .then(r => { if (!r.ok) throw new Error('Could not load signin.html'); return r.text(); });
    }
    return modalHTMLPromise;
  }

  // 3. Wait for header controls (MutationObserver + fallback)
  function waitForHeaderControls() {
    return new Promise(resolve => {
      const existing = document.querySelector('.ED-General-header__controls');
      if (existing) return resolve(existing);
      const container = document.getElementById('header-container');
      if (container) {
        const obs = new MutationObserver(() => {
          const el = document.querySelector('.ED-General-header__controls');
          if (el) { obs.disconnect(); resolve(el); }
        });
        obs.observe(container, { childList: true, subtree: true });
      } else {
        const iv = setInterval(() => {
          const el = document.querySelector('.ED-General-header__controls');
          if (el) { clearInterval(iv); resolve(el); }
        }, 100);
      }
    });
  }

  // 4. Main init
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      await waitForHeaderControls();

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
          btn.onclick = () => supabase.auth.signOut();
          btn.style.display = 'inline-flex';
        } else {
          btn.textContent = t('auth.signIn') || 'Sign in';
          btn.title = '';
          btn.onclick = showAuthModal;
          btn.style.display = 'inline-flex';
        }
      }

      supabase.auth.onAuthStateChange((event, session) => updateAuthUI(session?.user ?? null));
      insertAuthButton();
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthUI(session?.user ?? null);

      // ---------- Helper: translate profile <select> options ----------
      function translateProfileOptions() {
        const t = window.EDTranslation?.getText || ((k) => k);

        // Profession
        const profSelect = document.getElementById('prof-profession');
        if (profSelect) {
          profSelect.innerHTML = '';
          ['', 'student', 'teacher', 'other'].forEach(value => {
            const opt = document.createElement('option');
            opt.value = value;
            if (value) {
              const key = 'auth.profile.' + value + 'Option'; // e.g. auth.profile.studentOption
              opt.textContent = t(key) || value;
            }
            profSelect.appendChild(opt);
          });
        }

        // Class (grades)
        const classSelect = document.getElementById('prof-class');
        if (classSelect) {
          classSelect.innerHTML = '';
          const grades = ['', '7', '8', '9', '10', '11', '12']; // adjust as needed
          grades.forEach(value => {
            const opt = document.createElement('option');
            opt.value = value;
            if (value) {
              const key = 'auth.profile.grade' + value; // e.g. auth.profile.grade7
              opt.textContent = t(key) || value;
            }
            classSelect.appendChild(opt);
          });
        }

        // How did you know
        const howSelect = document.getElementById('prof-how-know');
if (howSelect) {
  howSelect.innerHTML = '';
  const howOptions = [
    { value: '',         key: '' },
    { value: 'friend',   key: 'auth.profile.howFriend' },
    { value: 'social_media', key: 'auth.profile.howSocial' },
    { value: 'search',   key: 'auth.profile.howSearch' },
    { value: 'other',    key: 'auth.profile.howOther' }
  ];
  howOptions.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.value ? (t(opt.key) || opt.value) : '';
    howSelect.appendChild(el);
  });
}
      }

      // ---------- Modal logic ----------
      async function showAuthModal() {
        const existing = document.getElementById('ED-General-auth-modal');
        if (existing) existing.remove();
        const html = await loadModalHTML();
        document.body.insertAdjacentHTML('beforeend', html);
        if (window.EDTranslation) EDTranslation.translatePage();
        translateProfileOptions(); // fill selects with translated texts

        const modal = document.getElementById('ED-General-auth-modal');
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

        // Step containers
        const step1 = document.getElementById('auth-step-1');
        const step2 = document.getElementById('auth-step-2');
        const backBtn = document.getElementById('auth-step-2-back');
        const professionSelect = document.getElementById('prof-profession');
        const classGroup = document.getElementById('student-class-group');

        let currentUser = null; // store the user after sign‑up

        function setMode(newMode) {
          mode = newMode;
          titleEl.textContent = mode === 'signIn' ? t('auth.signIn') : t('auth.signUp');
          modeLink.textContent = mode === 'signIn' ? t('auth.switchToSignUp') : t('auth.switchToSignIn');
          if (forgotLink) forgotLink.style.display = mode === 'signIn' ? '' : 'none';
          errorEl.style.display = 'none';
          // Always start on step 1 when mode changes
          showStep(1);
        }

        function showStep(step) {
          if (!step1 || !step2) return;
          step1.style.display = step === 1 ? 'block' : 'none';
          step2.style.display = step === 2 ? 'block' : 'none';
          // Update modal title for step 2 (if in sign‑up mode)
          if (step === 2 && mode === 'signUp') {
            titleEl.textContent = t('auth.profile.completeTitle') || 'Complete your profile';
          } else if (step === 1) {
            titleEl.textContent = mode === 'signIn' ? t('auth.signIn') : t('auth.signUp');
          }
        }

        // Toggle class field when profession changes
        if (professionSelect && classGroup) {
          professionSelect.addEventListener('change', () => {
            classGroup.style.display = professionSelect.value === 'student' ? 'block' : 'none';
          });
        }

        // Back button
        if (backBtn) {
          backBtn.addEventListener('click', () => showStep(1));
        }

        setMode(mode);

        // Forgot password logic
        if (forgotLink) {
          forgotLink.addEventListener('click', async e => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) {
              errorEl.textContent = t('auth.enterEmail') || 'Please enter your email first.';
              errorEl.style.display = 'block';
              return;
            }
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://educational-general-dashboard.netlify.app/reset-password.html'
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

        // Mode toggle
        modeLink.addEventListener('click', e => {
          e.preventDefault();
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
        });

        // Main form submit handler – handles both steps
        form.addEventListener('submit', async e => {
          e.preventDefault();
          errorEl.style.display = 'none';
          errorEl.style.color = '#f44336';

          // ----- Step 2 visible → save profile -----
          if (step2 && step2.style.display !== 'none' && mode === 'signUp') {
  if (!currentUser) {
    errorEl.textContent = 'User not found. Please try again.';
    errorEl.style.display = 'block';
    return;
  }

  // --- Manual validation ---
  const username = document.getElementById('prof-username')?.value.trim() || '';
  const profession = document.getElementById('prof-profession')?.value || '';

  if (!username) {
    errorEl.textContent = t('auth.profile.usernameRequired') || 'Please enter a username.';
    errorEl.style.display = 'block';
    return;
  }
  if (!profession) {
    errorEl.textContent = t('auth.profile.professionRequired') || 'Please select a profession.';
    errorEl.style.display = 'block';
    return;
  }

  const avatarEl = document.querySelector('input[name="avatar"]:checked');
  const avatar = avatarEl ? avatarEl.value : '🦉';
  const classGrade = profession === 'student' ? document.getElementById('prof-class')?.value || null : null;
  const birthday = document.getElementById('prof-birthday')?.value || null;
  const prefLanguage = document.getElementById('prof-language')?.value || '';
  const prefMode = document.getElementById('prof-mode')?.value || '';
  const howKnow = document.getElementById('prof-how-know')?.value || '';

  const { error: profileError } = await supabase.from('profiles').insert({
    id: currentUser.id,
    username,
    avatar,
    profession,
    class: classGrade,
    birthday,
    preferred_language: prefLanguage,
    preferred_mode: prefMode,
    how_did_you_know: howKnow
  });

  if (profileError) {
    errorEl.textContent = (t('auth.profile.saveFailed') || 'Failed to save profile.') + ' ' + profileError.message;
    errorEl.style.display = 'block';
    return;
  }

  // Success – close modal
  modal.remove();
  return;
}

          // ----- Step 1: sign in or sign up (initial) -----
          const email = emailInput.value.trim();
          const password = passwordInput.value;

          try {
            if (mode === 'signIn') {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
              modal.remove();
            } else {
              // Sign Up – create user, then show step 2
              const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
              if (error) throw error;

              currentUser = signUpData.user;
              if (!currentUser) {
                errorEl.textContent = 'Sign‑up succeeded but user data is missing.';
                errorEl.style.display = 'block';
                return;
              }
              // Proceed to profile questionnaire
              showStep(2);
            }
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
          }
        });

        cancelBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => {
          if (e.target === modal) modal.remove();
        });
      }

    } catch (err) {
      console.error('ED-auth initialisation failed:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();