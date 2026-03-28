import * as pdfjsLib from 'pdfjs-dist'

// Use the worker bundled into /public so it works fully offline inside
// Capacitor's WebView (no CDN required on-device).
// Vite copies /public/** into /dist/** verbatim; Capacitor serves dist/ as root.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '../../public/pdf.worker.min.mjs',
  import.meta.url,
).href

/**
 * Extract all text from a PDF File/Blob.
 * Returns the full text as a single string with pages separated by newlines.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  const pageTexts: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Join text items, preserving rough line structure
    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) return item.str
        return ''
      })
      .join(' ')

    pageTexts.push(pageText)
  }

  return pageTexts.join('\n\n')
}

/**
 * Tokenise extracted PDF text into an array of displayable words.
 * Strips empty tokens and normalises whitespace.
 */
export function tokeniseWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
}
