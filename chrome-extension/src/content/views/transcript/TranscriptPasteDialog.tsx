// Cadence - Transcript Paste Dialog
import React from 'react'
import { AlertCircle } from 'lucide-react'

interface TranscriptPasteDialogProps {
  pasteInput: string
  parseError: string | null
  onPasteInputChange: (value: string) => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const TranscriptPasteDialog: React.FC<TranscriptPasteDialogProps> = ({
  pasteInput,
  parseError,
  onPasteInputChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <form className="yt-transcript-paste-panel" onSubmit={onSubmit}>
      <div className="yt-transcript-paste-header">
        <span className="yt-transcript-paste-title">Paste Transcript</span>
        <span className="yt-transcript-paste-subtitle">
          Paste YouTube transcript, timestamps [01:23], SRT, VTT, or any text
        </span>
      </div>

      <textarea
        className="yt-transcript-paste-textarea"
        placeholder="Paste your transcript text here...&#10;&#10;Examples:&#10;[00:15] Hello and welcome!&#10;[01:30] Today we discuss...&#10;&#10;Or paste SRT, VTT, or copied YouTube transcript."
        value={pasteInput}
        onChange={(e) => onPasteInputChange(e.target.value)}
        rows={6}
        autoFocus
      />

      {parseError && (
        <div
          className="yt-transcript-error-badge"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <AlertCircle size={14} />
          <span>{parseError}</span>
        </div>
      )}

      <div className="yt-transcript-paste-actions">
        <button
          type="button"
          className="yt-transcript-btn yt-transcript-btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" className="yt-transcript-btn yt-transcript-btn-primary">
          Load Transcript
        </button>
      </div>
    </form>
  )
}
