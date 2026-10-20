// Cadence - Transcript Dropzone & Empty State
import React from 'react'
import { AlertCircle, ClipboardPaste, CloudDownload, KeyRound, RefreshCw, Upload, UploadCloud } from 'lucide-react'

interface TranscriptDropzoneProps {
  hasApifyToken: boolean
  isApifyFetching: boolean
  parseError: string | null
  onFetchApify: () => void
  onTriggerUpload: () => void
  onOpenPaste: () => void
}

export const TranscriptDropzone: React.FC<TranscriptDropzoneProps> = ({
  hasApifyToken,
  isApifyFetching,
  parseError,
  onFetchApify,
  onTriggerUpload,
  onOpenPaste,
}) => {
  return (
    <div className="yt-transcript-dropzone" onClick={onTriggerUpload}>
      <div className="yt-dropzone-icon">
        <UploadCloud size={32} />
      </div>
      <div className="yt-dropzone-primary-text">
        Upload or fetch transcript
      </div>
      <div className="yt-dropzone-sub-text">
        Fetch captions with Apify, upload an SRT/VTT file, or paste text
      </div>
      <div className="yt-dropzone-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="yt-transcript-btn yt-transcript-btn-primary"
          onClick={onFetchApify}
          disabled={isApifyFetching}
          title="Fetch original captions via Apify"
        >
          {isApifyFetching ? (
            <RefreshCw size={15} className="yt-icon-spin" style={{ marginRight: 6 }} />
          ) : (
            <CloudDownload size={15} style={{ marginRight: 6 }} />
          )}
          {isApifyFetching ? 'Fetching Apify…' : 'Fetch via Apify'}
        </button>

        <button
          type="button"
          className="yt-transcript-btn yt-transcript-btn-secondary"
          onClick={onTriggerUpload}
        >
          <Upload size={15} style={{ marginRight: 6 }} />
          Upload File
        </button>

        <button
          type="button"
          className="yt-transcript-btn yt-transcript-btn-secondary"
          onClick={onOpenPaste}
        >
          <ClipboardPaste size={15} style={{ marginRight: 6 }} />
          Paste
        </button>
      </div>

      {!hasApifyToken && (
        <div
          className="yt-dropzone-sub-text"
          style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <KeyRound size={12} />
          <span>To fetch via Apify, add your Apify token in the Cadence popup.</span>
        </div>
      )}

      {parseError && (
        <div
          className="yt-transcript-error-badge"
          style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <AlertCircle size={14} />
          <span>{parseError}</span>
        </div>
      )}
    </div>
  )
}
