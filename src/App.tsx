import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Controls from './components/Controls'
import PDFUpload from './components/PDFUpload'
import PDFPageView from './components/PDFPageView'
import WordDisplay from './components/WordDisplay'
import { parsePdf } from './utils/pdfParser'
import type { Chapter, WordToken } from './utils/pdfParser'
import { buildDelayTable } from './utils/speedRamp'

type PlayState = 'idle' | 'playing' | 'paused'

const DEFAULT_MIN_WPM = 200
const DEFAULT_MAX_WPM = 900

export default function App() {
  const [words, setWords] = useState<WordToken[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [minWpm, setMinWpm] = useState(DEFAULT_MIN_WPM)
  const [maxWpm, setMaxWpm] = useState(DEFAULT_MAX_WPM)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentWpm, setCurrentWpm] = useState(DEFAULT_MIN_WPM)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordIndexRef = useRef(wordIndex)
  const wordsRef = useRef(words)
  const playStateRef = useRef(playState)
  const minWpmRef = useRef(minWpm)
  const maxWpmRef = useRef(maxWpm)
  const fileNameRef = useRef(fileName)

  // Keep refs in sync
  wordIndexRef.current = wordIndex
  wordsRef.current = words
  playStateRef.current = playState
  minWpmRef.current = minWpm
  maxWpmRef.current = maxWpm
  fileNameRef.current = fileName

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // BUG 1 FIX: drift-corrected scheduler
  const scheduleNext = useCallback(
    (index: number, delayTable: number[], expectedTime: number) => {
      if (index >= wordsRef.current.length) {
        setPlayState('idle')
        return
      }

      const delay = delayTable[index] ?? 250
      const now = performance.now()
      const drift = Math.max(0, now - expectedTime)
      const adjustedDelay = Math.max(8, delay - drift)

      timerRef.current = setTimeout(() => {
        if (playStateRef.current !== 'playing') return

        setWordIndex(index)
        setCurrentWpm(Math.round(60000 / delay))

        // Save position to localStorage
        localStorage.setItem(
          `sprintread-pos:${fileNameRef.current ?? ''}`,
          String(index),
        )

        scheduleNext(index + 1, delayTable, expectedTime + delay)
      }, adjustedDelay)
    },
    [],
  )

  const startPlaying = useCallback(
    (fromIndex: number) => {
      stopTimer()
      // Always restart the ramp from minWpm at the current position so the
      // speed never starts above the configured minimum.
      const wordTexts = wordsRef.current.map((w) => w.text)
      const delayTable = buildDelayTable(
        wordTexts,
        minWpmRef.current,
        maxWpmRef.current,
        fromIndex,
      )
      setPlayState('playing')
      scheduleNext(fromIndex, delayTable, performance.now())
    },
    [stopTimer, scheduleNext],
  )

  // BUG 2 FIX: always resume from current position
  const handlePlay = useCallback(() => {
    if (wordsRef.current.length === 0) return
    const from = wordIndexRef.current
    startPlaying(from)
  }, [startPlaying])

  const handlePause = useCallback(() => {
    stopTimer()
    setPlayState('paused')
  }, [stopTimer])

  const handleStop = useCallback(() => {
    stopTimer()
    setPlayState('idle')
    setWordIndex(0)
    wordIndexRef.current = 0
    setCurrentWpm(minWpmRef.current)
  }, [stopTimer])

  const handleSeek = useCallback(
    (index: number) => {
      stopTimer()
      setWordIndex(index)
      wordIndexRef.current = index
      if (playStateRef.current === 'playing') {
        startPlaying(index)
      }
    },
    [stopTimer, startPlaying],
  )

  // Restart when speed changes while playing
  const handleMinWpmChange = useCallback(
    (v: number) => {
      setMinWpm(v)
      minWpmRef.current = v
      if (playStateRef.current === 'playing') {
        startPlaying(wordIndexRef.current)
      }
    },
    [startPlaying],
  )

  const handleMaxWpmChange = useCallback(
    (v: number) => {
      setMaxWpm(v)
      maxWpmRef.current = v
      if (playStateRef.current === 'playing') {
        startPlaying(wordIndexRef.current)
      }
    },
    [startPlaying],
  )

  // BUG 3 FIX: restore saved position from localStorage
  const handleFileSelected = useCallback(
    async (file: File) => {
      stopTimer()
      setPlayState('idle')
      setWordIndex(0)
      wordIndexRef.current = 0
      setIsLoading(true)
      setFileName(file.name)
      fileNameRef.current = file.name

      try {
        const parsed = await parsePdf(file)
        setWords(parsed.words)
        wordsRef.current = parsed.words
        setPdfDoc(parsed.pdfDoc)
        setChapters(parsed.chapters)
        setCurrentWpm(DEFAULT_MIN_WPM)

        // Restore saved position
        const savedKey = `sprintread-pos:${file.name}`
        const saved = Number(localStorage.getItem(savedKey) ?? 0)
        const startIndex = Math.min(saved, parsed.words.length - 1)
        setWordIndex(startIndex)
        wordIndexRef.current = startIndex
      } catch (err) {
        console.error('Failed to parse PDF:', err)
        alert('Failed to extract text from this PDF. Try a different file.')
        setFileName(null)
        fileNameRef.current = null
      } finally {
        setIsLoading(false)
      }
    },
    [stopTimer],
  )

  // Chapter navigation
  const handlePrevChapter = useCallback(() => {
    if (chapters.length === 0) return
    const current = wordIndexRef.current
    // Find the last chapter whose wordIndex is strictly before current
    let target = 0
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (chapters[i].wordIndex < current) {
        target = chapters[i].wordIndex
        break
      }
    }
    handleSeek(target)
  }, [chapters, handleSeek])

  const handleNextChapter = useCallback(() => {
    if (chapters.length === 0) return
    const current = wordIndexRef.current
    // Find the first chapter whose wordIndex is strictly after current
    for (const ch of chapters) {
      if (ch.wordIndex > current) {
        handleSeek(ch.wordIndex)
        return
      }
    }
  }, [chapters, handleSeek])

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer])

  const currentWord = words[wordIndex]?.text ?? ''

  return (
    <div className="app">
      {/* ── Top 1/3: Word reader ── */}
      <WordDisplay word={currentWord} wpm={currentWpm} isEmpty={words.length === 0} />

      {/* ── Middle 1/3: PDF page canvas preview ── */}
      <PDFPageView pdfDoc={pdfDoc} words={words} currentWordIndex={wordIndex} />

      {/* ── Bottom 1/3: Controls panel ── */}
      <div className="bottom-panel">
        {/* PDF upload (compact, inline in controls area) */}
        <PDFUpload
          onFileSelected={handleFileSelected}
          isLoading={isLoading}
          fileName={fileName}
        />

        {/* Playback controls */}
        <Controls
          isPlaying={playState === 'playing'}
          hasText={words.length > 0}
          wordIndex={wordIndex}
          totalWords={words.length}
          minWpm={minWpm}
          maxWpm={maxWpm}
          chapters={chapters}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onMinWpmChange={handleMinWpmChange}
          onMaxWpmChange={handleMaxWpmChange}
          onSeek={handleSeek}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
        />
      </div>
    </div>
  )
}
