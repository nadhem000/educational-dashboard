// ED-general-profile.js – User profile viewing & editing (partial secure contact with Supabase)
(function () {
  'use strict';
  // ── SECRET DEVELOPER SHORTCUT ──
  // Set to true to enable “pick one folder → store all images”
  window.imageShortcut = true;   // ← change this to true when you need it
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
  // 4. Helper – resize & compress image to base64 (preserves GIF animation)
  // ──────────────────────────────────────────────
  function resizeAndCompressImage(file, maxWidth, maxHeight, quality) {
    // If it's a GIF, return the original file as base64 without any processing
    if (file.name.toLowerCase().endsWith('.gif')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read GIF file'));
        reader.readAsDataURL(file);
      });
    }

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
  // 5. Show avatar modal (accessible globally)
  // ──────────────────────────────────────────────
  function showAvatarModal(src) {
    const existing = document.getElementById('avatar-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'avatar-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:10000; cursor:pointer;';
    modal.innerHTML = `<img src="${src}" style="max-width:90%; max-height:90%; object-fit:contain; border-radius:8px;">`;
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
  }

  // ──────────────────────────────────────────────
  // 6. Update welcome bar (accessible globally)
  // ──────────────────────────────────────────────
  async function updateWelcomeBar(user) {
    const bar = document.getElementById('welcome-bar');
    if (!bar) return;
    if (!user) {
      bar.style.display = 'none';
      return;
    }

    const imgEl = document.getElementById('welcome-avatar-img');
    const emojiEl = document.getElementById('welcome-avatar-emoji');
    const textEl = document.getElementById('welcome-text');
    const container = document.getElementById('welcome-avatar-container');

    let username = '';
    let avatarUrl = null;
    let avatarEmoji = null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, avatar, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && profile) {
        username = profile.username || '';
        avatarUrl = profile.avatar_url;
        avatarEmoji = profile.avatar;
      }
    } catch (e) { /* ignore */ }

    // Welcome text with translation
    const template = t('welcomeMessage', 'Welcome, {name}');
    const displayName = username || (user.email ? user.email.split('@')[0] : 'User');
    const welcomeText = template.replace('{name}', displayName);
    textEl.textContent = welcomeText;

    // Avatar display + click behaviour
    if (avatarUrl) {
  // Only add cache-busting for real URLs (skip base64 data URIs)
  let displayUrl = avatarUrl;
  if (avatarUrl.startsWith('http')) {
    const cacheBuster = avatarUrl.includes('?') ? '&' : '?';
    displayUrl = avatarUrl + cacheBuster + 'v=' + Date.now();
  }
  imgEl.src = displayUrl;
  imgEl.style.display = 'block';
  emojiEl.style.display = 'none';
  container.style.cursor = 'pointer';
  container.onclick = () => showAvatarModal(avatarUrl);
} else {
      imgEl.style.display = 'none';
      emojiEl.textContent = avatarEmoji || '🦉';
      emojiEl.style.display = 'block';
      container.style.cursor = 'default';
      container.onclick = null;
    }

    bar.style.display = 'block';
  }

  // ──────────────────────────────────────────────
  // 7. Build & show the profile modal
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
                <!-- Upload & Remove row -->
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <input type="file" id="profile-avatar-upload" accept="image/*" style="display:none;" />
                  <button type="button" id="profile-avatar-upload-btn" class="ED-General-header-btn">
                    📷 ${t('auth.profile.uploadAvatar', 'Upload')}
                  </button>
                  <button type="button" id="profile-avatar-remove-btn" class="ED-General-header-btn" style="font-size:0.8rem;">
                    ✕ ${t('auth.profile.removeAvatar', 'Remove')}
                  </button>
                </div>
                <!-- Experimental animated avatar (separate row, note below) -->
                <div style="margin-top:0.3rem;">
                  <button type="button" id="profile-create-animated-avatar-btn"
                          class="ED-General-header-btn"
                          style="font-size:0.8rem;"
                          title="Experimental feature">
                    🎞️ ${t('auth.profile.createAnimatedAvatar', 'Create animated avatar')}
                  </button>
                  <div style="font-size:0.7rem; color: var(--ED-General-color-text-tertiary); margin-top:0.2rem;">
                    ${t('auth.profile.experimentalNote', 'still experimental')}
                  </div>
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
        // --- Fire encrypted backup event (every profile save) ---
        (async () => {
          const { data } = await supabase.auth.getSession();
          const email = data?.session?.user?.email;
          if (email) {
            document.dispatchEvent(new CustomEvent('ed-enc-backup-capture', {
              detail: {
                email,
                profile: {
                  username,
                  avatar: finalAvatarEmoji,
                  avatar_url: finalAvatarUrl,
                  profession,
                  class: classGrade,
                  birthday,
                  preferred_language: prefLanguage,
                  preferred_mode: prefMode,
                  how_did_you_know: howKnow
                }
              }
            }));
          }
        })();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        currentAvatarUrl = finalAvatarUrl;
        currentAvatarEmoji = finalAvatarEmoji;
