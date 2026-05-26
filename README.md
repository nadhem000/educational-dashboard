# Educational Dashboard

A clean, customizable, multi-language dashboard to organize your favorite learning platforms, tools, games, and news sources. Built with pure HTML, CSS, and JavaScript — no frameworks, no build steps.

![Version](https://img.shields.io/badge/version-0.0.1-blue)  
![Languages](https://img.shields.io/badge/languages-English%20%7C%20Français%20%7C%20العربية-success)  
![License](https://img.shields.io/badge/license-MIT-lightgrey)

<p align="center">
  <img src="assets/icons/icon-96x96.png" alt="Dashboard Icon" width="96"/>
</p>

## ✨ Features

- **🌗 Light / Dark mode** – Toggle with a button or use `Ctrl+Shift+T`; persists in `localStorage`.
- **🌍 Multi-language** – English, French, and Arabic (`العربية`) with full RTL support.
- **📱 Responsive** – Looks great on desktop, tablet, and mobile.
- **🎨 Per-card theming** – Each card can have its own accent colour and shadow, adapting to light/dark modes.
- **📂 Modular structure** – Header and footer are loaded from separate `header.html` and `footer.html` for easy reuse.
- **⚡ Dynamic rendering** – Cards are generated from a central JavaScript data file (`data_general.js`); add or modify cards without touching the UI.
- **🔗 Inside links & main action** – Each card supports a primary link and multiple secondary links (e.g., specific sections of a site).
- **🏷️ Category sections** – Automatically groups cards into "Education", "Others", "Games", "News", and "Obsolete & Unused".
- **💾 Persistent preferences** – Language and theme choices are saved locally.

---

## 📁 Project Structure

```
Educational Dashboard/
├── index.html              # Main page (all CSS and JS are inline)
├── header.html             # Top navigation bar (included dynamically)
├── footer.html             # Footer with credits and links
├── data_general.js         # Card definitions and category configuration
└── assets/
    └── icons/
        └── icon-96x96.png  # Favicon / header icon
```

The entire UI logic, styling, and translation are embedded in `index.html` to keep the setup simple.

---

## 🚀 Quick Start

### 1. Clone or download the repository
```bash
git clone https://github.com/nadhem000/educational-dashboard.git
cd educational-dashboard
```

### 2. Open in browser
Because the dashboard uses `fetch()` to load `header.html` and `footer.html`, you must serve the files through a local web server. Any of these will work:

- **VS Code Live Server** extension – right‑click `index.html` → “Open with Live Server”
- **Python (built-in)**  
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000`
- **Node.js** with `http-server` or `live-server`

### 3. Deploy to the web
Works perfectly on static hosting:

- **GitHub Pages** – just enable Pages from the `main` branch.
- **Netlify** – drag & drop the whole folder or connect your repo.
- **Vercel** / **Cloudflare Pages** – same as any static site.

---

## 🛠 Customisation

### Adding or editing a card

All cards live inside **`data_general.js`**. Each entry follows this structure:

```javascript
{
  id: "unique-id",                 // unique identifier
  category: "education",           // must match one of the categories in categoryConfig
  link: "https://example.com",     // main "Visit" button URL
  imageIcon: "https://example.com/icon.png",  // optional: icon URL; if omitted, a letter fallback is used
  insideLinks: [                   // optional: secondary links shown as badges
    {
      url: "https://example.com/part2",
      en: { name: "Section 2" },
      fr: { name: "Section 2" },
      ar: { name: "القسم 2" }
    }
  ],
  // Multi‑language card name & description
  en: {
    name: "Platform Name",
    description: "Brief description"
  },
  fr: {
    name: "Nom de la plateforme",
    description: "Brève description"
  },
  ar: {
    name: "اسم المنصة",
    description: "وصف موجز"
  },
  // Custom colours per card (optional)
  lightModePalette: { accent: "#ff6b6b", iconBg: "#fff5f5" },
  darkModePalette:  { accent: "#ff8e8e", iconBg: "#2d1f1f" }
}
```

Simply add a new object to the `allCards` array and the dashboard picks it up automatically.

### Changing categories

In `data_general.js`, `categoryConfig` maps internal category names to CSS classes and grid containers:

```javascript
const categoryConfig = {
  education: { gridId: "cardGrid",    cssClass: "ED-General-card--education" },
  others:    { gridId: "othersGrid",  cssClass: "ED-General-card--others" },
  games:     { gridId: "gamesGrid",   cssClass: "ED-General-card--games" },
  news:      { gridId: "newsGrid",    cssClass: "ED-General-card--news" },
  obsolete:  { gridId: "obsoleteGrid",cssClass: "ED-General-card--obsolete" }
};
```

You can add or remove categories – just make sure the corresponding grid `<div>` with the correct `id` exists in `index.html`.

### Translating static UI text

The translation dictionary is inside `index.html` (the `uiText` object). Edit the values for `en`, `fr`, or `ar` to change labels like “Visit”, section titles, footer text, etc.

### Theming

Light/dark colour variables are defined in the `:root` and `[data-theme="dark"]` CSS blocks. Adjust them to create your own palette.

---

## 🧱 Technologies

- **HTML5**
- **CSS3** (custom properties, flexbox, grid, transitions)
- **Vanilla JavaScript** (no jQuery, no framework)
- **LocalStorage** for persistence
- **Fetch API** for loading partial HTMLs

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).  
You are free to use, modify, and distribute it as long as you include the original license.

---

## 👤 Author

Developed by **Mejri Ziad**  
Hosted on [GitHub](https://github.com) and [Netlify](https://netlify.com).

If you like this project, please consider giving it a ⭐ on GitHub!

---

## 🐞 Issues & Contributions

Found a bug or have a feature idea? Feel free to open an issue or pull request on the repository. Contributions are welcome!
