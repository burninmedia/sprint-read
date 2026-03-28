import React, { useEffect, useRef, memo } from 'react'

interface TextPreviewProps {
  words: string[]
  currentIndex: number
}

// Words rendered before and after the current position.
// Small enough to keep DOM tiny; large enough to feel like context.
const BEFORE = 60
const AFTER = 120
const WORDS_PER_LINE = 12

const TextPreview: React.FC<TextPreviewProps> = memo(({ words, currentIndex }) => {
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
})

TextPreview.displayName = 'TextPreview'

export default TextPreview
