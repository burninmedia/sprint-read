import React, { useCallback, useRef, useState } from 'react'

interface PDFUploadProps {
  onFileSelected: (file: File) => void
  isLoading: boolean
  fileName: string | null
}

const PDFUpload: React.FC<PDFUploadProps> = ({ onFileSelected, isLoading, fileName }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      const name = file.name.toLowerCase()
      const validType = file.type === 'application/pdf' || name.endsWith('.epub')
      if (!validType) {
        alert('Please upload a PDF or EPUB file.')
        return
      }
      onFileSelected(file)
    },
    [onFileSelected],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const onDragLeave = () => setIsDragOver(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  return (
    <div
      className={`pdf-upload${isDragOver ? ' pdf-upload--drag-over' : ''}${isLoading ? ' pdf-upload--loading' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isLoading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !isLoading && inputRef.current?.click()}
      aria-label="Upload PDF or EPUB"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.epub"
        className="pdf-upload__input"
        onChange={onInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {isLoading ? (
        <div className="pdf-upload__content">
          <div className="spinner" />
          <span className="pdf-upload__text">Extracting text…</span>
        </div>
      ) : fileName ? (
        <div className="pdf-upload__content">
          <PdfIcon />
          <span className="pdf-upload__filename">{fileName}</span>
          <span className="pdf-upload__hint">Click to replace</span>
        </div>
      ) : (
        <div className="pdf-upload__content">
          <UploadIcon />
          <span className="pdf-upload__text">Drop a PDF or EPUB here or click to browse</span>
        </div>
      )}
    </div>
  )
}

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
  </svg>
)

const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
    <line x1="9" y1="17" x2="15" y2="17" strokeLinecap="round" />
    <polyline points="9 9 10 9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default PDFUpload
