# src/utils/ — Agent Context

Pure logic modules — no React, no DOM (except the DOMParser used in epubParser for parsing, not rendering).

## orp.ts

Implements the Optimal Recognition Point lookup table and word splitter.

```ts
splitWordAtOrp(word: string): { before: string; orp: string; after: string }
```

ORP index by word length:
- 1–2 → 0, 3–4 → 1, 5–6 → 2, 7–9 → 3, 10–13 → 4, 14+ → 5

Returns the three segments rendered by `WordDisplay`. The `orp` character is always a single letter displayed in red at screen centre.

---

## speedRamp.ts

Builds the per-word delay table for the entire document in one pass before playback starts.

```ts
buildDelayTable(words: string[], minWpm: number, maxWpm: number, fromIndex?: number, rampMs?: number): number[]
```

- Ramp is **time-based** (default 60 000ms), not position-based, so it always takes ~1 minute regardless of document length.
- Uses cubic ease-in-out (`easeInOut`).
- Applies punctuation multipliers via `getWordMultiplier(word)`:
  - Sentence end (`.!?`) → 2.2×
  - Clause boundary (`,;:`) → 1.45×
  - All-digit tokens → 1.8×
- `fromIndex` fills the first N slots with `0` so indices stay aligned with the words array.
- Returns delay in milliseconds for each word.

---

## pdfParser.ts

Parses a PDF `File` into words and chapters using PDF.js.

```ts
parsePdf(file: File): Promise<ParsedPdf>
```

```ts
interface WordToken { text: string; pageNum: number; x: number; y: number; w: number; h: number }
interface Chapter   { title: string; wordIndex: number; level: number }
interface ParsedPdf { pdfDoc: PDFDocumentProxy; words: WordToken[]; chapters: Chapter[] }
```

- Text extraction: iterates all pages, splits text items on whitespace, estimates per-word x position proportionally within the item's bounding box.
- Chapters: traverses the PDF outline (bookmarks) recursively using `pdf.getOutline()`. Resolves each outline entry's destination to a page number, maps it to the first word on that page. Falls back to scanning for "Chapter N" text if no outline exists.
- `pdfDoc` is kept alive (not closed) so `PDFPageView` can continue rendering pages.

**Worker:** PDF.js worker is loaded from `../../public/pdf.worker.min.mjs` (local file, not CDN). See `spec/mobile.md`.

---

## epubParser.ts

Parses an EPUB `File` (ZIP archive) into words and chapters without any third-party EPUB library.

```ts
parseEpub(file: File): Promise<ParsedEpub>
// ParsedEpub: { pdfDoc: null, words: WordToken[], chapters: Chapter[] }
```

**Parse flow:**
1. `META-INF/container.xml` → locate OPF file path
2. OPF manifest → build `id → zip-path` map; OPF spine → ordered list of content file IDs
3. For each spine item: parse XHTML with DOMParser, walk DOM to extract words AND record `element-id → absolute word index` in `idWordIndex` map (needed for fragment-based chapter links)
4. Chapter extraction: prefer EPUB 3 NAV (`nav[epub:type="toc"]`), fall back to EPUB 2 NCX. Uses flat `querySelectorAll('li')` / `querySelectorAll('navPoint')` with ancestor-counting for depth — more robust than recursive `:scope` selectors.
5. `hrefToWordIndex(href, base)`: resolves `path.xhtml#fragment-id` by looking up the fragment in `idWordIndex` first, then falling back to spine-item start. **This is critical for Project Gutenberg EPUBs** which put the entire book in one file with `#chapter-id` anchors.

`x/y/w/h` are all `0` for EPUB words — there is no page geometry. `pageNum` is the spine item index + 1.
