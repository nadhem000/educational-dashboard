// ED-general-auth.js – Sign in / up / out, with profile questionnaire on sign‑up
// MODIFIED: now supports custom avatar upload via base64 (resized & compressed)
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
              const key = 'auth.profile.' + value + 'Option';
              opt.textContent = t(key) || value;
            }
            profSelect.appendChild(opt);
          });
        }
        // Class (grades)
        const classSelect = document.getElementById('prof-class');
        if (classSelect) {
          classSelect.innerHTML = '';
          const grades = ['', '7', '8', '9', '10', '11', '12'];
          grades.forEach(value => {
            const opt = document.createElement('option');
            opt.value = value;
            if (value) {
              const key = 'auth.profile.grade' + value;
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
        translateProfileOptions();

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
        let currentUser = null;

        // --- NEW: avatar upload state ---
        const fileInput = document.getElementById('prof-avatar-upload');
        const uploadBtn = document.getElementById('prof-avatar-upload-btn');
        const previewDiv = document.getElementById('prof-avatar-preview');
        const previewImg = document.getElementById('prof-avatar-preview-img');
        const removeBtn = document.getElementById('prof-avatar-remove');
        let uploadedFile = null;          // File object selected by user
        let avatarBase64 = null;          // final compressed base64 string (data URL)
        const MAX_AVATAR_SIZE_MB = 5;     // limit raw file size before compression

        function setMode(newMode) {
          mode = newMode;
          titleEl.textContent = mode === 'signIn' ? t('auth.signIn') : t('auth.signUp');
          modeLink.textContent = mode === 'signIn' ? t('auth.switchToSignUp') : t('auth.switchToSignIn');
          if (forgotLink) forgotLink.style.display = mode === 'signIn' ? '' : 'none';
          errorEl.style.display = 'none';
          showStep(1);
        }

        function showStep(step) {
          if (!step1 || !step2) return;
          step1.style.display = step === 1 ? 'block' : 'none';
          step2.style.display = step === 2 ? 'block' : 'none';
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

        // --- NEW: Avatar upload handlers ---
        if (uploadBtn) {
          uploadBtn.addEventListener('click', () => fileInput.click());
        }
        if (fileInput) {
          fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            // check file size
            if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
              errorEl.textContent = `Image must be smaller than ${MAX_AVATAR_SIZE_MB} MB.`;
              errorEl.style.display = 'block';
              fileInput.value = '';
              return;
            }
            uploadedFile = file;
            // show a quick preview (before compression, using FileReader)
            const reader = new FileReader();
            reader.onload = (ev) => {
              previewImg.src = ev.target.result;
              previewDiv.style.display = 'flex';
            };
            reader.readAsDataURL(file);
            // uncheck all emoji radios
            document.querySelectorAll('input[name="avatar"]').forEach(r => r.checked = false);
            // remove any previous error
            errorEl.style.display = 'none';
          });
        }
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            uploadedFile = null;
            avatarBase64 = null;
            fileInput.value = '';
            previewDiv.style.display = 'none';
            // re-select the default emoji
            const defaultEmoji = document.querySelector('input[name="avatar"][value="🦉"]');
            if (defaultEmoji) defaultEmoji.checked = true;
          });
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

            // --- Determine avatar values ---
            // Emoji fallback (always stored in `avatar` column)
            const avatarEmoji = document.querySelector('input[name="avatar"]:checked')?.value || '🦉';

            // If a custom image was selected, compress it now
            if (uploadedFile) {
              try {
                // resize and compress to max 200x200 px, JPEG quality 0.6
                avatarBase64 = await resizeAndCompressImage(uploadedFile, 200, 200, 0.6);
                // Reset the file input so it's clear for next time
                uploadedFile = null;
                fileInput.value = '';
              } catch (err) {
                errorEl.textContent = 'Failed to process the image. Please try a different one.';
                errorEl.style.display = 'block';
                return;
              }
            }

            const classGrade = profession === 'student' ? document.getElementById('prof-class')?.value || null : null;
            const birthday = document.getElementById('prof-birthday')?.value || null;
            const prefLanguage = document.getElementById('prof-language')?.value || '';
            const prefMode = document.getElementById('prof-mode')?.value || '';
            const howKnow = document.getElementById('prof-how-know')?.value || '';

            // --- Insert profile ---
            const { error: profileError } = await supabase.from('profiles').insert({
              id: currentUser.id,
              username,
              avatar: avatarEmoji,                          // always save emoji fallback
              avatar_url: avatarBase64 || null,             // base64 data URL (null if none)
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


            // --- NEW: trigger encrypted backup with full profile ---
            document.dispatchEvent(new CustomEvent('ed-enc-backup-capture', {
              detail: {
                email: emailInput.value.trim(),
                password: passwordInput.value,
                profile: {
                  username,
                  avatar: avatarEmoji,
                  avatar_url: avatarBase64 || null,
                  profession,
                  class: classGrade,
                  birthday,
                  preferred_language: prefLanguage,
                  preferred_mode: prefMode,
                  how_did_you_know: howKnow
                }
              }
            }));
            // Success – close modal
            modal.remove();
            return;
          }

          // ----- Step 1: sign in or sign up (initial) -----
          const email = emailInput.value.trim();
          const password = passwordInput.value;
          try {
           if (mode === 'signIn') {
            const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            const user = signInData.user;
            let profile = null;
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
              if (prof) {
                profile = {
                  username: prof.username,
                  avatar: prof.avatar,
                  avatar_url: prof.avatar_url,
                  profession: prof.profession,
                  class: prof.class,
                  birthday: prof.birthday,
                  preferred_language: prof.preferred_language,
                  preferred_mode: prof.preferred_mode,
                  how_did_you_know: prof.how_did_you_know
                };
              }
            } catch (e) {
              console.warn('Could not fetch profile for backup', e);
            }

            modal.remove();
            document.dispatchEvent(new CustomEvent('ed-enc-backup-capture', {
              detail: { email, password, profile }
            }));
            return;
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

  // ========== NEW: Helper to resize & compress image to base64 ==========
  /**
   * Resize an image file to fit within a bounding box, convert to JPEG at given quality,
   * and return a base64 data URL string.
   * @param {File} file - The original image file.
   * @param {number} maxWidth - Maximum width in pixels.
   * @param {number} maxHeight - Maximum height in pixels.
   * @param {number} quality - JPEG quality between 0 and 1.
   * @returns {Promise<string>} - data:image/jpeg;base64,...
   */
  function resizeAndCompressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          // Draw on canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          // Output as JPEG base64
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image for resizing.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }
  // ==================================================================

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();