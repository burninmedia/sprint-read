import React, { useEffect, useRef, memo } from 'react'

interface TextPreviewProps {
  words: string[]
  currentIndex: number
}

const BEFORE = 60
const AFTER = 120
const WORDS_PER_LINE = 12

const TextPreview: React.FC<TextPreviewProps> = ({ words, currentIndex }) => {
  const activeRef = useRef<HTMLSpanElement>(null)
  const lastScrollLineRef = useRef(-1)

  // Scroll only when the line changes, not every word
  useEffect(() => {
    const line = Math.floor(currentIndex / WORDS_PER_LINE)
    if (line !== lastScrollLineRef.current) {
      activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      lastScrollLineRef.current = line
    }
  }, [currentIndex])

  if (words.length === 0) {
    return (
      <div className="text-preview text-preview--empty">
        <span>Text preview will appear here after loading a file</span>
      </div>
    )
  }

  const start = Math.max(0, currentIndex - BEFORE)
  const end = Math.min(words.length, currentIndex + AFTER)
  const slice = words.slice(start, end)

  return (
    <div className="text-preview">
      <div className="text-preview__content">
        {slice.map((word, si) => {
          const i = start + si
          const isActive = i === currentIndex
          const isPast = i < currentIndex
          return (
            <React.Fragment key={i}>
              <span
                ref={isActive ? activeRef : undefined}
                className={`text-preview__word${isActive ? ' text-preview__word--active' : ''}${isPast ? ' text-preview__word--past' : ''}`}
              >
                {word}
              </span>
              {(i + 1) % WORDS_PER_LINE === 0 && <br />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// Only skip re-renders when words array reference changes (new document loaded).
// Per-word re-renders are fine — the window is only 180 spans.
export default memo(TextPreview, (prev, next) => prev.words === next.words && prev.currentIndex === next.currentIndex)
