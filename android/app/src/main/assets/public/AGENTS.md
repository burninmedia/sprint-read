# public/ — Agent Context

Static files copied verbatim into `dist/` by Vite and then into native app assets by `cap sync`. Files here are served at the root path of the WebView.

## Files

### pdf.worker.min.mjs
PDF.js worker script. **Must be kept local** — the Capacitor WebView has no internet access, so CDN URLs for the worker will silently fail and PDF parsing will break.

- Source: `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
- Referenced in: `src/utils/pdfParser.ts` via `new URL('../../public/pdf.worker.min.mjs', import.meta.url).href`

**If you upgrade `pdfjs-dist`:** copy the new worker file here to replace this one. The version must match the `pdfjs-dist` package version exactly.

### icon.svg
Source SVG for the app icon. Used by `scripts/generate-icons.mjs` to generate all required icon sizes for Android and iOS via the `sharp` library.

To regenerate icons after editing:
```bash
npm run generate-icons
```
