import React from 'react'
import { splitWordAtOrp } from '../utils/orp'

interface WordDisplayProps {
  word: string
  wpm: number
  isEmpty?: boolean
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, wpm, isEmpty = false }) => {
  // No fade animation — at high WPM (900 wpm = 67ms/word) any transition
  // longer than a few ms causes words to disappear. Instant swap is correct.
  const { before, orp, after } = splitWordAtOrp(word)

  return (
    <div className="word-display">
      {/* Horizontal guide lines */}
      <div className="guide-line guide-line--top" />
      <div className="guide-line guide-line--bottom" />
      {/* Vertical center guide line */}
      <div className="guide-line guide-line--vertical" />

      {isEmpty ? (
        <div className="word-display__empty">
          Load a PDF or EPUB to start speed reading
        </div>
      ) : (
        <div className="orp-word">
          <span className="orp-before">{before}</span>
          <span className="orp-letter">{orp}</span>
          <span className="orp-after">{after}</span>
        </div>
      )}

      {/* Rolling 10s average WPM */}
      {!isEmpty && <div className="wpm-indicator">{Math.round(wpm)} wpm</div>}
    </div>
  )
}

export default WordDisplay
