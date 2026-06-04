// ED-general-profile.js – User profile viewing & editing (partial secure contact with Supabase)
(function () {
  'use strict';

  // ── Remove any lingering ?avatar=... from the URL ──
  (function cleanAvatarParam() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('avatar')) {
      url.searchParams.delete('avatar');
      window.history.replaceState(null, '', url.toString());
    }
  })();

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  let supabase = null;

  // ──────────────────────────────────────────────
  // 1. Load Supabase client (reuses window.supabase if already loaded)
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
  // 2. Wait for header controls to exist in the DOM
  // ──────────────────────────────────────────────
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

  // ──────────────────────────────────────────────
  // 3. Helper – get translated text or fallback
  // ──────────────────────────────────────────────
  function t(key, fallback) {
    if (window.EDTranslation && window.EDTranslation.getText) {
      const translated = window.EDTranslation.getText(key);
      if (translated) return translated;
    }
    return fallback || key;
  }

  // ──────────────────────────────────────────────
  // 4. Helper – resize & compress image to base64 (same logic as auth script)
  // ──────────────────────────────────────────────
  function resizeAndCompressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
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
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
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

  // ──────────────────────────────────────────────
  // 5. Build & show the profile modal
  // ──────────────────────────────────────────────
  async function showProfileModal(user) {
    // Remove any existing profile modal
    const existing = document.getElementById('ED-General-profile-modal');
    if (existing) existing.remove();

    if (!user || !supabase) return;

    // ---------- Build modal HTML ----------
    const modalHTML = `
    <div id="ED-General-profile-modal" class="ED-General-auth-modal-backdrop">
      <div class="ED-General-auth-modal-box" style="max-width: 480px;">
        <h3 class="ED-General-auth-modal-title" id="profile-modal-title">${t('auth.profile.title', 'My Profile')}</h3>

        <!-- Loading indicator -->
        <div id="profile-loading" style="text-align:center; padding:2rem; color:var(--ED-General-color-text-secondary);">
          ${t('auth.profile.loading', 'Loading profile…')}
        </div>

        <!-- Profile form (hidden until data loads) -->
        <form id="ED-General-profile-form" style="display:none;">

          <!-- ══════ Avatar section ══════ -->
          <fieldset style="margin: 0.8rem 0; border: none; padding: 0;">
            <legend style="font-size:0.85rem; margin-bottom:0.25rem; color:var(--ED-General-color-text-primary);">
              ${t('auth.profile.avatarLabel', 'Avatar')}
            </legend>
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
              <!-- Current avatar preview -->
              <div id="profile-avatar-display" style="width:72px; height:72px; border-radius:50%; overflow:hidden; background:var(--ED-General-color-bg-secondary); display:flex; align-items:center; justify-content:center; font-size:2.5rem; flex-shrink:0;">
              </div>
              <!-- Change controls -->
              <div style="display:flex; flex-direction:column; gap:0.4rem;">
                <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
                  <label style="cursor:pointer;">
                    <input type="radio" name="profile-avatar-emoji" value="🦊" /> 🦊
                  </label>
                  <label style="cursor:pointer;">
                    <input type="radio" name="profile-avatar-emoji" value="🐼" /> 🐼
                  </label>
                  <label style="cursor:pointer;">
                    <input type="radio" name="profile-avatar-emoji" value="🦉" /> 🦉
                  </label>
                  <label style="cursor:pointer;">
                    <input type="radio" name="profile-avatar-emoji" value="🐨" /> 🐨
                  </label>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <input type="file" id="profile-avatar-upload" accept="image/*" style="display:none;" />
                  <button type="button" id="profile-avatar-upload-btn" class="ED-General-header-btn">
                    📷 ${t('auth.profile.uploadAvatar', 'Upload')}
                  </button>
                  <button type="button" id="profile-avatar-remove-btn" class="ED-General-header-btn" style="font-size:0.8rem;">
                    ✕ ${t('auth.profile.removeAvatar', 'Remove')}
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          <!-- ══════ Username ══════ -->
          <label for="profile-username" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
            ${t('auth.profile.usernamePlaceholder', 'Username')}
          </label>
          <input type="text" id="profile-username" class="ED-General-auth-modal-input" />

          <!-- ══════ Profession ══════ -->
          <label for="profile-profession" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
            ${t('auth.profile.professionLabel', 'Profession')}
          </label>
          <select id="profile-profession" class="ED-General-auth-modal-input">
            <option value="student">${t('auth.profile.studentOption', 'Student')}</option>
            <option value="teacher">${t('auth.profile.teacherOption', 'Teacher')}</option>
            <option value="other">${t('auth.profile.otherOption', 'Other')}</option>
          </select>

          <!-- ══════ Class (visible only for student) ══════ -->
          <div id="profile-class-group" style="display:none;">
            <label for="profile-class" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
              ${t('auth.profile.classLabel', 'Class / Grade')}
            </label>
            <select id="profile-class" class="ED-General-auth-modal-input">
              <option value="7">${t('auth.profile.grade7', '7th grade')}</option>
              <option value="8">${t('auth.profile.grade8', '8th grade')}</option>
              <option value="9">${t('auth.profile.grade9', '9th grade')}</option>
              <option value="10">${t('auth.profile.grade10', '10th grade')}</option>
              <option value="11">${t('auth.profile.grade11', '11th grade')}</option>
              <option value="12">${t('auth.profile.grade12', '12th grade')}</option>
            </select>
          </div>

          <!-- ══════ Birthday ══════ -->
          <label for="profile-birthday" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
            ${t('auth.profile.birthdayLabel', 'Birthday')}
          </label>
          <input type="date" id="profile-birthday" class="ED-General-auth-modal-input" />

          <!-- ══════ Preferred language ══════ -->
          <label for="profile-language" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
            ${t('auth.profile.languageLabel', 'Preferred language')}
          </label>
          <select id="profile-language" class="ED-General-auth-modal-input">
            <option value="en">${t('auth.profile.langEnglish', 'English')}</option>
            <option value="fr">${t('auth.profile.langFrench', 'Français')}</option>
            <option value="ar">${t('auth.profile.langArabic', 'العربية')}</option>
          </select>

          <!-- ══════ Preferred mode ══════ -->
          <label for="profile-mode" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
            ${t('auth.profile.modeLabel', 'Preferred mode')}
          </label>
          <select id="profile-mode" class="ED-General-auth-modal-input">
            <option value="light">${t('auth.profile.modeLight', 'Light')}</option>
            <option value="dark">${t('auth.profile.modeDark', 'Dark')}</option>
          </select>

          <!-- ══════ How did you know ══════ -->
          <label for="profile-how-know" style="display:block; font-size:0.85rem; margin-top:0.8rem; color:var(--ED-General-color-text-primary);">
            ${t('auth.profile.howKnowLabel', 'How did you get to know the site?')}
          </label>
          <select id="profile-how-know" class="ED-General-auth-modal-input">
            <option value="friend">${t('auth.profile.howFriend', 'From a friend')}</option>
            <option value="social_media">${t('auth.profile.howSocial', 'Social media')}</option>
            <option value="search">${t('auth.profile.howSearch', 'Search engine')}</option>
            <option value="other">${t('auth.profile.howOther', 'Other')}</option>
          </select>

          <!-- ══════ Action buttons ══════ -->
          <div class="ED-General-auth-modal-actions" style="margin-top:1.5rem;">
            <button type="button" id="profile-cancel-btn"
                    class="ED-General-header-btn ED-General-auth-btn-cancel">
              ${t('auth.cancel', 'Cancel')}
            </button>
            <button type="submit" class="ED-General-header-btn ED-General-auth-btn-primary">
              ${t('auth.profile.saveChanges', 'Save Changes')}
            </button>
          </div>

          <!-- Error / success message -->
          <p id="profile-message" style="display:none; margin-top:0.8rem; font-size:0.85rem; text-align:center;"></p>
        </form>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('ED-General-profile-modal');
    const loadingEl = document.getElementById('profile-loading');
    const formEl = document.getElementById('ED-General-profile-form');
    const messageEl = document.getElementById('profile-message');
    const cancelBtn = document.getElementById('profile-cancel-btn');
    const classGroup = document.getElementById('profile-class-group');
    const professionSelect = document.getElementById('profile-profession');

    // ── Avatar state ──
    const avatarDisplay = document.getElementById('profile-avatar-display');
    const fileInput = document.getElementById('profile-avatar-upload');
    const uploadBtn = document.getElementById('profile-avatar-upload-btn');
    const removeBtn = document.getElementById('profile-avatar-remove-btn');
    let uploadedFile = null;
    let avatarBase64 = null;
    let currentAvatarUrl = null;
    let currentAvatarEmoji = '🦉';
    let avatarRemoved = false;
    const MAX_AVATAR_SIZE_MB = 5;

    function updateAvatarDisplay() {
      avatarDisplay.innerHTML = '';
      if (avatarRemoved) {
        const selectedEmoji = document.querySelector('input[name="profile-avatar-emoji"]:checked');
        const emoji = selectedEmoji ? selectedEmoji.value : currentAvatarEmoji;
        avatarDisplay.textContent = emoji;
        avatarDisplay.style.fontSize = '2.5rem';
        avatarDisplay.style.background = 'var(--ED-General-color-bg-secondary)';
      } else if (avatarBase64) {
        const img = document.createElement('img');
        img.src = avatarBase64;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        avatarDisplay.appendChild(img);
      } else if (currentAvatarUrl) {
        const img = document.createElement('img');
        img.src = currentAvatarUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        avatarDisplay.appendChild(img);
      } else {
        avatarDisplay.textContent = currentAvatarEmoji;
        avatarDisplay.style.fontSize = '2.5rem';
        avatarDisplay.style.background = 'var(--ED-General-color-bg-secondary)';
      }
    }

    if (professionSelect && classGroup) {
      professionSelect.addEventListener('change', () => {
        classGroup.style.display = professionSelect.value === 'student' ? 'block' : 'none';
      });
    }

    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
          showMessage(t('auth.profile.imageTooLarge', 'Image must be smaller than 5 MB.'), 'error');
          fileInput.value = '';
          return;
        }
        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          avatarBase64 = ev.target.result;
          avatarRemoved = false;
          updateAvatarDisplay();
        };
        reader.readAsDataURL(file);
        document.querySelectorAll('input[name="profile-avatar-emoji"]').forEach(r => r.checked = false);
        clearMessage();
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        uploadedFile = null;
        avatarBase64 = null;
        currentAvatarUrl = null;
        avatarRemoved = true;
        fileInput.value = '';
        updateAvatarDisplay();
        clearMessage();
      });
    }

    document.querySelectorAll('input[name="profile-avatar-emoji"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          uploadedFile = null;
          avatarBase64 = null;
          avatarRemoved = true;
          updateAvatarDisplay();
          clearMessage();
        }
      });
    });

    function showMessage(text, type) {
      if (!messageEl) return;
      messageEl.textContent = text;
      messageEl.style.display = 'block';
      messageEl.style.color = type === 'error' ? '#f44336' : 'var(--ED-General-color-accent-default)';
    }
    function clearMessage() {
      if (messageEl) messageEl.style.display = 'none';
    }

    function closeModal() { modal.remove(); }
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      loadingEl.style.display = 'none';
      formEl.style.display = 'block';

      if (profile) {
        document.getElementById('profile-username').value = profile.username || '';
        document.getElementById('profile-profession').value = profile.profession || 'student';
        classGroup.style.display = profile.profession === 'student' ? 'block' : 'none';
        document.getElementById('profile-class').value = profile.class || '7';
        document.getElementById('profile-birthday').value = profile.birthday || '';
        document.getElementById('profile-language').value = profile.preferred_language || 'en';
        document.getElementById('profile-mode').value = profile.preferred_mode || 'light';
        document.getElementById('profile-how-know').value = profile.how_did_you_know || 'friend';

        currentAvatarUrl = profile.avatar_url || null;
        currentAvatarEmoji = profile.avatar || '🦉';
        avatarRemoved = !currentAvatarUrl;
        const emojiRadio = document.querySelector(`input[name="profile-avatar-emoji"][value="${currentAvatarEmoji}"]`);
        if (emojiRadio) emojiRadio.checked = true;
        updateAvatarDisplay();
      } else {
        document.getElementById('profile-username').value = '';
        document.getElementById('profile-profession').value = 'student';
        classGroup.style.display = 'block';
        document.getElementById('profile-class').value = '7';
        document.getElementById('profile-birthday').value = '';
        document.getElementById('profile-language').value = 'en';
        document.getElementById('profile-mode').value = 'light';
        document.getElementById('profile-how-know').value = 'friend';
        currentAvatarEmoji = '🦉';
        avatarRemoved = true;
        const defaultEmoji = document.querySelector('input[name="profile-avatar-emoji"][value="🦉"]');
        if (defaultEmoji) defaultEmoji.checked = true;
        updateAvatarDisplay();
      }
    } catch (err) {
      loadingEl.style.display = 'none';
      formEl.style.display = 'block';
      showMessage(t('auth.profile.loadError', 'Failed to load profile.') + ' ' + err.message, 'error');
    }

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();

      const username = document.getElementById('profile-username').value.trim();
      const profession = document.getElementById('profile-profession').value;
      const classGrade = profession === 'student' ? document.getElementById('profile-class').value : null;
      const birthday = document.getElementById('profile-birthday').value || null;
      const prefLanguage = document.getElementById('profile-language').value;
      const prefMode = document.getElementById('profile-mode').value;
      const howKnow = document.getElementById('profile-how-know').value;

      if (!username) {
        showMessage(t('auth.profile.usernameRequired', 'Please enter a username.'), 'error');
        return;
      }

      let finalAvatarUrl = null;
      let finalAvatarEmoji = document.querySelector('input[name="profile-avatar-emoji"]:checked')?.value || currentAvatarEmoji;

      if (avatarRemoved) {
        finalAvatarUrl = null;
      } else if (uploadedFile) {
        try {
          finalAvatarUrl = await resizeAndCompressImage(uploadedFile, 200, 200, 0.6);
          uploadedFile = null;
          fileInput.value = '';
        } catch (err) {
          showMessage(t('auth.profile.imageProcessError', 'Failed to process image. Please try a different one.'), 'error');
          return;
        }
      } else {
        finalAvatarUrl = currentAvatarUrl;
      }

      const submitBtn = formEl.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = t('auth.profile.saving', 'Saving…');
      submitBtn.disabled = true;

      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            username,
            avatar: finalAvatarEmoji,
            avatar_url: finalAvatarUrl,
            profession,
            class: classGrade,
            birthday,
            preferred_language: prefLanguage,
            preferred_mode: prefMode,
            how_did_you_know: howKnow
          }, { onConflict: 'id' });

        if (error) throw error;

        showMessage(t('auth.profile.saveSuccess', 'Profile saved successfully!'), 'success');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        currentAvatarUrl = finalAvatarUrl;
        currentAvatarEmoji = finalAvatarEmoji;
        if (finalAvatarUrl) avatarRemoved = false;
        updateAvatarDisplay();

        setTimeout(closeModal, 1500);
      } catch (err) {
        showMessage(t('auth.profile.saveError', 'Failed to save profile.') + ' ' + err.message, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // ──────────────────────────────────────────────
  // 6. Insert profile button into header
  // ──────────────────────────────────────────────
  function insertProfileButton() {
    const controls = document.querySelector('.ED-General-header__controls');
    if (!controls || document.getElementById('ED-General-profile-btn-container')) return;

    const btnContainer = document.createElement('span');
    btnContainer.id = 'ED-General-profile-btn-container';
    btnContainer.style.display = 'inline-flex';
    btnContainer.innerHTML = `<button id="ED-General-profile-btn" class="ED-General-header-btn" style="display:none;" title="${t('auth.profile.buttonTitle', 'View and edit your profile')}">${t('auth.profile.button', 'Profile')}</button>`;

    const authContainer = document.getElementById('ED-General-auth-btn-container');
    if (authContainer) {
      controls.insertBefore(btnContainer, authContainer);
    } else {
      controls.appendChild(btnContainer);
    }
  }

  function updateProfileButton(user) {
    const btn = document.getElementById('ED-General-profile-btn');
    if (!btn) return;
    if (user) {
      btn.textContent = t('auth.profile.button', 'Profile');
      btn.title = t('auth.profile.buttonTitle', 'View and edit your profile');
      btn.onclick = () => showProfileModal(user);
      btn.style.display = 'inline-flex';
    } else {
      btn.style.display = 'none';
      btn.onclick = null;
    }
  }

  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await waitForHeaderControls();

      insertProfileButton();

      supabase.auth.onAuthStateChange((event, session) => {
        updateProfileButton(session?.user ?? null);
      });

      const { data: { session } } = await supabase.auth.getSession();
      updateProfileButton(session?.user ?? null);

      document.addEventListener('translationsApplied', () => {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          updateProfileButton(currentSession?.user ?? null);
        });
      });
    } catch (err) {
      console.error('ED-profile initialisation failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();