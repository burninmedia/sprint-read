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

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

// Only re-render when the line changes (every WORDS_PER_LINE words),
// not on every single word tick. The top word panel handles per-word display.
export default memo(TextPreview, (prev, next) => {
  if (prev.words !== next.words) return false
  const prevLine = Math.floor(prev.currentIndex / WORDS_PER_LINE)
  const nextLine = Math.floor(next.currentIndex / WORDS_PER_LINE)
  return prevLine === nextLine
})
