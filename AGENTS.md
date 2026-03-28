# Sprint Read — Agent Context

Sprint Read is a speed-reading SPA (Single Page Application) packaged as a native Android and iOS app via Capacitor. Users upload a PDF or EPUB and the app displays words one at a time using the RSVP/ORP technique, gradually ramping from a minimum WPM to a target maximum WPM.

## Spec Folder

All design decisions, constraints, and non-obvious rules live in `spec/`:

| File | Contents |
|---|---|
| `spec/architecture.md` | Three-panel layout, component tree, state flow |
| `spec/speed-reading.md` | RSVP/ORP algorithm, WPM ramp, punctuation timing |
| `spec/performance.md` | Render budget, imperative DOM patterns, timer drift |
| `spec/mobile.md` | Capacitor setup, WebView quirks, safe areas, build steps |

**Read the spec files before making changes.** Many constraints look surprising (e.g. no CSS transitions on the word, imperative highlight updates) but are deliberate — see the relevant spec file for the rationale.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite (`base: './'` — required for Capacitor WebView) |
| Native wrapper | Capacitor 8 (bundle ID `com.sprintread.app`) |
| PDF parsing | `pdfjs-dist` with local worker (`public/pdf.worker.min.mjs`) |
| EPUB parsing | `jszip` + DOMParser (no third-party EPUB library) |
| Styling | Plain CSS (`src/index.css`) — no CSS framework |

## Repository Layout

```
/
├── src/                   # React application source
│   ├── components/        # UI components
│   ├── utils/             # Parsing + algorithm logic
│   ├── App.tsx            # Root component, scheduler, state
│   └── index.css          # All styles (single file)
├── public/                # Static assets copied verbatim to dist/
│   └── pdf.worker.min.mjs # PDF.js worker (must stay local — no CDN in WebView)
├── android/               # Capacitor Android project
├── ios/                   # Capacitor iOS project
├── spec/                  # Design specs and constraints
├── scripts/               # Build-time helper scripts
├── capacitor.config.ts    # Capacitor configuration
└── vite.config.ts         # Vite configuration
```

## Key Commands

```bash
npm run build          # TypeScript check + Vite production build → dist/
npx cap sync android   # Copy dist/ into android/app/src/main/assets/public/
npx cap sync ios       # Copy dist/ into ios/App/App/public/
npm run build:mobile   # build + cap sync (both platforms)
npm run dev            # Local dev server (no Capacitor)
```

## Development Branch

All work goes on `claude/speed-reading-app-YMDym`, PRs target `main`.
Always run `npm run build && npx cap sync android` before committing so the built assets in `android/app/src/main/assets/public/` stay in sync — this is what the Android WebView actually loads.

## Critical Rules (quick reference)

- **No CDN URLs** — Capacitor WebView has no internet access for assets; everything must be bundled locally.
- **`base: './'` in vite.config.ts** — required for WebView relative paths.
- **No CSS `opacity`/`transition` on `.orp-word`** — causes words to vanish at high WPM (>600).
- **TextPreview must not re-render per word** — see `spec/performance.md`.
- **Wake lock must be held during playback** — see `spec/mobile.md`.
