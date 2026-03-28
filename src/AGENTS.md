# src/ — Agent Context

This directory contains the entire React application.

## Entry Points

| File | Purpose |
|---|---|
| `main.tsx` | React DOM root mount |
| `App.tsx` | Root component — owns all state, the playback scheduler, wake lock, and file loading |
| `index.css` | **All styles** — single file, no CSS framework, BEM-ish class names |

## Subdirectories

- `components/` — UI components (see `components/AGENTS.md`)
- `utils/` — Pure logic: file parsers, ORP algorithm, speed ramp (see `utils/AGENTS.md`)

## App.tsx — What It Owns

App.tsx is intentionally a "fat" root component. It is the only place that:

- Holds playback state (`wordIndex`, `playState`, `minWpm`, `maxWpm`, etc.)
- Runs the drift-compensated `setTimeout` scheduler
- Acquires/releases the Screen Wake Lock
- Dispatches file loading to `parsePdf` or `parseEpub` based on file extension
- Persists and restores word position via `localStorage`
- Pushes the active-word highlight to `TextPreview` via `textPreviewRef.current.updateHighlight()`

**Do not move scheduler logic into a hook or child component** without understanding the stale-closure pattern used here — every scheduler-read value has a matching `useRef` kept in sync.

## index.css Structure

Sections in order:
1. CSS custom properties (`:root`)
2. Reset + base
3. `.app` layout
4. `.word-display` + ORP word styles
5. `.pdf-page-view`
6. `.bottom-panel` + `.controls`
7. `.pdf-upload`
8. `.toc-overlay` + `.toc-drawer`
9. `.text-preview`
10. Responsive tweaks

Add new component styles at the end of the relevant section. Do not introduce CSS modules or a separate stylesheet per component.
