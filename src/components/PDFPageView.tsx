import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { WordToken } from '../utils/pdfParser'

interface PDFPageViewProps {
  pdfDoc: PDFDocumentProxy | null
  words: WordToken[]
  currentWordIndex: number
  onSeek?: (index: number) => void
}

const PDFPageView: React.FC<PDFPageViewProps> = ({ pdfDoc, words, currentWordIndex, onSeek }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const [highlight, setHighlight] = useState<{
    left: number; top: number; width: number; height: number
  } | null>(null)

  const currentPageRef = useRef<number>(0)
  // Cache render scale + natural page height so click handler can invert coords
  const renderScaleRef = useRef<number>(1)
  const pageNaturalHeightRef = useRef<number>(0)

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return

      // Cancel any in-progress render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }

      const page = await pdfDoc.getPage(pageNum)
      const containerWidth = containerRef.current.clientWidth || 300

      const naturalViewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / naturalViewport.width
      const viewport = page.getViewport({ scale })
      renderScaleRef.current = scale
      pageNaturalHeightRef.current = naturalViewport.height

      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const renderContext = {
        canvasContext: ctx,
        viewport,
      }

      const task = page.render(renderContext)
      renderTaskRef.current = task

      try {
        await task.promise
        renderTaskRef.current = null
      } catch (err: unknown) {
        // 'cancelled' is expected when we cancel mid-render
        if (
          err instanceof Error &&
          err.message !== 'Rendering cancelled, page 1 is still loading'
        ) {
          // ignore render cancellations silently
        }
      }
    },
    [pdfDoc],
  )

  const updateHighlight = useCallback(
    (word: WordToken) => {
      if (!canvasRef.current || !containerRef.current || !pdfDoc) return

      const containerWidth = containerRef.current.clientWidth || 300

      pdfDoc.getPage(word.pageNum).then((page) => {
        const naturalViewport = page.getViewport({ scale: 1 })
        const scale = containerWidth / naturalViewport.width
        const viewport = page.getViewport({ scale })

        // Convert PDF user-space (bottom-left origin) to canvas coords (top-left origin)
        const [canvasX, canvasY] = viewport.convertToViewportPoint(word.x, word.y)
        const wordWidthPx = word.w * scale
        const wordHeightPx = word.h * scale

        setHighlight({
          left: canvasX,
          // canvasY is top of the character baseline area; shift up by height
          top: canvasY - wordHeightPx,
          width: Math.max(wordWidthPx, 6),
          height: Math.max(wordHeightPx, 10),
        })

        // Auto-scroll so the highlight stays vertically centred in the container
        if (containerRef.current) {
          const containerHeight = containerRef.current.clientHeight
          const scrollTarget = canvasY - wordHeightPx - containerHeight / 2
          containerRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' })
        }
      })
    },
    [pdfDoc],
  )

  useEffect(() => {
    if (!pdfDoc || words.length === 0) return

    const word = words[currentWordIndex]
    if (!word) return

    const pageNum = word.pageNum

    if (pageNum !== currentPageRef.current) {
      currentPageRef.current = pageNum
      renderPage(pageNum).then(() => {
        updateHighlight(word)
      })
    } else {
      updateHighlight(word)
    }
  }, [currentWordIndex, pdfDoc, words, renderPage, updateHighlight])

  // Render first page when doc loads
  useEffect(() => {
    if (!pdfDoc) {
      currentPageRef.current = 0
      setHighlight(null)
      return
    }
    currentPageRef.current = 1
    renderPage(1)
  }, [pdfDoc, renderPage])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || words.length === 0) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      const scale = renderScaleRef.current
      const pageNaturalH = pageNaturalHeightRef.current
      if (scale === 0 || pageNaturalH === 0) return

      // Convert canvas px → PDF user-space (bottom-left origin)
      const pdfX = clickX / scale
      const pdfY = pageNaturalH - clickY / scale

      const pageNum = currentPageRef.current
      const pageWords = words
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w.pageNum === pageNum)

      if (pageWords.length === 0) return

      // First try: exact hit within word bounding box
      const exact = pageWords.find(({ w }) =>
        pdfX >= w.x && pdfX <= w.x + w.w &&
        pdfY >= w.y && pdfY <= w.y + w.h,
      )
      if (exact) { onSeek(exact.i); return }

      // Fallback: nearest word by centre-point distance
      let best = pageWords[0]
      let bestDist = Infinity
      for (const item of pageWords) {
        const cx = item.w.x + item.w.w / 2
        const cy = item.w.y + item.w.h / 2
        const d = Math.hypot(pdfX - cx, pdfY - cy)
        if (d < bestDist) { bestDist = d; best = item }
      }
      onSeek(best.i)
    },
    [onSeek, words],
  )

  return (
    <div className="pdf-page-view" ref={containerRef}>
      {!pdfDoc ? (
        <div className="pdf-page-view__empty">PDF preview will appear here</div>
      ) : (
        <div style={{ position: 'relative', display: 'inline-block', cursor: onSeek ? 'crosshair' : 'default' }}
          onClick={handleCanvasClick}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          {highlight && (
            <div
              style={{
                position: 'absolute',
                left: highlight.left,
                top: highlight.top,
                width: highlight.width,
                height: highlight.height,
                background: 'rgba(231,76,60,0.35)',
                border: '1px solid #e74c3c',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default PDFPageView
