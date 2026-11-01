# Digilax — agency website

The website of **Digilax**, a web agency that builds websites and small integrations
(quote forms, WhatsApp buttons, multilingual & Arabic sites, catalogs, QR codes, hosting)
for small and medium-sized businesses.

Live (GitHub Pages): https://yahi264.github.io/digilax/

## What's inside

| File / folder | What it is |
| --- | --- |
| `index.html` | The home page (all sections). |
| `work/textile-export.html` | Case study: a textile exporter's website (client name kept private). |
| `brand.html` | Brand kit: logo files and colours. |
| `js/config.js` | **Your settings** — phone, WhatsApp, email, socials, prices, reviews. |
| `js/i18n.js` | French, Turkish and Arabic texts (English is written in the HTML). |
| `js/main.js` | Animations and interactive demos. |
| `css/style.css` | All styles, colours for light and dark mode. |
| `assets/` | Logos (`logo-light.svg`, `logo-dark.svg`, `logo-mark.svg`, wordmarks) and case-study images. |
| `favicon.svg` | Browser tab icon. |
| `server/contact.php` | Email script for when the site moves to cPanel hosting. |
| `js/projects.js` | **Portfolio** — one entry per website (texts in 4 languages, screenshot, demo link). |
| `js/assistant.js` | The AI assistant (chat window) and its answers in 4 languages. |
| `server/ai/assistant.php` | Optional: connects the assistant to a real AI model (Claude) on cPanel. |
| `vendor/` | Animation libraries (GSAP, ScrollTrigger, Lenis) and the QR code library. |

## To fill in (placeholders)

All of these are in **`js/config.js`** unless noted:

- [ ] `whatsapp` — your WhatsApp number, digits only (e.g. `905321234567`)
- [ ] `phone` — the phone number as shown on the site
- [ ] `email` — your business email
- [ ] `instagram` and `linkedin` — links to your real profiles (the site shows `@digilax`)
- [ ] `city` and `hours`
- [ ] `testimonials` — real client reviews (until then, placeholder cards are shown)
- [ ] Business card demo: "Your Name" in `index.html` (search for `Your Name`)
- [ ] `server/contact.php` — `RECIPIENT` and `SENDER` addresses (only when you use cPanel hosting)

## Preview on your computer

```bash
node serve.mjs
```

Then open http://localhost:5178/digilax/

## Publish an update to GitHub Pages

```bash
git add -A && git commit -m "Update site" && git push origin main main:gh-pages
```

GitHub Pages serves the `gh-pages` branch (a copy of `main`); changes appear within a minute or two.

## Moving to your own domain / cPanel later

1. Upload every file (except `node_modules`, `server`, `serve.mjs`, `package*.json`) to `public_html`.
2. Upload `server/contact.php` to `public_html` too, fill in its addresses, and set
   `formEndpoint: "contact.php"` in `js/config.js` — the form will then email you directly.
3. In `404.html`, replace `/digilax/` with `/`.
4. Optional — real AI answers: follow the steps at the top of `server/ai/assistant.php`
   (Anthropic API key stored outside `public_html`), then set `aiEndpoint: "ai/assistant.php"`.

## Adding a new project to the portfolio

Open `js/projects.js`, copy one entry and change it. Put a 960×600 screenshot in
`assets/projects/`. Leave `url: ""` for clients who don't want a public link — the card then shows
"Private client". Never write the client's company name.
