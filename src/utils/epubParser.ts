import JSZip from 'jszip'
import type { WordToken, Chapter } from './pdfParser'

// Re-export so callers can import from either parser
export type { WordToken, Chapter }

export interface ParsedEpub {
  pdfDoc: null
  words: WordToken[]
  chapters: Chapter[]
}

// ─── XML helpers ────────────────────────────────────────────────────────────

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

function parseHtml(text: string): Document {
  return new DOMParser().parseFromString(text, 'text/html')
}

function xmlAttr(el: Element | null, attr: string): string {
  return el?.getAttribute(attr) ?? ''
}

// Resolve a relative path against a base path (both are zip-relative)
function resolve(base: string, rel: string): string {
  if (rel.startsWith('/')) return rel.slice(1)
  const parts = base.split('/')
  parts.pop() // remove filename
  for (const seg of rel.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

// Strip #fragment from href
function stripFragment(href: string): string {
  return href.split('#')[0]
}

// Extract plain words from an HTML document, preserving reading order
function extractWords(doc: Document, spineIndex: number, wordOffset: number): WordToken[] {
  // Remove non-content elements
  for (const el of Array.from(doc.querySelectorAll('script,style,nav'))) {
    el.remove()
  }
  const bodyText = doc.body?.textContent ?? doc.documentElement.textContent ?? ''
  const tokens = bodyText.split(/\s+/).filter(t => t.length > 0)
  return tokens.map((text, i) => ({
    text,
    pageNum: spineIndex + 1,
    x: 0,
    y: i + wordOffset,
    w: 0,
    h: 0,
  }))
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function parseEpub(file: File): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  // 1. Find OPF path via META-INF/container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) throw new Error('Not a valid EPUB: missing META-INF/container.xml')
  const container = parseXml(containerXml)
  const opfPath = xmlAttr(container.querySelector('rootfile'), 'full-path')
  if (!opfPath) throw new Error('Not a valid EPUB: container.xml missing rootfile path')

  // 2. Parse OPF
  const opfXml = await zip.file(opfPath)?.async('text')
  if (!opfXml) throw new Error(`EPUB OPF not found at ${opfPath}`)
  const opf = parseXml(opfXml)

  // Build manifest: id → href (zip-relative)
  const manifest: Record<string, string> = {}
  const mediaTypes: Record<string, string> = {}
  for (const item of Array.from(opf.querySelectorAll('manifest item'))) {
    const id = xmlAttr(item, 'id')
    const href = resolve(opfPath, xmlAttr(item, 'href'))
    manifest[id] = href
    mediaTypes[id] = xmlAttr(item, 'media-type')
  }

  // Ordered spine ids
  const spineIds = Array.from(opf.querySelectorAll('spine itemref'))
    .map(el => xmlAttr(el, 'idref'))
    .filter(id => id && manifest[id])

  // 3. Extract text from each spine item
  const words: WordToken[] = []
  const spineWordStart: number[] = [] // word index at start of each spine item

  for (let si = 0; si < spineIds.length; si++) {
    const href = manifest[spineIds[si]]
    spineWordStart.push(words.length)
    const raw = await zip.file(href)?.async('text')
    if (!raw) continue
    const doc = parseHtml(raw)
    const chunk = extractWords(doc, si, words.length)
    words.push(...chunk)
  }

  // 4. Build chapters from TOC
  const chapters: Chapter[] = []

  // Try NCX first (EPUB 2)
  const ncxId = xmlAttr(opf.querySelector('spine'), 'toc')
  const ncxPath = ncxId ? manifest[ncxId] : null

  // Also look for EPUB 3 nav document
  const navId = Array.from(opf.querySelectorAll('manifest item')).find(
    el => xmlAttr(el, 'properties').includes('nav'),
  )
  const navPath = navId ? resolve(opfPath, xmlAttr(navId, 'href')) : null

  if (navPath && zip.file(navPath)) {
    // EPUB 3 NAV
    const navHtml = await zip.file(navPath)!.async('text')
    const navDoc = parseHtml(navHtml)
    const toc = navDoc.querySelector('nav[epub\\:type="toc"], nav[role="doc-toc"], nav')
    if (toc) {
      processNavItems(toc.querySelectorAll(':scope > ol > li'), navPath, 0)
    }
  } else if (ncxPath && zip.file(ncxPath)) {
    // EPUB 2 NCX
    const ncxXml = await zip.file(ncxPath)!.async('text')
    const ncx = parseXml(ncxXml)
    processNcxPoints(ncx.querySelectorAll('navMap > navPoint'), ncxPath, 0)
  }

  // Fallback: one chapter per spine item using OPF dc:title or item id
  if (chapters.length === 0) {
    for (let si = 0; si < spineIds.length; si++) {
      if (spineWordStart[si] === undefined) continue
      const id = spineIds[si]
      chapters.push({ title: id.replace(/[-_]/g, ' '), wordIndex: spineWordStart[si], level: 0 })
    }
  }

  return { pdfDoc: null, words, chapters }

  // ── helpers that close over local data ────────────────────────────────────

  function hrefToWordIndex(rawHref: string, basePath: string): number {
    const path = resolve(basePath, stripFragment(rawHref))
    // Find which spine item uses this path
    for (let si = 0; si < spineIds.length; si++) {
      if (manifest[spineIds[si]] === path) {
        return spineWordStart[si] ?? 0
      }
    }
    return 0
  }

  function processNavItems(items: NodeListOf<Element>, basePath: string, level: number) {
    for (const li of Array.from(items)) {
      const a = li.querySelector(':scope > a, :scope > span > a')
      if (a) {
        const href = xmlAttr(a as Element, 'href')
        const title = a.textContent?.trim() ?? ''
        if (href && title) {
          chapters.push({ title, wordIndex: hrefToWordIndex(href, basePath), level })
        }
      }
      const sub = li.querySelector(':scope > ol')
      if (sub) processNavItems(sub.querySelectorAll(':scope > li'), basePath, level + 1)
    }
  }

  function processNcxPoints(points: NodeListOf<Element>, basePath: string, level: number) {
    for (const pt of Array.from(points)) {
      const title = pt.querySelector('navLabel text')?.textContent?.trim() ?? ''
      const src = xmlAttr(pt.querySelector('content'), 'src')
      if (title && src) {
        chapters.push({ title, wordIndex: hrefToWordIndex(src, basePath), level })
      }
      const sub = pt.querySelectorAll(':scope > navPoint')
      if (sub.length) processNcxPoints(sub, basePath, level + 1)
    }
  }
}
