import React from 'react'

interface ControlsProps {
  isPlaying: boolean
  hasText: boolean
  wordIndex: number
  totalWords: number
  minWpm: number
  maxWpm: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onMinWpmChange: (v: number) => void
  onMaxWpmChange: (v: number) => void
  onSeek: (index: number) => void
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  hasText,
  wordIndex,
  totalWords,
  minWpm,
  maxWpm,
  onPlay,
  onPause,
  onStop,
  onMinWpmChange,
  onMaxWpmChange,
  onSeek,
}) => {
  const progress = totalWords > 0 ? (wordIndex / Math.max(totalWords - 1, 1)) * 100 : 0

  return (
    <div className="controls">
      {/* Playback buttons */}
      <div className="controls__buttons">
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
            min={60}
            max={600}
            step={10}
            value={minWpm}
            onChange={(e) => {
              const v = Number(e.target.value)
              onMinWpmChange(v)
              if (v > maxWpm) onMaxWpmChange(v)
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
            min={100}
            max={1500}
            step={10}
            value={maxWpm}
            onChange={(e) => {
              const v = Number(e.target.value)
              onMaxWpmChange(v)
              if (v < minWpm) onMinWpmChange(v)
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

export default Controls
