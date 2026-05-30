// ED-general-shortcuts.js
// Handles ?goto= shortcuts (e.g., /?goto=arabic-hub)

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const goto = urlParams.get('goto');
    if (goto) {
        const linkMap = {
            'arabic-hub': 'https://arabic-hub.netlify.app',
            'english-hub': 'https://english-hub-education.netlify.app',
            'mathematics-hub': 'https://mathematics-hub-education.netlify.app',
            'french-hub': 'https://french-hub.netlify.app',
            'game-hub': 'https://games-collection-hub.netlify.app',
            'cosmic-news': 'https://universe-chronicles.netlify.app',
            'wesnoth-tools': 'https://wesnoth-tools-helpers.netlify.app'
        };
        const targetUrl = linkMap[goto];
        if (targetUrl) {
            const siteName = goto.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const overlay = document.createElement('div');
            overlay.id = 'goto-overlay';
            overlay.style.cssText = `
                position:fixed;top:0;left:0;width:100%;height:100%;
                background:rgba(0,0,0,0.7);display:flex;align-items:center;
                justify-content:center;z-index:9999;
            `;
            overlay.innerHTML = `
                <div style="
                    background:var(--ED-General-color-surface,#fff);
                    padding:2rem;border-radius:16px;text-align:center;
                    max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin:0 0 0.8rem;color:var(--ED-General-color-text-primary,#1e293b)">
                        ${siteName}
                    </h3>
                    <p style="margin:0 0 1.5rem;color:var(--ED-General-color-text-secondary,#5a6c7d)"
                       data-i18n="shortcutPrompt">Open in a new tab?</p>
                    <button id="goto-launch-btn" style="
                        background:var(--card-accent,var(--ED-General-color-accent-default,#4a7fd9));
                        color:var(--ED-General-color-text-on-accent,#fff);
                        border:none;border-radius:22px;padding:0.6rem 1.5rem;
                        font-weight:600;cursor:pointer;font-size:1rem;
                    " data-i18n="launchBtn">Launch</button>
                </div>
            `;
            document.body.prepend(overlay);
            document.getElementById('goto-launch-btn').addEventListener('click', () => {
                window.open(targetUrl, '_blank', 'noopener');
                overlay.remove();
                history.replaceState(null, '', window.location.pathname);
                location.reload();
            });
        }
    }
})();