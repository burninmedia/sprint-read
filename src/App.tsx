import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Controls from './components/Controls'
import LibraryDrawer from './components/LibraryDrawer'
import PDFPageView from './components/PDFPageView'
import TextPreview from './components/TextPreview'
import type { TextPreviewHandle } from './components/TextPreview'
import TocDrawer from './components/TocDrawer'
import ResumeDialog from './components/ResumeDialog'
import WordDisplay from './components/WordDisplay'
import { parsePdf } from './utils/pdfParser'
import { parseEpub } from './utils/epubParser'
import type { Chapter, WordToken } from './utils/pdfParser'
import { buildDelayTable } from './utils/speedRamp'
import {
  saveBook, loadBookData, deleteBook, getLibraryMeta,
  getLastOpenedId, updateBookProgress,
} from './utils/library'
import type { BookMeta } from './utils/library'

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
  const [showToc, setShowToc] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [library, setLibrary] = useState<BookMeta[]>(() => getLibraryMeta())
  const [currentBookId, setCurrentBookId] = useState<string | null>(null)
  const [resumeInfo, setResumeInfo] = useState<{ savedIndex: number; pct: number } | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const textPreviewRef = useRef<TextPreviewHandle>(null)
  const wordIndexRef = useRef(wordIndex)
  const wordsRef = useRef(words)
  const playStateRef = useRef(playState)
  const minWpmRef = useRef(minWpm)
  const maxWpmRef = useRef(maxWpm)
  const fileNameRef = useRef(fileName)
  const currentBookIdRef = useRef(currentBookId)
  // Rolling 10-second window of word-display timestamps for WPM averaging
  const wpmWindowRef = useRef<number[]>([])

  // Keep refs in sync
  wordIndexRef.current = wordIndex
  wordsRef.current = words
  playStateRef.current = playState
  minWpmRef.current = minWpm
  maxWpmRef.current = maxWpm
  fileNameRef.current = fileName
  currentBookIdRef.current = currentBookId

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // wake lock denied (e.g. battery saver) — ignore silently
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
  }, [])

  // Re-acquire wake lock if the page becomes visible again (e.g. tab switch)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && playStateRef.current === 'playing') {
        acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [acquireWakeLock])

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
        textPreviewRef.current?.updateHighlight(index)

        // Rolling 10s WPM average
        const now2 = performance.now()
        wpmWindowRef.current.push(now2)
        const cutoff = now2 - 10_000
        wpmWindowRef.current = wpmWindowRef.current.filter(t => t >= cutoff)
        const windowCount = wpmWindowRef.current.length
        const avgWpm = windowCount > 1
          ? Math.round((windowCount - 1) / ((now2 - wpmWindowRef.current[0]) / 60_000))
          : Math.round(60000 / delay)
        setCurrentWpm(avgWpm)

        // Save position to localStorage (legacy key kept for resume dialog)
        localStorage.setItem(
          `sprintread-pos:${fileNameRef.current ?? ''}`,
          String(index),
        )
        // Update library progress every 10 words
        if (index % 10 === 0 && currentBookIdRef.current) {
          updateBookProgress(currentBookIdRef.current, index, wordsRef.current.length)
        }

        scheduleNext(index + 1, delayTable, expectedTime + delay)
      }, adjustedDelay)
    },
    [],
  )

  const startPlaying = useCallback(
    (fromIndex: number) => {
      stopTimer()
      acquireWakeLock()
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
    [stopTimer, acquireWakeLock, scheduleNext],
  )

  // BUG 2 FIX: always resume from current position
  const handlePlay = useCallback(() => {
    if (wordsRef.current.length === 0) return
    const from = wordIndexRef.current
    startPlaying(from)
  }, [startPlaying])

  const handlePause = useCallback(() => {
    stopTimer()
    releaseWakeLock()
    setPlayState('paused')
  }, [stopTimer, releaseWakeLock])

  const handleStop = useCallback(() => {
    stopTimer()
    releaseWakeLock()
    setPlayState('idle')
    setWordIndex(0)
    wordIndexRef.current = 0
    setCurrentWpm(minWpmRef.current)
  }, [stopTimer, releaseWakeLock])

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
        const isEpub = file.name.toLowerCase().endsWith('.epub')
        const parsed = isEpub ? await parseEpub(file) : await parsePdf(file)
        setWords(parsed.words)
        wordsRef.current = parsed.words
        setPdfDoc(parsed.pdfDoc)
        setChapters(parsed.chapters)
        setCurrentWpm(DEFAULT_MIN_WPM)

        // Save to library (upsert)
        const bookId = await saveBook(file, parsed.words.length)
        setCurrentBookId(bookId)
        currentBookIdRef.current = bookId
        setLibrary(getLibraryMeta())

        // Ask user whether to resume or restart if a saved position exists
        const savedKey = `sprintread-pos:${file.name}`
        const saved = Number(localStorage.getItem(savedKey) ?? 0)
        const savedIndex = Math.min(saved, parsed.words.length - 1)
        if (savedIndex > 0) {
          const pct = Math.round((savedIndex / parsed.words.length) * 100)
          setResumeInfo({ savedIndex, pct })
        } else {
          setWordIndex(0)
          wordIndexRef.current = 0
        }
      } catch (err) {
        console.error('Failed to parse file:', err)
        alert('Failed to extract text from this file. Try a different file.')
        setFileName(null)
        fileNameRef.current = null
      } finally {
        setIsLoading(false)
      }
    },
    [stopTimer],
  )

  // Page navigation — jump ±250 words
  const PAGE_WORDS = 250
  const handlePageBack = useCallback(() => {
    const idx = Math.max(0, wordIndexRef.current - PAGE_WORDS)
    handleSeek(idx)
  }, [handleSeek])

  const handlePageForward = useCallback(() => {
    const idx = Math.min((wordsRef.current.length - 1), wordIndexRef.current + PAGE_WORDS)
    handleSeek(idx)
  }, [handleSeek])

  // Resume dialog handlers
  const handleResume = useCallback(() => {
    if (!resumeInfo) return
    setWordIndex(resumeInfo.savedIndex)
    wordIndexRef.current = resumeInfo.savedIndex
    setResumeInfo(null)
  }, [resumeInfo])

  const handleRestart = useCallback(() => {
    setWordIndex(0)
    wordIndexRef.current = 0
    setResumeInfo(null)
  }, [])

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

  // PDF page navigation
  const handlePrevPage = useCallback(() => {
    const ws = wordsRef.current
    if (ws.length === 0) return
    const currentPage = (ws[wordIndexRef.current] as { pageNum?: number })?.pageNum ?? 1
    if (currentPage <= 1) return
    const idx = ws.findIndex(w => (w as { pageNum?: number }).pageNum === currentPage - 1)
    if (idx >= 0) handleSeek(idx)
  }, [handleSeek])

  const handleNextPage = useCallback(() => {
    const ws = wordsRef.current
    if (ws.length === 0) return
    const currentPage = (ws[wordIndexRef.current] as { pageNum?: number })?.pageNum ?? 1
    const idx = ws.findIndex(w => (w as { pageNum?: number }).pageNum === currentPage + 1)
    if (idx >= 0) handleSeek(idx)
  }, [handleSeek])

  // Hardware back button (Android): close open drawers instead of exiting the app
  useEffect(() => {
    if (showLibrary || showToc) {
      window.history.pushState({ modal: true }, '')
    }
  }, [showLibrary, showToc])

  useEffect(() => {
    const onPop = () => {
      if (showLibrary) { setShowLibrary(false); return }
      if (showToc) { setShowToc(false); return }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [showLibrary, showToc])

  // Cleanup on unmount
  useEffect(() => () => { stopTimer(); releaseWakeLock() }, [stopTimer, releaseWakeLock])

  // Auto-load last opened book on mount
  useEffect(() => {
    const lastId = getLastOpenedId()
    if (!lastId) return
    setIsLoading(true)
    loadBookData(lastId).then(async (result) => {
      if (!result) { setIsLoading(false); return }
      const { data, meta } = result
      const file = new File([data], meta.name, {
        type: meta.fileType === 'epub' ? 'application/epub+zip' : 'application/pdf',
      })
      try {
        const isEpub = meta.fileType === 'epub'
        const parsed = isEpub ? await parseEpub(file) : await parsePdf(file)
        setWords(parsed.words)
        wordsRef.current = parsed.words
        setPdfDoc(parsed.pdfDoc)
        setChapters(parsed.chapters)
        setFileName(meta.name)
        fileNameRef.current = meta.name
        setCurrentBookId(meta.id)
        currentBookIdRef.current = meta.id
        setCurrentWpm(DEFAULT_MIN_WPM)
        if (meta.position > 0) {
          const pct = Math.round((meta.position / parsed.words.length) * 100)
          setResumeInfo({ savedIndex: meta.position, pct })
        }
      } catch (err) {
        console.error('Failed to auto-load book:', err)
      } finally {
        setIsLoading(false)
      }
    }).catch(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLibraryBookOpen = useCallback(async (id: string) => {
    setShowLibrary(false)
    const result = await loadBookData(id)
    if (!result) return
    const { data, meta } = result
    const file = new File([data], meta.name, {
      type: meta.fileType === 'epub' ? 'application/epub+zip' : 'application/pdf',
    })
    await handleFileSelected(file)
  }, [handleFileSelected])

  const handleLibraryDelete = useCallback(async (id: string) => {
    await deleteBook(id)
    setLibrary(getLibraryMeta())
    if (currentBookIdRef.current === id) {
      stopTimer()
      releaseWakeLock()
      setPlayState('idle')
      setWords([])
      wordsRef.current = []
      setWordIndex(0)
      wordIndexRef.current = 0
      setPdfDoc(null)
      setChapters([])
      setFileName(null)
      fileNameRef.current = null
      setCurrentBookId(null)
      currentBookIdRef.current = null
    }
  }, [stopTimer, releaseWakeLock])

  const currentWord = words[wordIndex]?.text ?? ''
  const wordTexts = useMemo(() => words.map(w => w.text), [words])
  const currentPage = pdfDoc ? ((words[wordIndex] as { pageNum?: number })?.pageNum ?? 1) : undefined
  const totalPages = pdfDoc ? pdfDoc.numPages : undefined

  return (
    <div className="app">
      {/* ── Top 1/3: Word reader — tap left/right to page back/forward ── */}
      <WordDisplay
        word={currentWord} wpm={currentWpm} isEmpty={words.length === 0}
        onPageBack={words.length > 0 ? handlePageBack : undefined}
        onPageForward={words.length > 0 ? handlePageForward : undefined}
      />

      {/* ── Middle 1/3: PDF canvas for PDFs, text context view for EPUBs ── */}
      {pdfDoc
        ? <PDFPageView pdfDoc={pdfDoc} words={words} currentWordIndex={wordIndex}
            onSeek={handleSeek} onPrevPage={handlePrevPage} onNextPage={handleNextPage} />
        : <TextPreview ref={textPreviewRef} words={wordTexts} currentIndex={wordIndex} onSeek={handleSeek} />
      }

      {/* ── Bottom 1/3: Controls panel ── */}
      <div className="bottom-panel">
        {/* Playback controls */}
        <Controls
          isPlaying={playState === 'playing'}
          hasText={words.length > 0}
          wordIndex={wordIndex}
          totalWords={words.length}
          minWpm={minWpm}
          maxWpm={maxWpm}
          chapters={chapters}
          fileName={fileName}
          isLoading={isLoading}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onMinWpmChange={handleMinWpmChange}
          onMaxWpmChange={handleMaxWpmChange}
          onSeek={handleSeek}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onPrevPage={pdfDoc ? handlePrevPage : undefined}
          onNextPage={pdfDoc ? handleNextPage : undefined}
          currentPage={currentPage}
          totalPages={totalPages}
          onLibraryOpen={() => { setLibrary(getLibraryMeta()); setShowLibrary(true) }}
          onTocOpen={() => setShowToc(true)}
        />
      </div>
      {/* Resume / restart dialog */}
      {resumeInfo && fileName && (
        <ResumeDialog
          fileName={fileName}
          savedPct={resumeInfo.pct}
          onResume={handleResume}
          onRestart={handleRestart}
        />
      )}

      {/* TOC drawer – rendered outside panels so it overlays everything */}
      {showToc && (
        <TocDrawer
          chapters={chapters}
          currentWordIndex={wordIndex}
          totalWords={words.length}
          onSeek={handleSeek}
          onClose={() => setShowToc(false)}
        />
      )}

      {/* Library drawer */}
      {showLibrary && (
        <LibraryDrawer
          books={library}
          currentBookId={currentBookId}
          onOpen={handleLibraryBookOpen}
          onDelete={handleLibraryDelete}
          onAddBook={handleFileSelected}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  )
}
