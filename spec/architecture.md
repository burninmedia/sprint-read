# Architecture Spec

## Three-Panel Layout

The app fills 100dvh with three equal vertical panels. Each panel is `flex: 0 0 33.333%` inside a column flexbox on `.app`.

```
┌─────────────────────────────────┐
│  WordDisplay  (top 1/3)         │  RSVP focal point — one word at a time
├─────────────────────────────────┤
│  PDFPageView / TextPreview      │  Page canvas (PDF) or scrolling text (EPUB)
│  (middle 1/3)                   │
├─────────────────────────────────┤
│  Bottom panel  (bottom 1/3)     │
│  ├─ PDFUpload (file picker)     │
│  ├─ Controls row 1 (transport)  │
│  └─ Controls row 2 (WPM inputs) │
└─────────────────────────────────┘
```

The middle panel is **always rendered** — hiding it collapses the layout.
- PDF loaded → `PDFPageView` (canvas preview of current page)
- EPUB loaded → `TextPreview` (scrolling word context)
- Nothing loaded → `TextPreview` empty state

The **TOC overlay** (`TocDrawer`) is a full-screen `position: fixed` layer rendered outside the three-panel flow, mounted conditionally in `App.tsx`.

## Component Tree

```
App
├── WordDisplay          — ORP word rendering
├── PDFPageView          — PDF canvas + word highlight box (PDF only)
├── TextPreview          — Windowed word list with active highlight (EPUB / no-PDF)
├── div.bottom-panel
│   ├── PDFUpload        — Drag-and-drop / click file picker
│   └── Controls         — Transport buttons, progress bar, WPM inputs
└── TocDrawer (conditional) — Full-screen chapter navigator
```

## State — App.tsx

All playback state lives in `App.tsx`. Child components receive only what they need.

| State | Type | Purpose |
|---|---|---|
| `words` | `WordToken[]` | Extracted words with position metadata |
| `wordIndex` | `number` | Current word being displayed |
| `playState` | `'idle'\|'playing'\|'paused'` | Playback mode |
| `minWpm` / `maxWpm` | `number` | Speed ramp bounds |
| `currentWpm` | `number` | Rolling 10s average WPM (display only) |
| `pdfDoc` | `PDFDocumentProxy\|null` | PDF document handle (null for EPUB) |
| `chapters` | `Chapter[]` | TOC entries with word indices |
| `fileName` | `string\|null` | Loaded file name (for localStorage key) |
| `isLoading` | `boolean` | File parse in progress |
| `showToc` | `boolean` | TOC overlay visible |

### Refs alongside state

Every piece of state that is read inside the async scheduler callback also has a matching `useRef` (e.g. `wordIndexRef`, `minWpmRef`). This avoids stale closures without adding scheduler to dependency arrays.

## Scheduler

The playback scheduler in `App.tsx` uses `setTimeout` with drift compensation:

```
expectedTime = performance.now()
loop:
  drift = max(0, now - expectedTime)
  fire setTimeout(delay - drift)
  expectedTime += delay (nominal)
```

`buildDelayTable(words, minWpm, maxWpm, fromIndex)` pre-computes all delays using a 60-second time-based ease-in-out ramp so the ramp always takes ~1 minute regardless of document length.

## File Parsing

Both parsers return a shape compatible with the same `WordToken[]` / `Chapter[]` types:

```ts
interface WordToken { text: string; pageNum: number; x: number; y: number; w: number; h: number }
interface Chapter   { title: string; wordIndex: number; level: number }
```

- **PDF**: `parsePdf()` — uses PDF.js; returns real `pdfDoc` for canvas rendering and real `x/y/w/h` for highlight boxes.
- **EPUB**: `parseEpub()` — uses JSZip + DOMParser; `pdfDoc` is `null`, `x/y/w/h` are `0`.

The distinction `pdfDoc !== null` is the switch that decides whether to show `PDFPageView` or `TextPreview` in the middle panel.

## Position Memory

On every word advance the scheduler writes `localStorage['sprintread-pos:' + fileName] = wordIndex`. On file load the app reads it back to resume where the user left off.
