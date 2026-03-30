import React, { forwardRef, useImperativeHandle, useRef, memo } from 'react'

interface TextPreviewProps {
  words: string[]
  currentIndex: number
  onSeek?: (index: number) => void
}

export interface TextPreviewHandle {
  /** Update the active-word highlight directly in the DOM — no React re-render. */
  updateHighlight: (index: number) => void
}

const BEFORE = 60
const AFTER = 120
export const WORDS_PER_LINE = 12

const TextPreviewInner = forwardRef<TextPreviewHandle, TextPreviewProps>(
  ({ words, currentIndex, onSeek }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const lastActiveRef = useRef(-1)
    const lastScrollLineRef = useRef(-1)

    useImperativeHandle(ref, () => ({
      updateHighlight(index: number) {
        const c = containerRef.current
        if (!c) return

        // O(1) class swap — no DOM query loop
        if (lastActiveRef.current >= 0) {
          const old = c.querySelector<HTMLSpanElement>(`[data-wi="${lastActiveRef.current}"]`)
          if (old) {
            old.classList.remove('text-preview__word--active')
            old.classList.add('text-preview__word--past')
          }
        }
        const el = c.querySelector<HTMLSpanElement>(`[data-wi="${index}"]`)
        if (el) {
          el.classList.remove('text-preview__word--past')
          el.classList.add('text-preview__word--active')
        }
        lastActiveRef.current = index

        // Scroll only when the line changes
        const line = Math.floor(index / WORDS_PER_LINE)
        if (line !== lastScrollLineRef.current) {
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          lastScrollLineRef.current = line
        }
      },
    }))

    if (words.length === 0) {
      return (
        <div className="text-preview text-preview--empty">
          <span>Text preview will appear here after loading a file</span>
        </div>
      )
    }

    const start = Math.max(0, currentIndex - BEFORE)
    const end = Math.min(words.length, currentIndex + AFTER)

    const handleClick = (e: React.MouseEvent) => {
      if (!onSeek) return
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-wi]')
      if (el?.dataset.wi !== undefined) onSeek(Number(el.dataset.wi))
    }

    return (
      <div className="text-preview" ref={containerRef}
        onClick={handleClick}
        style={{ cursor: onSeek ? 'pointer' : undefined }}>
        <div className="text-preview__content">
          {words.slice(start, end).map((word, si) => {
            const i = start + si
            const isActive = i === currentIndex
            const isPast = i < currentIndex
            return (
              <React.Fragment key={i}>
                <span
                  data-wi={i}
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
  },
)

TextPreviewInner.displayName = 'TextPreview'

// Re-render only when the window needs to shift (new line) or new document loaded.
// Per-word highlight is handled imperatively via updateHighlight().
export default memo(TextPreviewInner, (prev, next) => {
  if (prev.words !== next.words) return false
  return (
    Math.floor(prev.currentIndex / WORDS_PER_LINE) ===
    Math.floor(next.currentIndex / WORDS_PER_LINE)
  )
})
