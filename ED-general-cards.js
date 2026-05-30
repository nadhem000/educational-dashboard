// ED-general-cards.js
// Card rendering and palette application functions

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean[0]+clean[0]+clean[1]+clean[1]+clean[2]+clean[2] : clean;
    const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
    if (!match) return { r: 60, g: 50, b: 40 };
    return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

function getLuminance(r, g, b) {
    const linearize = (c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function getHue(r, g, b) {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), delta = max - min;
    if (delta === 0) return 0;
    let hue = 0;
    if (max === rf) hue = ((gf - bf) / delta) % 6;
    else if (max === gf) hue = (bf - rf) / delta + 2;
    else hue = (rf - gf) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    return hue;
}

function applyCardPalettes(theme) {
    const isDark = theme === 'dark';
    document.querySelectorAll('.ED-General-card').forEach(cardEl => {
        const cardId = cardEl.getAttribute('data-card-id');
        const card = allCards.find(c => c.id === cardId);
        if (!card) return;
        const palette = isDark ? (card.darkModePalette || {}) : (card.lightModePalette || {});
        const accent = palette.accent || '#4a7fd9';
        cardEl.style.setProperty('--card-accent', accent);
        if (palette.iconBg) cardEl.style.setProperty('--ED-General-card-icon-bg', palette.iconBg);
        else cardEl.style.removeProperty('--ED-General-card-icon-bg');
        const rgb = hexToRgb(accent);
        const lum = getLuminance(rgb.r, rgb.g, rgb.b);
        const hue = getHue(rgb.r, rgb.g, rgb.b);
        const baseOpacity = 0.06 + (1 - lum) * 0.12;
        const opacityHover = baseOpacity * 2.1;
        const darkMultiplier = isDark ? 1.45 : 1;
        const finalOpacity = Math.min(baseOpacity * darkMultiplier, 0.22);
        const finalOpacityHover = Math.min(opacityHover * darkMultiplier, 0.40);
        let offsetX = 0;
        if (hue >= 0 && hue <= 50) offsetX = 2;
        else if (hue > 50 && hue <= 100) offsetX = 1;
        else if (hue >= 200 && hue <= 280) offsetX = -2;
        else if (hue > 280 && hue <= 330) offsetX = -1;
        let blurBase = 10, blurHover = 30;
        if (hue >= 0 && hue <= 100) { blurBase = 12; blurHover = 34; }
        else if (hue >= 200 && hue <= 300) { blurBase = 8; blurHover = 26; }
        cardEl.style.setProperty('--card-accent-r', rgb.r);
        cardEl.style.setProperty('--card-accent-g', rgb.g);
        cardEl.style.setProperty('--card-accent-b', rgb.b);
        cardEl.style.setProperty('--card-shadow-opacity', finalOpacity.toFixed(3));
        cardEl.style.setProperty('--card-shadow-opacity-hover', finalOpacityHover.toFixed(3));
        cardEl.style.setProperty('--card-shadow-blur', blurBase + 'px');
        cardEl.style.setProperty('--card-shadow-blur-hover', blurHover + 'px');
        cardEl.style.setProperty('--card-shadow-offset-x', offsetX + 'px');
        cardEl.style.setProperty('--card-shadow-offset-y', '3px');
        cardEl.style.setProperty('--card-shadow-offset-y-hover', (6 + Math.abs(offsetX)) + 'px');
    });
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderCardGrid(cards, targetId, categoryClass, lang, uiText) {
    const grid = document.getElementById(targetId);
    if (!grid) return;
    grid.innerHTML = '';
    cards.forEach(card => {
        const cardLang = card[lang] || card['en'] || {};
        const cardName = cardLang.name || card.id;
        const cardDesc = cardLang.description || uiText[lang].noDescription;
        const firstLetter = cardName.charAt(0).toUpperCase();
        let iconHTML = '';
        if (card.imageIcon && card.imageIcon.trim() !== '') {
            iconHTML = `<img src="${escapeHTML(card.imageIcon)}" alt="${escapeHTML(uiText[lang].imageIconAlt)}" onerror="this.setAttribute('data-error','1');this.nextElementSibling.style.display='flex';" loading="lazy"><span class="ED-General-card__icon-letter">${escapeHTML(firstLetter)}</span>`;
        } else {
            iconHTML = `<span class="ED-General-card__icon-letter" style="display:flex;">${escapeHTML(firstLetter)}</span>`;
        }
        let insideLinksHTML = '';
        if (card.insideLinks && card.insideLinks.length > 0) {
            insideLinksHTML = '<div class="ED-General-card__inside-links">' +
                card.insideLinks.map(il => {
                    const linkLang = il[lang] || il['en'] || {};
                    const linkName = linkLang.name || 'Link';
                    return `<a href="${escapeHTML(il.url)}" class="ED-General-inside-link" target="_blank" rel="noopener noreferrer" title="${escapeHTML(linkName)}">${escapeHTML(linkName)}<span class="ED-General-inside-link__arrow">↗</span></a>`;
                }).join('') + '</div>';
        }
        grid.insertAdjacentHTML('beforeend', `
            <div class="ED-General-card ${categoryClass}" data-card-id="${escapeHTML(card.id)}">
                <div class="ED-General-card__icon-container">${iconHTML}</div>
                <h3 class="ED-General-card__name">${escapeHTML(cardName)}</h3>
                <p class="ED-General-card__description">${escapeHTML(cardDesc)}</p>
                ${insideLinksHTML}
                <a href="${escapeHTML(card.link)}" class="ED-General-card__main-btn" target="_blank" rel="noopener noreferrer">${escapeHTML(uiText[lang].visitBtn)}<span class="ED-General-card__main-btn-arrow">→</span></a>
            </div>
        `);
    });
}

function renderAll(lang, theme, uiText) {
    for (const [category, config] of Object.entries(categoryConfig)) {
        renderCardGrid(
            allCards.filter(c => c.category === category),
            config.gridId,
            config.cssClass,
            lang,
            uiText
        );
    }
    applyCardPalettes(theme);
}
/**
 * Render the social media cards into a grid container.
 * @param {string} gridId - ID of the container element (e.g. 'socialGrid')
 * @param {string} lang - Current language code ('en', 'fr', 'ar')
 * @param {function} t - Translation function (key → localized string)
 */
function renderSocialCards(gridId, lang, t) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  grid.innerHTML = socialMedias.map(sm => {
    const name = sm[lang]?.mediaName || sm.en.mediaName;
    const link = sm.mediaLink || '#';
    const disabled = !sm.mediaLink;

    // Small icon (emoji) – hidden if an image is used
    const smallIconHidden = sm.mediaImage ? ' style="display:none;"' : '';
    const smallIcon = `<span class="ED-General-social-icon-small"${smallIconHidden}>${sm.mediaSmallIcon}</span>`;

    // Image with fallback to the small icon
    const imgTag = sm.mediaImage
      ? `<img src="${sm.mediaImage}" class="ED-General-social-img" alt="${name}"
           onerror="this.style.display='none'; this.previousElementSibling.style.display='inline-block';">`
      : '';

    const titleAttr = disabled ? ` title="${t('noLink')}"` : '';
    const disabledAttr = disabled
      ? `style="opacity:0.6; pointer-events:none;" ${titleAttr}`
      : '';

    return `<a href="${link}" class="ED-General-social-card" target="_blank" rel="noopener" ${disabledAttr}>
              ${sm.mediaImage ? smallIcon + imgTag : smallIcon}
              <span>${name}</span>
            </a>`;
  }).join('');
}
document.addEventListener('translationsApplied', function() {
  const theme = localStorage.getItem('dashboardTheme') || 'light';
  if (typeof renderAll === 'function' && window.UI_TEXT) {
    renderAll(EDTranslation.getCurrentLang(), theme, window.UI_TEXT);
  }
});