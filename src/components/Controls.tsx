import React, { useRef, useState, useEffect } from 'react'

interface ControlsProps {
  isPlaying: boolean
  hasText: boolean
  wordIndex: number
  totalWords: number
  minWpm: number
  maxWpm: number
  chapters: Array<{ title: string; wordIndex: number }>
  fileName: string | null
  isLoading: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onMinWpmChange: (v: number) => void
  onMaxWpmChange: (v: number) => void
  onSeek: (index: number) => void
  onPrevChapter: () => void
  onNextChapter: () => void
  onFileSelected: (file: File) => void
  onTocOpen: () => void
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying, hasText, wordIndex, totalWords,
  minWpm, maxWpm, chapters,
  fileName, isLoading,
  onPlay, onPause, onStop,
  onMinWpmChange, onMaxWpmChange, onSeek,
  onPrevChapter, onNextChapter,
  onFileSelected, onTocOpen,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progress = totalWords > 0 ? (wordIndex / Math.max(totalWords - 1, 1)) * 100 : 0
  const hasChapters = chapters.length > 0

  // Local string state so the user can type freely; only commit on blur/Enter
  const [minInput, setMinInput] = useState(String(minWpm))
  const [maxInput, setMaxInput] = useState(String(maxWpm))
  useEffect(() => setMinInput(String(minWpm)), [minWpm])
  useEffect(() => setMaxInput(String(maxWpm)), [maxWpm])

  const commitMin = (raw: string) => {
    const v = Math.max(100, Math.min(500, parseInt(raw, 10) || minWpm))
    setMinInput(String(v))
    onMinWpmChange(v)
    if (v + 100 > maxWpm) onMaxWpmChange(v + 100)
  }
  const commitMax = (raw: string) => {
    const v = Math.max(200, Math.min(1200, parseInt(raw, 10) || maxWpm))
    setMaxInput(String(v))
    onMaxWpmChange(v)
    if (v - 100 < minWpm) onMinWpmChange(Math.max(100, v - 100))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.epub'))) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <div className="controls">
      {/* ── Row 1: transport buttons + file button + progress bar ── */}
      <div className="controls__row1">
        <div className="controls__buttons">
          {/* TOC */}
          <button className="btn btn--icon" onClick={onTocOpen}
            disabled={!hasChapters} title="Table of contents" aria-label="Table of contents">
            <TocIcon />
          </button>

          {/* Skip prev */}
          <button className="btn btn--icon" onClick={onPrevChapter}
            disabled={!hasText || !hasChapters} title="Previous chapter" aria-label="Previous chapter">
            <SkipPrevIcon />
          </button>

          {/* Stop */}
          <button className="btn btn--icon" onClick={onStop}
            disabled={!hasText} title="Stop" aria-label="Stop">
            <StopIcon />
          </button>

          {/* Play / Pause */}
          <button className="btn btn--primary btn--icon"
            onClick={isPlaying ? onPause : onPlay}
            disabled={!hasText}
            title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Skip next */}
          <button className="btn btn--icon" onClick={onNextChapter}
            disabled={!hasText || !hasChapters} title="Next chapter" aria-label="Next chapter">
            <SkipNextIcon />
          </button>

          {/* PDF file picker */}
          <input ref={fileInputRef} type="file" accept="application/pdf,.epub"
            style={{ display: 'none' }} onChange={handleFileChange} />
          <button className="btn btn--icon btn--file"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title={fileName ?? 'Open PDF'} aria-label="Open PDF">
            {isLoading ? <SpinnerIcon /> : <PdfIcon />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="controls__progress">
          <input type="range" className="progress-bar"
            min={0} max={Math.max(totalWords - 1, 0)}
            value={wordIndex} disabled={!hasText}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Position" />
          <div className="progress-info">
            <span>{fileName
              ? <span className="progress-filename">{fileName.replace(/\.pdf$/i, '').slice(0, 20)}</span>
              : 'No file'}</span>
            <span className="progress-pct">{Math.round(progress)}%</span>
            <span>{totalWords > 0 ? totalWords.toLocaleString() : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: speed sliders always visible ── */}
      <div className="controls__row2">
        <div className="speed-control">
          <label className="speed-label" htmlFor="wpm-min">Min WPM</label>
          <input id="wpm-min" type="number" className="wpm-input"
            min={100} max={500} step={20}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitMin((e.target as HTMLInputElement).value)}
            aria-label="Minimum WPM" />
        </div>

        <div className="speed-control">
          <label className="speed-label" htmlFor="wpm-max">Max WPM</label>
          <input id="wpm-max" type="number" className="wpm-input"
            min={200} max={1200} step={20}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={(e) => commitMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitMax((e.target as HTMLInputElement).value)}
            aria-label="Maximum WPM" />
        </div>
      </div>
    </div>
  )
}

/* ---- icons ---- */

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M8 5v14l11-7z" />
  </svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)
const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
)
const SkipPrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <rect x="5" y="6" width="2" height="12" rx="0.5" />
    <polygon points="7,12 17,6 17,18" />
  </svg>
)
const SkipNextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <polygon points="7,6 7,18 17,12" />
    <rect x="17" y="6" width="2" height="12" rx="0.5" />
  </svg>
)
const TocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
    <line x1="3" y1="12" x2="15" y2="12" strokeLinecap="round" />
    <line x1="3" y1="18" x2="18" y2="18" strokeLinecap="round" />
  </svg>
)
const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
)
const SpinnerIcon = () => (
  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
)

export default Controls
