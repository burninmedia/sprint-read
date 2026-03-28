# Mobile / Capacitor Spec

## Overview

The web app (`dist/`) is wrapped as a native app by Capacitor 8. Capacitor serves the built files from a local WebView — there is no server and no internet connection for assets.

Bundle ID: `com.sprintread.app`
Platforms: Android (primary), iOS

## Critical Vite Config

`vite.config.ts` must have `base: './'`. Without it, Vite emits absolute asset paths (`/assets/index.js`) that fail in the WebView because there is no root `/`.

```ts
export default defineConfig({
  base: './',
  build: { assetsInlineLimit: 0 },  // don't inline assets — keep them as files
  plugins: [react()],
})
```

## PDF.js Worker

The PDF.js worker **must not load from a CDN**. The WebView has no network access. The worker file is bundled locally:

- Source: `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
- Committed copy: `public/pdf.worker.min.mjs`
- Vite copies `public/` verbatim to `dist/`; Capacitor copies `dist/` to native assets

If you upgrade `pdfjs-dist`, copy the new worker file to `public/pdf.worker.min.mjs`.

Worker URL is set in `src/utils/pdfParser.ts`:
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../../public/pdf.worker.min.mjs', import.meta.url).href
```

## Build → Deploy Flow

Every code change requires a full rebuild before testing on device:

```bash
npm run build           # 1. TypeScript + Vite → dist/
npx cap sync android    # 2. Copy dist/ to android/app/src/main/assets/public/
# Open Android Studio → Run
```

The built assets in `android/app/src/main/assets/public/` are **committed to git**. This lets the Android project build without requiring an npm build step (useful for CI and reviewers who don't have Node installed).

When pushing, always include the updated assets directory so the Android project stays in sync.

## Viewport / Safe Areas

`index.html` meta viewport:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

`viewport-fit=cover` + `env(safe-area-inset-*)` padding on `.app` ensures content doesn't hide behind notches or the Android navigation bar.

Touch behaviour on `body`:
- `overscroll-behavior: none` — prevents rubber-band / pull-to-refresh
- `touch-action: manipulation` — faster tap response, disables double-tap zoom
- `-webkit-tap-highlight-color: transparent` — removes grey tap flash

## Screen Wake Lock

The app requests `navigator.wakeLock.request('screen')` when playback starts to prevent the screen from dimming or locking mid-read. See `spec/speed-reading.md` for details.

On Android the wake lock can be silently denied in battery saver mode — the app handles this gracefully (catches the error, continues playback).

## Capacitor Plugins in Use

| Plugin | Purpose |
|---|---|
| `@capacitor/splash-screen` | Native splash on launch |
| `@capacitor/status-bar` | Hide/style the status bar |
| `@capacitor/haptics` | Available but not currently used |
| `@capacitor/filesystem` | Available but not currently used |

## Android-Specific Notes

- Package: `com.sprintread.app`
- `android/capacitor-cordova-android-plugins/` gradle stubs are **committed** (not gitignored) so Android Studio can build without running `npm run setup`
- `android/app/src/main/assets/public/` is **committed** — see build flow above
- `androidScheme: 'https'` in `capacitor.config.ts` — serves the WebView over `https://localhost` which enables APIs that require a secure context (Wake Lock, File API)

## iOS Notes

iOS project lives in `ios/`. The `ios/App/App/public/` directory mirrors the Android assets pattern. To deploy to iOS:
```bash
npm run build
npx cap sync ios
# Open ios/App/App.xcodeproj in Xcode → Run
```
