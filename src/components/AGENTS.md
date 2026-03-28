# src/components/ — Agent Context

UI components. Each component receives only the props it needs — no component reaches into global state directly.

## Components

### WordDisplay.tsx
The RSVP focal point. Renders one word at a time split into `before | orp | after` spans. The ORP (red) letter is always at the exact horizontal centre of the screen.

**Critical constraints:**
- **No CSS `opacity` or `transition` on `.orp-word`** — at 900 WPM (67ms/word) any fade makes words vanish before they register. Instant swap is mandatory.
- `isEmpty` prop shows a placeholder string instead of a word.
- `wpm` prop displays the rolling average in the corner (hidden when `isEmpty`).

Props: `word`, `wpm`, `isEmpty?`

---

### PDFPageView.tsx
Renders the current PDF page to a `<canvas>` using PDF.js. Draws a red highlight box around the current word using `viewport.convertToViewportPoint()`. Auto-scrolls to keep the highlighted word centred.

Only processes the page containing `currentWordIndex` — does not pre-render adjacent pages.

Props: `pdfDoc`, `words: WordToken[]`, `currentWordIndex`

---

### TextPreview.tsx
Scrolling word-context view used for EPUBs (and as a fallback when no PDF is loaded). Shows a 180-word window around the current position with the active word highlighted.

**Performance contract (see `spec/performance.md`):**
- React re-renders are blocked to **once per line** via custom `memo` comparator.
- Word-level highlight is updated **imperatively** via `useImperativeHandle`.
- `App.tsx` calls `textPreviewRef.current.updateHighlight(index)` every word tick — this does a direct DOM class swap, bypassing React entirely.
- `scrollIntoView` fires only when the line number changes (guarded by `lastScrollLineRef`).

**Do not make this component re-render per word.** It will break playback timing.

Exports: `TextPreviewHandle` interface (for the ref type in App.tsx), `WORDS_PER_LINE` constant.

Props: `words: string[]`, `currentIndex: number`
Ref: `TextPreviewHandle { updateHighlight(index: number): void }`

---

### Controls.tsx
Bottom panel controls in two rows:
- **Row 1:** TOC button | skip-prev | stop | play/pause | skip-next | file picker button | progress bar
- **Row 2:** Min WPM number input | Max WPM number input

The progress bar is a range input that seeks on drag. File picker is a hidden `<input type="file">` triggered by an icon button; accepts `application/pdf,.epub`.

Props: `isPlaying`, `hasText`, `wordIndex`, `totalWords`, `minWpm`, `maxWpm`, `chapters`, `fileName`, `isLoading`, `onPlay`, `onPause`, `onStop`, `onMinWpmChange`, `onMaxWpmChange`, `onSeek`, `onPrevChapter`, `onNextChapter`, `onFileSelected`, `onTocOpen`

---

### PDFUpload.tsx
Drag-and-drop / click file upload zone shown above Controls in the bottom panel. Accepts `application/pdf` and `.epub` files. Validates by file extension (not MIME type — Android reports EPUBs as `application/octet-stream`).

Shows spinner while `isLoading`, filename + "Click to replace" once loaded.

Props: `onFileSelected`, `isLoading`, `fileName`

---

### TocDrawer.tsx
Full-screen overlay (position: fixed, covers entire viewport) with a scrollable chapter list. Slides up from bottom on open.

- Header: "Table of Contents" title + ✕ close button (always visible)
- List: all chapters with % position, indented by `ch.level` via CSS `--depth` variable
- Active chapter (last one with `wordIndex ≤ currentWordIndex`) highlighted in red
- Tapping a chapter seeks to that word position and closes the drawer

Props: `chapters`, `currentWordIndex`, `totalWords`, `onSeek`, `onClose`