if (finalAvatarUrl) avatarRemoved = false;
else avatarRemoved = true;       // <- ensure avatarRemoved stays true
        updateAvatarDisplay();
// Force emoji display when avatar was removed (finalAvatarUrl is null)
if (!finalAvatarUrl) {
    avatarDisplay.innerHTML = '';
    avatarDisplay.textContent = finalAvatarEmoji || currentAvatarEmoji || '🦉';
    avatarDisplay.style.fontSize = '2.5rem';
    avatarDisplay.style.background = 'var(--ED-General-color-bg-secondary)';
}
        // Refresh the welcome bar immediately
        await updateWelcomeBar(user);
        setTimeout(closeModal, 1500);
      } catch (err) {
        showMessage(t('auth.profile.saveError', 'Failed to save profile.') + ' ' + err.message, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  // ──────────────────────────────────────────────
  // 8. Insert profile button into header
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

  // ──────────────────────────────────────────────
  // 9. Init – setup auth listener and welcome bar
  // ──────────────────────────────────────────────
  async function init() {
    try {
      const Supabase = await loadSupabaseClient();
      supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__profileSupabase = supabase;
      await waitForHeaderControls();
      insertProfileButton();

      // Auth state change handler
      supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user ?? null;
        updateProfileButton(user);
        updateWelcomeBar(user);
      });

      // Initial session load
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      } catch (err) {
        console.debug('Profile getSession failed (offline):', err.message);
      }
      const initialUser = session?.user ?? null;
      updateProfileButton(initialUser);
      await updateWelcomeBar(initialUser);

      // Re‑translate welcome bar when language changes
      document.addEventListener('translationsApplied', async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user ?? null;
          updateProfileButton(user);
          await updateWelcomeBar(user);
        } catch (_) {}
      });

      // Listen for avatar-updated message from animation creator (cross-tab)
      window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'avatar-updated') {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await updateWelcomeBar(session.user);
          } catch (_) {}
        }
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

