import * as pdfjsLib from 'pdfjs-dist'

// Point the worker at the bundled worker script.
// Vite copies assets from node_modules when referenced via ?url or via explicit public dir.
// Using the unpkg CDN fallback avoids bundler complexity.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

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
