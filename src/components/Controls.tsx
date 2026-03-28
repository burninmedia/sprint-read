import React from 'react'

interface ControlsProps {
  isPlaying: boolean
  hasText: boolean
  wordIndex: number
  totalWords: number
  minWpm: number
  maxWpm: number
  chapters: Array<{ title: string; wordIndex: number }>
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onMinWpmChange: (v: number) => void
  onMaxWpmChange: (v: number) => void
  onSeek: (index: number) => void
  onPrevChapter: () => void
  onNextChapter: () => void
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  hasText,
  wordIndex,
  totalWords,
  minWpm,
  maxWpm,
  chapters,
  onPlay,
  onPause,
  onStop,
  onMinWpmChange,
  onMaxWpmChange,
  onSeek,
  onPrevChapter,
  onNextChapter,
}) => {
  const progress = totalWords > 0 ? (wordIndex / Math.max(totalWords - 1, 1)) * 100 : 0
  const hasChapters = chapters.length > 0

  return (
    <div className="controls">
      {/* Playback buttons */}
      <div className="controls__buttons">
        <button
          className="btn btn--icon"
          onClick={onPrevChapter}
          disabled={!hasText || !hasChapters}
          title="Previous chapter"
          aria-label="Previous chapter"
        >
          <SkipPrevIcon />
        </button>

        <button
          className="btn btn--icon"
          onClick={onStop}
          disabled={!hasText}
          title="Stop (reset)"
          aria-label="Stop"
        >
          <StopIcon />
        </button>

        <button
          className="btn btn--primary btn--icon"
          onClick={isPlaying ? onPause : onPlay}
          disabled={!hasText}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          className="btn btn--icon"
          onClick={onNextChapter}
          disabled={!hasText || !hasChapters}
          title="Next chapter"
          aria-label="Next chapter"
        >
          <SkipNextIcon />
        </button>
      </div>

      {/* Progress bar */}
      <div className="controls__progress">
        <input
          type="range"
          className="progress-bar"
          min={0}
          max={Math.max(totalWords - 1, 0)}
          value={wordIndex}
          disabled={!hasText}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Position"
        />
        <div className="progress-info">
          <span>{wordIndex}</span>
          <span className="progress-pct">{Math.round(progress)}%</span>
          <span>{totalWords}</span>
        </div>
      </div>

      {/* Speed sliders */}
      <div className="controls__speeds">
        <div className="speed-control">
          <label className="speed-label">
            Min speed
            <span className="speed-value">{minWpm} wpm</span>
          </label>
          <input
            type="range"
            className="speed-slider"
            min={100}
            max={500}
            step={20}
            value={minWpm}
            onChange={(e) => {
              const v = Number(e.target.value)
              onMinWpmChange(v)
              // Keep max at least 100 WPM above min
              if (v + 100 > maxWpm) onMaxWpmChange(v + 100)
            }}
            aria-label="Minimum WPM"
          />
        </div>

        <div className="speed-control">
          <label className="speed-label">
            Max speed
            <span className="speed-value">{maxWpm} wpm</span>
          </label>
          <input
            type="range"
            className="speed-slider"
            min={200}
            max={1200}
            step={20}
            value={maxWpm}
            onChange={(e) => {
              const v = Number(e.target.value)
              onMaxWpmChange(v)
              // Keep min at least 100 WPM below max
              if (v - 100 < minWpm) onMinWpmChange(Math.max(100, v - 100))
            }}
            aria-label="Maximum WPM"
          />
        </div>
      </div>
    </div>
  )
}

/* ---- inline SVG icons ---- */

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
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M6 6h12v12H6z" />
  </svg>
)

// |◄  vertical bar on left + left-pointing triangle
const SkipPrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <rect x="5" y="6" width="2" height="12" rx="0.5" />
    <polygon points="7,12 17,6 17,18" />
  </svg>
)

// ►|  right-pointing triangle + vertical bar on right
const SkipNextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <polygon points="7,6 7,18 17,12" />
    <rect x="17" y="6" width="2" height="12" rx="0.5" />
  </svg>
)

export default Controls
