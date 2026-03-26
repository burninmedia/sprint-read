import React, { useEffect, useRef } from 'react'

interface TextPreviewProps {
  words: string[]
  currentIndex: number
}

const WORDS_PER_LINE = 12
const CONTEXT_LINES = 3

const TextPreview: React.FC<TextPreviewProps> = ({ words, currentIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLSpanElement>(null)

  // Auto-scroll to keep current word visible
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentIndex])

  if (words.length === 0) {
    return (
      <div className="text-preview text-preview--empty">
        <span>Text preview will appear here after loading a PDF</span>
      </div>
    )
  }

  return (
    <div className="text-preview" ref={containerRef}>
      <div className="text-preview__content">
        {words.map((word, i) => {
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
              {/* Add line break hint every N words for readability */}
              {(i + 1) % WORDS_PER_LINE === 0 && <br />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export { CONTEXT_LINES }
export default TextPreview
