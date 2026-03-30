import React, { useRef, useState } from 'react'
import type { BookMeta } from '../utils/library'

interface LibraryDrawerProps {
  books: BookMeta[]
  currentBookId: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onAddBook: (file: File) => void
  onClose: () => void
}

const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  books, currentBookId, onOpen, onDelete, onAddBook, onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { onAddBook(file); onClose() }
    e.target.value = ''
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(id)
  }

  const confirmDeleteBook = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) { onDelete(confirmDelete); setConfirmDelete(null) }
  }

  return (
    <div className="toc-overlay">
      <div className="toc-drawer">
        <div className="toc-drawer__header">
          <span className="toc-drawer__title">My Library</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="library-add-btn" onClick={() => fileInputRef.current?.click()}
              title="Add book" aria-label="Add book">
              <PlusIcon />
              <span>Add Book</span>
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf,.epub"
              style={{ display: 'none' }} onChange={handleFileChange} />
            <button className="toc-drawer__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="toc-drawer__list">
          {books.length === 0 && (
            <div className="library-empty">
              <div className="library-empty__icon"><BookIcon /></div>
              <div className="library-empty__text">No books yet</div>
              <div className="library-empty__hint">Tap "Add Book" to load your first PDF or EPUB</div>
            </div>
          )}

          {books.map(book => {
            const isCurrent = book.id === currentBookId
            const isConfirming = confirmDelete === book.id
            const ago = formatAgo(book.lastOpened)

            return (
              <div
                key={book.id}
                className={`library-item${isCurrent ? ' library-item--active' : ''}`}
                onClick={() => { if (!isConfirming) { onOpen(book.id); onClose() } }}
              >
                <div className="library-item__icon">
                  {book.fileType === 'epub' ? <EpubIcon /> : <PdfIcon />}
                </div>

                <div className="library-item__body">
                  <div className="library-item__name">{book.name.replace(/\.(pdf|epub)$/i, '')}</div>
                  <div className="library-item__meta">
                    <span className="library-item__type">{book.fileType.toUpperCase()}</span>
                    <span>·</span>
                    <span>{book.wordCount.toLocaleString()} words</span>
                    <span>·</span>
                    <span>{ago}</span>
                  </div>
                  <div className="library-item__progress-bar">
                    <div className="library-item__progress-fill" style={{ width: `${book.pct}%` }} />
                  </div>
                  <div className="library-item__pct">{book.pct}% complete</div>
                </div>

                <div className="library-item__actions" onClick={e => e.stopPropagation()}>
                  {isConfirming ? (
                    <>
                      <button className="library-btn library-btn--danger" onClick={confirmDeleteBook}>
                        Delete
                      </button>
                      <button className="library-btn" onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="library-btn library-btn--icon"
                      onClick={(e) => handleDelete(book.id, e)} aria-label="Delete book">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
    <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
  </svg>
)
const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
)
const EpubIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="13" y2="13" />
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
    <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    <path d="M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default LibraryDrawer
