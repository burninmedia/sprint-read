import React from 'react'

interface ResumeDialogProps {
  fileName: string
  savedPct: number
  onResume: () => void
  onRestart: () => void
}

const ResumeDialog: React.FC<ResumeDialogProps> = ({ fileName, savedPct, onResume, onRestart }) => (
  <div className="resume-overlay">
    <div className="resume-dialog">
      <div className="resume-dialog__title">Continue reading?</div>
      <div className="resume-dialog__file">{fileName}</div>
      <div className="resume-dialog__pct">You were {savedPct}% through</div>
      <div className="resume-dialog__buttons">
        <button className="resume-btn resume-btn--primary" onClick={onResume}>
          Pick up where I left off
        </button>
        <button className="resume-btn resume-btn--secondary" onClick={onRestart}>
          Start from the beginning
        </button>
      </div>
    </div>
  </div>
)

export default ResumeDialog
