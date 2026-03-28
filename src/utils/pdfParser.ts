import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Use the worker bundled into /public so it works fully offline inside
// Capacitor's WebView (no CDN required on-device).
// Vite copies /public/** into /dist/** verbatim; Capacitor serves dist/ as root.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../../public/pdf.worker.min.mjs',
  import.meta.url,
).href

export interface WordToken {
  text: string
  pageNum: number // 1-based
  // position in PDF user-space coordinates (bottom-left origin)
  x: number
  y: number
  w: number
  h: number
}

export interface Chapter {
  title: string
  wordIndex: number
  level: number // 0 = top-level, 1 = sub-chapter, etc.
}

export interface ParsedPdf {
  pdfDoc: PDFDocumentProxy // keep alive for rendering
  words: WordToken[]
  chapters: Chapter[]
}

export async function parsePdf(file: File): Promise<ParsedPdf> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  const words: WordToken[] = []

  // Track first word index per page for chapter fallback
  const pageFirstWordIndex: Map<number, number> = new Map()

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    pageFirstWordIndex.set(pageNum, words.length)

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue

      // transform: [scaleX, skewX, skewY, scaleY, tx, ty]
      const tx = item.transform[4] as number
      const ty = item.transform[5] as number
      const itemWidth = (item as { width?: number }).width ?? 0
      const itemHeight = (item as { height?: number }).height ?? 0
      const str = item.str

      // Split item string into individual words and estimate x offset proportionally
      const rawTokens = str.split(/\s+/)
      let charOffset = 0

      for (const token of rawTokens) {
        if (!token) continue
        const wordX = tx + (charOffset / Math.max(str.length, 1)) * itemWidth
        words.push({
          text: token,
          pageNum,
          x: wordX,
          y: ty,
          w: (token.length / Math.max(str.length, 1)) * itemWidth,
          h: itemHeight,
        })
        // +1 for the space
        charOffset += token.length + 1
      }
    }
  }

  // --- Chapters ---
  const chapters: Chapter[] = []

  try {
    const outline = await pdf.getOutline()
    if (outline && outline.length > 0) {
      // Recursive traversal to capture nested outline items
      const processItems = async (
        items: typeof outline,
        level: number,
      ): Promise<void> => {
        for (const item of items) {
          if (item.dest || item.url) {
            try {
              let dest = item.dest
              if (typeof dest === 'string') {
                dest = await pdf.getDestination(dest)
              }
              if (dest && Array.isArray(dest) && dest.length > 0) {
                const ref = dest[0]
                const pageIndex = await pdf.getPageIndex(ref)
                const pageNum = pageIndex + 1
                const wordIndex = pageFirstWordIndex.get(pageNum) ?? 0
                chapters.push({ title: item.title ?? `Page ${pageNum}`, wordIndex, level })
              }
            } catch {
              // skip outline items that can't be resolved
            }
          }
          if (item.items && item.items.length > 0) {
            await processItems(item.items, level + 1)
          }
        }
      }
      await processItems(outline, 0)
    }
  } catch {
    // outline not available
  }

  // Fallback: text-based chapter detection if no outline chapters found
  if (chapters.length === 0) {
    for (let i = 0; i < words.length - 1; i++) {
      const w = words[i]
      if (/^chapter$/i.test(w.text)) {
        const next = words[i + 1]
        if (next && /^(\d+|[IVXLC]+|one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(next.text)) {
          chapters.push({ title: `${w.text} ${next.text}`, wordIndex: i, level: 0 })
        }
      }
    }
  }

  return { pdfDoc: pdf, words, chapters }
}
