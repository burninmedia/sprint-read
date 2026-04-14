import React from 'react'
import { splitWordAtOrp } from '../utils/orp'

interface WordDisplayProps {
  word: string
  wpm: number
  isEmpty?: boolean
  isQuoted?: boolean
  onPageBack?: () => void
  onPageForward?: () => void
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, wpm, isEmpty = false, isQuoted = false, onPageBack, onPageForward }) => {
  const { before, orp, after } = splitWordAtOrp(word)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width / 2) onPageBack?.()
    else onPageForward?.()
  }

  return (
    <div className={`word-display${isQuoted ? ' word-display--quoted' : ''}`} onClick={handleClick}
      style={{ cursor: (onPageBack || onPageForward) ? 'pointer' : undefined }}>
      {/* Horizontal guide lines */}
      <div className="guide-line guide-line--top" />
      <div className="guide-line guide-line--bottom" />
      {/* Vertical center guide line */}
      <div className="guide-line guide-line--vertical" />

      {/* Page-tap hint arrows — only when content is loaded */}
      {!isEmpty && onPageBack  && <div className="page-tap page-tap--left">‹</div>}
      {!isEmpty && onPageForward && <div className="page-tap page-tap--right">›</div>}

      {/* Faint quote mark when inside quoted text (Extension #2) */}
      {!isEmpty && isQuoted && <div className="quote-indicator">"</div>}

      {isEmpty ? (
        <div className="word-display__empty">
          Load a PDF or EPUB to start speed reading
        </div>
      ) : (
        <div className="orp-word">
          <span className="orp-before">{before}</span>
          <span className={`orp-letter${isQuoted ? ' orp-letter--quoted' : ''}`}>{orp}</span>
          <span className="orp-after">{after}</span>
        </div>
      )}

      {!isEmpty && <div className="wpm-indicator">{Math.round(wpm)} wpm</div>}
    </div>
  )
}

export default WordDisplay
