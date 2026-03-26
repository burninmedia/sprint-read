import React, { useEffect, useState } from 'react'
import { splitWordAtOrp } from '../utils/orp'

interface WordDisplayProps {
  word: string
  wpm: number
  isEmpty?: boolean
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, wpm, isEmpty = false }) => {
  const [visible, setVisible] = useState(true)
  const [displayWord, setDisplayWord] = useState(word)

  // Fade out → update word → fade in on word change
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => {
      setDisplayWord(word)
      setVisible(true)
    }, 60) // fade-out duration
    return () => clearTimeout(t)
  }, [word])

  const { before, orp, after } = splitWordAtOrp(displayWord)

  return (
    <div className="word-display">
      {/* Horizontal guide lines */}
      <div className="guide-line guide-line--top" />
      <div className="guide-line guide-line--bottom" />
      {/* Vertical center guide line */}
      <div className="guide-line guide-line--vertical" />

      {isEmpty ? (
        <div className="word-display__empty">
          Load a PDF below to start speed reading
        </div>
      ) : (
        /* ORP word container */
        <div className={`orp-word${visible ? ' orp-word--visible' : ''}`}>
          <span className="orp-before">{before}</span>
          <span className="orp-letter">{orp}</span>
          <span className="orp-after">{after}</span>
        </div>
      )}

      {/* WPM indicator */}
      {!isEmpty && <div className="wpm-indicator">{Math.round(wpm)} wpm</div>}
    </div>
  )
}

export default WordDisplay
