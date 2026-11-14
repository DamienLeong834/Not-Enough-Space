# Technical Note — Not Enough Space

A short, honest description of how the product is built, for judges and developers.

## Stack

- **Zero dependencies, zero build step.** Plain HTML, CSS, and vanilla JavaScript
  (ES5/ES2015). No framework, no bundler, no npm install. Open `index.html` (or serve
  the folder) and it runs.
- **Progressive Web App (PWA).** A `manifest.webmanifest` + service worker (`sw.js`)
  let it install to a device and run **fully offline** after first load. Ideal for
  low-bandwidth classrooms.
- **Hash-routed SPA.** Routes (`#/`, `#/c/{id}`, `#/museum`, `#/control`, `#/album`,
  `#/compare`, `#/certificate`, `#/about`) are handled by a small router in `js/app.js`.

## File structure

```
index.html              app shell, script load order, topbar
css/styles.css          all styling, including a11y themes
js/
  data.js               window.NES_DATA: chapters, museum, zones, tiers, challenge meta
  nssdc-data.js         verified NSSDCA catalogue ID crosswalk (verifiedOn 2026-11-14)
  i18n.js               EN + ES dictionaries, L("key") lookup
  state.js              progress, badges, preferences (localStorage)
  app.js                router, home map, comic reader, About & Sources, footer
  game.js               "Deep Space Dive" fishing/quiz mini-game
  ui.js, bg.js          shared UI helpers, animated space background
  tts.js, sfx.js        text-to-speech narration, sound effects
  nssdc.js              opens NSSDCA source links for each artifact
comics/                 comic page assets per chapter (ch0–ch13)
icons/, fonts/          PWA icons and webfonts
README.md, LICENSE      user-facing guide and open-source licence
"For Submission/"       written submission material
```

## Data-driven by design

All content (14 chapters, 13 museum artifacts, 7 depth zones, 4 rarity tiers) lives in
`js/data.js` as a single `window.NES_DATA` object. The UI renders entirely from this
data, so the project is **easy to extend** (add a chapter, add an artifact, add a
language) without touching layout code. NSSDCA catalogue keys are the link between the
kid-facing story and the authoritative source.

## Internationalization

`L("key")` resolves strings from `js/i18n.js`. English and Spanish are fully supported;
adding a third language is a single dictionary object. The language toggle is in the
topbar and persists per user.

## Accessibility (built in, not bolted on)

- Full **keyboard navigation** and visible focus states.
- **ARIA** labels/roles on interactive elements and game controls.
- **High-contrast** mode, **easy-read** mode, and **text scaling** (applied to `<html>`
  data-attributes).
- **Reduced-motion** support (respects `prefers-reduced-motion` and a manual toggle);
  the animated background and reveal animations degrade gracefully.
- Optional **text-to-speech** narration and **sound effects**, both toggleable.
- The global footer (on every view) carries an **About & Sources** link documenting
  provenance, sources, accessibility, privacy, team, and credits.

## Privacy

No accounts, no analytics, no network calls except (a) loading the page and (b) opening
an NSSDCA source link when a user clicks an artifact. All progress is stored locally in
the browser (`localStorage`). Nothing is uploaded.

## Testing & verification

- Scope/hoisting and load checks via a Node probe harness.
- Render verification via headless Chrome (DOM dump + console-error capture). After the
  latest fix, the home view renders all 14 chapter cards and the global footer, and the
  About view renders the full team — with **zero console errors**.
- NSSDCA keys cross-checked against the archive (see `02-references-citations.md`).

## Known limitations / next steps

- No automated test suite yet (manual + headless checks only).
- All 14 chapters have six comic pages (84 images). One page still uses a temporary
  duplicate while its final artwork is completed.
- Educator dashboard and printable worksheets not yet built.
