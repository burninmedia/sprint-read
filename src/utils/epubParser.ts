import JSZip from 'jszip'
import type { WordToken, Chapter } from './pdfParser'

export type { WordToken, Chapter }

export interface ParsedEpub {
  pdfDoc: null
  words: WordToken[]
  chapters: Chapter[]
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

function parseHtml(text: string): Document {
  return new DOMParser().parseFromString(text, 'text/html')
}

function xmlAttr(el: Element | null, attr: string): string {
  return el?.getAttribute(attr) ?? ''
}

function resolve(base: string, rel: string): string {
  if (!rel) return base
  if (rel.startsWith('/')) return rel.slice(1)
  const parts = base.split('/')
  parts.pop()
  for (const seg of rel.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

function splitHref(href: string): { path: string; fragment: string } {
  const idx = href.indexOf('#')
  return idx === -1
    ? { path: href, fragment: '' }
    : { path: href.slice(0, idx), fragment: href.slice(idx + 1) }
}

export async function parseEpub(file: File): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  // 1. Locate OPF via META-INF/container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) throw new Error('Not a valid EPUB: missing META-INF/container.xml')
  const container = parseXml(containerXml)
  const opfPath = xmlAttr(container.querySelector('rootfile'), 'full-path')
  if (!opfPath) throw new Error('EPUB container.xml missing rootfile path')

  // 2. Parse OPF manifest + spine
  const opfXml = await zip.file(opfPath)?.async('text')
  if (!opfXml) throw new Error(`EPUB OPF not found at ${opfPath}`)
  const opf = parseXml(opfXml)

  const manifest: Record<string, string> = {}
  for (const item of Array.from(opf.querySelectorAll('manifest item'))) {
    const id = xmlAttr(item, 'id')
    const href = resolve(opfPath, xmlAttr(item, 'href'))
    if (id) manifest[id] = href
  }

  const spineIds = Array.from(opf.querySelectorAll('spine itemref'))
    .map(el => xmlAttr(el, 'idref'))
    .filter(id => id && manifest[id])

  // 3. Extract words; track element-id → absolute word index for fragment lookup
  const words: WordToken[] = []
  const spineWordStart: number[] = []
  // "spine-path#fragment-id" → absolute word index
  const idWordIndex = new Map<string, number>()

  for (let si = 0; si < spineIds.length; si++) {
    const href = manifest[spineIds[si]]
    spineWordStart.push(words.length)
    const raw = await zip.file(href)?.async('text')
    if (!raw) continue
    const doc = parseHtml(raw)

    // Remove non-content nodes
    for (const el of Array.from(doc.querySelectorAll('script,style,nav'))) el.remove()

    // Walk DOM in order: record id anchors, collect text tokens
    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const id = el.getAttribute('id') || el.getAttribute('name')
        if (id) {
          // Map both "path" and "path#id" for this element's position
          idWordIndex.set(`${href}#${id}`, words.length)
        }
        for (const child of Array.from(node.childNodes)) walk(child)
      } else if (node.nodeType === Node.TEXT_NODE) {
        const tokens = (node.textContent ?? '').split(/\s+/).filter(t => t.length > 0)
        for (const text of tokens) {
          words.push({ text, pageNum: si + 1, x: 0, y: words.length, w: 0, h: 0 })
        }
      }
    }
    walk(doc.body ?? doc.documentElement)
  }

  // Helper: href (relative to basePath) → absolute word index
  function hrefToWordIndex(rawHref: string, basePath: string): number {
    const { path: relPath, fragment } = splitHref(rawHref)
    const absPath = relPath ? resolve(basePath, relPath) : basePath

    // Try fragment lookup first (handles single-file books like PG EPUBs)
    if (fragment) {
      const key = `${absPath}#${fragment}`
      if (idWordIndex.has(key)) return idWordIndex.get(key)!
    }

    // Fall back to spine item start
    for (let si = 0; si < spineIds.length; si++) {
      if (manifest[spineIds[si]] === absPath) return spineWordStart[si] ?? 0
    }
    return 0
  }

  // 4. Build chapter list from EPUB 3 NAV or EPUB 2 NCX
  const chapters: Chapter[] = []

  const navId = Array.from(opf.querySelectorAll('manifest item')).find(
    el => xmlAttr(el, 'properties').includes('nav'),
  )
  const navPath = navId ? resolve(opfPath, xmlAttr(navId, 'href')) : null
  const ncxId = xmlAttr(opf.querySelector('spine'), 'toc')
  const ncxPath = ncxId ? manifest[ncxId] : null

  if (navPath && zip.file(navPath)) {
    const navHtml = await zip.file(navPath)!.async('text')
    const navDoc = parseHtml(navHtml)
    const toc =
      navDoc.querySelector('nav[epub\\:type="toc"]') ??
      navDoc.querySelector('nav[role="doc-toc"]') ??
      navDoc.querySelector('nav')
    if (toc) {
      for (const li of Array.from(toc.querySelectorAll('li'))) {
        const a = li.querySelector('a')
        if (!a) continue
        const href = a.getAttribute('href') ?? ''
        const title = a.textContent?.trim() ?? ''
        if (!href || !title) continue
        let depth = 0
        let el: Element | null = li.parentElement
        while (el && el !== toc) {
          if (el.tagName === 'OL') depth++
          el = el.parentElement
        }
        chapters.push({
          title,
          wordIndex: hrefToWordIndex(href, navPath),
          level: Math.max(0, depth - 1),
        })
      }
    }
  } else if (ncxPath && zip.file(ncxPath)) {
    const ncxXml = await zip.file(ncxPath)!.async('text')
    const ncx = parseXml(ncxXml)
    for (const pt of Array.from(ncx.querySelectorAll('navPoint'))) {
      const title = pt.querySelector('navLabel text')?.textContent?.trim() ?? ''
      const src = xmlAttr(pt.querySelector('content'), 'src')
      if (!title || !src) continue
      let depth = 0
      let el: Element | null = pt.parentElement
      while (el) {
        if (el.nodeName === 'navPoint') depth++
        el = el.parentElement
      }
      chapters.push({ title, wordIndex: hrefToWordIndex(src, ncxPath), level: depth })
    }
  }

  // Fallback: one entry per spine item
  if (chapters.length === 0) {
    for (let si = 0; si < spineIds.length; si++) {
      if (spineWordStart[si] === undefined) continue
      const id = spineIds[si]
      chapters.push({ title: id.replace(/[-_]/g, ' '), wordIndex: spineWordStart[si], level: 0 })
    }
  }

  return { pdfDoc: null, words, chapters }
}