// =================================================================
// ██ S A N D B O X   –   A N I M A T E D   A V A T A R   (base64) ██
// (Triggered only by the "Create animated avatar" button)
// =================================================================
(function () {
  'use strict';
  console.log('[Sandbox] Initialising…');
  if (window.imageShortcut !== true) {
    console.log('[Sandbox] imageShortcut is not true – exiting.');
    return;
  }

  const SUPABASE_URL = 'https://hmjbzzuresgzwzefjpyt.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamJ6enVyZXNnend6ZWZqcHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjczNDUsImV4cCI6MjA5NTYwMzM0NX0.44Q-Hkl4Rr9LuQhwryrQklFi809xYGteHgsS9nMG0ro';

  // ── Folder picker (hidden) ──
  const folderInput = document.createElement('input');
  folderInput.type = 'file';
  folderInput.webkitdirectory = true;
  folderInput.directory = true;
  folderInput.multiple = true;
  folderInput.accept = 'image/*';
  folderInput.style.display = 'none';
  document.body.appendChild(folderInput);
  console.log('[Sandbox] Folder picker created.');

  // ── IndexedDB (stores base64 data URLs) ──
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('ED_ImageFolderCache', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'name' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function storeImage(name, dataUrl) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put({ name, data: dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  // ── Clear all existing images from IndexedDB ──
  async function clearAllImages() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  }

  function compressToBase64(file, maxWidth = 300, quality = 0.5) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Loading overlay ──
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'sandbox-loading-overlay';
  loadingOverlay.style.cssText = `
    position: fixed; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.5); z-index:9999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  `;
  loadingOverlay.innerHTML = `
    <div style="background: var(--ED-General-color-surface); color: var(--ED-General-color-text-primary);
                padding: 2rem; border-radius: 16px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
      <div style="border: 4px solid var(--ED-General-color-border);
                  border-top: 4px solid var(--ED-General-color-accent-default);
                  border-radius: 50%; width: 40px; height: 40px;
                  animation: spin 0.8s linear infinite; margin: 0 auto 1rem;"></div>
      <p style="margin:0; font-size:0.9rem; color: var(--ED-General-color-text-secondary);">
        Processing images…
      </p>
    </div>
  `;
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);

  // ── Process folder selection ──
  folderInput.addEventListener('change', async () => {
    console.log('[Sandbox] Folder selection change event fired.');
    const files = Array.from(folderInput.files);
    console.log(`[Sandbox] ${files.length} file(s) selected.`);
    if (files.length === 0) return;

    // Show loading overlay
    document.body.appendChild(loadingOverlay);

    // Clear old images first
    try {
      await clearAllImages();
      console.log('[Sandbox] Existing images cleared.');
    } catch (e) {
      console.warn('[Sandbox] Failed to clear old images:', e);
    }

    let stored = 0;
    const collectedImages = [];

    for (const file of files) {
      if (!/\.(jpg|jpeg|png|gif|webp|bmp|svg|avif|tiff?|heic|heif|ico)$/i.test(file.name)) {
        console.log(`[Sandbox] Skipping non-image file: ${file.name}`);
        continue;
      }
      try {
        console.log(`[Sandbox] Processing ${file.name}…`);
        const dataUrl = await compressToBase64(file, 300, 0.5);
        await storeImage(file.name, dataUrl);
        collectedImages.push(dataUrl);
        stored++;
        console.log(`[Sandbox] Stored ${file.name} (${stored} total)`);
      } catch (err) {
        console.warn('[Sandbox] Failed to process file:', file.name, err);
      }
    }
    folderInput.value = '';

    // Remove loading overlay
    if (loadingOverlay.parentNode) {
      document.body.removeChild(loadingOverlay);
    }

    // If nothing was stored, alert and stop
    if (stored === 0) {
      alert('No valid images were found in the folder. Please try again with a folder containing image files.');
      return;
    }

    console.log(`[Sandbox] Processing complete. ${stored} images stored.`);

    // ── Now try to backup the images ──
    console.log('[Sandbox] Attempting backup dispatch…');
    console.log('[Sandbox] window.__profileSupabase exists?', !!window.__profileSupabase);
    console.log('[Sandbox] window.supabase exists?', !!window.supabase);

    let supabaseClient = null;
    if (window.__profileSupabase) {
      console.log('[Sandbox] Using shared supabase client from profile.');
      supabaseClient = window.__profileSupabase;
    } else if (window.supabase && window.supabase.createClient) {
      console.log('[Sandbox] Creating a new supabase client.');
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn('[Sandbox] No supabase client available – cannot backup.');
    }

    if (collectedImages.length > 0 && supabaseClient) {
      try {
        console.log('[Sandbox] Fetching session…');
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
          console.error('[Sandbox] Session error:', error);
        } else {
          console.log('[Sandbox] Session obtained:', session ? 'yes' : 'no');
          const email = session?.user?.email;
          if (email) {
            console.log(`[Sandbox] Dispatching backup event for ${email} with ${collectedImages.length} images.`);
            document.dispatchEvent(new CustomEvent('ed-enc-backup-capture', {
              detail: {
                email,
                phase_upload_animated_avatar: {
                  images: collectedImages,
                  timestamp: Date.now()
                }
              }
            }));
            console.log('[Sandbox] Backup event dispatched.');
          } else {
            console.warn('[Sandbox] No email in session – cannot backup.');
          }
        }
      } catch (err) {
        console.error('[Sandbox] Backup error:', err);
      }
    } else {
      console.warn('[Sandbox] Backup skipped – no images or no client.');
    }

    // Redirect to animation creator
    if (stored > 0) {
      console.log('[Sandbox] Redirecting to animation-creater.html');
      window.location.href = 'animation-creater.html';
    }
  });

  // ── Hook the button persistently ──
  const observer = new MutationObserver(() => {
    const animBtn = document.getElementById('profile-create-animated-avatar-btn');
    if (animBtn && !animBtn.dataset.shortcutHooked) {
      animBtn.dataset.shortcutHooked = 'true';
      console.log('[Sandbox] Hooking animated avatar button.');
      animBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[Sandbox] Button clicked – opening folder picker.');
        folderInput.click();
      }, true);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[Sandbox] MutationObserver started.');
})();