// Library — persists book files in IndexedDB, metadata in localStorage.
// IndexedDB handles large binary data (full PDF/EPUB files).

export interface BookMeta {
  id: string           // `${filename}_${filesize}` — stable across sessions
  name: string
  wordCount: number
  position: number     // last saved word index
  pct: number          // 0–100
  lastOpened: number   // Date.now()
  fileSize: number
  fileType: 'pdf' | 'epub'
}

const DB_NAME = 'sprintread-library'
const DB_VERSION = 1
const STORE = 'books'
const META_KEY = 'sprintread-library-meta'
const LAST_KEY = 'sprintread-last-book'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function getLibraryMeta(): BookMeta[] {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? '[]') }
  catch { return [] }
}

function setLibraryMeta(meta: BookMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function getLastOpenedId(): string | null {
  return localStorage.getItem(LAST_KEY)
}

export function makeBookId(file: File): string {
  return `${file.name}_${file.size}`
}

/** Save (or update) a book file in IndexedDB and upsert its metadata. */
export async function saveBook(file: File, wordCount: number): Promise<string> {
  const id = makeBookId(file)
  const data = await file.arrayBuffer()
  const db = await openDb()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id, data })
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  const meta = getLibraryMeta()
  const existing = meta.find(m => m.id === id)
  const entry: BookMeta = {
    id,
    name: file.name,
    wordCount,
    position: existing?.position ?? 0,
    pct: existing?.pct ?? 0,
    lastOpened: Date.now(),
    fileSize: file.size,
    fileType: file.name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf',
  }
  if (existing) {
    Object.assign(existing, entry)
  } else {
    meta.unshift(entry)
  }
  setLibraryMeta(meta)
  localStorage.setItem(LAST_KEY, id)
  return id
}

/** Load a book's binary data from IndexedDB. Returns null if not found. */
export async function loadBookData(id: string): Promise<{ data: ArrayBuffer; meta: BookMeta } | null> {
  const meta = getLibraryMeta().find(m => m.id === id)
  if (!meta) return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => {
      if (req.result) {
        localStorage.setItem(LAST_KEY, id)
        resolve({ data: req.result.data as ArrayBuffer, meta })
      } else {
        resolve(null)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

/** Update reading progress for a book. */
export function updateBookProgress(id: string, position: number, wordCount: number) {
  const meta = getLibraryMeta()
  const entry = meta.find(m => m.id === id)
  if (!entry) return
  entry.position = position
  entry.pct = wordCount > 0 ? Math.round((position / wordCount) * 100) : 0
  entry.lastOpened = Date.now()
  setLibraryMeta(meta)
}

/** Remove a book from IndexedDB and metadata. */
export async function deleteBook(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  const meta = getLibraryMeta().filter(m => m.id !== id)
  setLibraryMeta(meta)
  if (localStorage.getItem(LAST_KEY) === id) {
    localStorage.removeItem(LAST_KEY)
    if (meta.length > 0) localStorage.setItem(LAST_KEY, meta[0].id)
  }
}
