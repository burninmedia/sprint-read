import React from 'react'
import type { Chapter } from '../utils/pdfParser'

interface TocDrawerProps {
  chapters: Chapter[]
  currentWordIndex: number
  totalWords: number
  onSeek: (index: number) => void
  onClose: () => void
}

const TocDrawer: React.FC<TocDrawerProps> = ({
  chapters, currentWordIndex, totalWords, onSeek, onClose,
}) => {
  // Find the active chapter (last one whose wordIndex ≤ current)
  let activeIdx = 0
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].wordIndex <= currentWordIndex) activeIdx = i
  }

  const handleSeek = (wordIndex: number) => {
    onSeek(wordIndex)
    onClose()
  }

  return (
    <div className="toc-overlay">
      <div className="toc-drawer">
        <div className="toc-drawer__header">
          <span className="toc-drawer__title">Table of Contents</span>
          <button className="toc-drawer__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="toc-drawer__list">
          {chapters.length === 0 && (
            <div style={{ padding: '24px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No chapters found in this file.
            </div>
          )}
          {chapters.map((ch, i) => {
            const pct = totalWords > 0 ? Math.round((ch.wordIndex / totalWords) * 100) : 0
            return (
              <button
                key={i}
                className={`toc-item${i === activeIdx ? ' toc-item--active' : ''}`}
                style={{ '--depth': ch.level } as React.CSSProperties}
                onClick={() => handleSeek(ch.wordIndex)}
              >
                <span className="toc-item__title">{ch.title}</span>
                <span className="toc-item__pct">{pct}%</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TocDrawer
