import { useCallback, useEffect, useRef, useState } from 'react'
import Controls from './components/Controls'
import PDFUpload from './components/PDFUpload'
import TextPreview from './components/TextPreview'
import WordDisplay from './components/WordDisplay'
import { extractTextFromPdf, tokeniseWords } from './utils/pdfParser'
import { buildDelayTable } from './utils/speedRamp'

type PlayState = 'idle' | 'playing' | 'paused'

const DEFAULT_MIN_WPM = 200
const DEFAULT_MAX_WPM = 900

export default function App() {
  const [words, setWords] = useState<string[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [minWpm, setMinWpm] = useState(DEFAULT_MIN_WPM)
  const [maxWpm, setMaxWpm] = useState(DEFAULT_MAX_WPM)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentWpm, setCurrentWpm] = useState(DEFAULT_MIN_WPM)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordIndexRef = useRef(wordIndex)
  const wordsRef = useRef(words)
  const playStateRef = useRef(playState)
  const minWpmRef = useRef(minWpm)
  const maxWpmRef = useRef(maxWpm)

  // Keep refs in sync
  wordIndexRef.current = wordIndex
  wordsRef.current = words
  playStateRef.current = playState
  minWpmRef.current = minWpm
  maxWpmRef.current = maxWpm

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleNext = useCallback(
    (index: number, delayTable: number[]) => {
      if (index >= wordsRef.current.length) {
        setPlayState('idle')
        return
      }

      const delay = delayTable[index] ?? 250

      timerRef.current = setTimeout(() => {
        if (playStateRef.current !== 'playing') return

        setWordIndex(index)

        // Calculate approximate current WPM for display
        const wpm = Math.round(60000 / delay)
        setCurrentWpm(wpm)

        scheduleNext(index + 1, delayTable)
      }, delay)
    },
    [],
  )

  const startPlaying = useCallback(
    (fromIndex: number) => {
      stopTimer()
      // Always restart the ramp from minWpm at the current position so the
      // speed never starts above the configured minimum.
      const delayTable = buildDelayTable(
        wordsRef.current,
        minWpmRef.current,
        maxWpmRef.current,
        fromIndex,
      )
      setPlayState('playing')
      scheduleNext(fromIndex, delayTable)
    },
    [stopTimer, scheduleNext],
  )

  const handlePlay = useCallback(() => {
    if (wordsRef.current.length === 0) return
    const from = playStateRef.current === 'idle' ? 0 : wordIndexRef.current
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

  const handleFileSelected = useCallback(async (file: File) => {
    stopTimer()
    setPlayState('idle')
    setWordIndex(0)
    setIsLoading(true)
    setFileName(file.name)

    try {
      const text = await extractTextFromPdf(file)
      const extracted = tokeniseWords(text)
      setWords(extracted)
      setCurrentWpm(DEFAULT_MIN_WPM)
    } catch (err) {
      console.error('Failed to parse PDF:', err)
      alert('Failed to extract text from this PDF. Try a different file.')
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }, [stopTimer])

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer])

  const currentWord = words[wordIndex] ?? ''

  return (
    <div className="app">
      {/* ── Speed reader display (top 55%) ── */}
      <WordDisplay word={currentWord} wpm={currentWpm} isEmpty={words.length === 0} />

      {/* ── Bottom panel (bottom 45%) ── */}
      <div className="bottom-panel">
        {/* PDF upload */}
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
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onMinWpmChange={handleMinWpmChange}
          onMaxWpmChange={handleMaxWpmChange}
          onSeek={handleSeek}
        />

        {/* Text preview */}
        <TextPreview words={words} currentIndex={wordIndex} />
      </div>
    </div>
  )
}
