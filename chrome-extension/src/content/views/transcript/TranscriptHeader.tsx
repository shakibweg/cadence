// Cadence - Transcript Panel Header
import React from 'react'
import { Check, ChevronDown, ChevronUp, Copy, Settings, X } from 'lucide-react'
import { setPanelOpen } from '../../panelState.ts'

interface TranscriptHeaderProps {
  segmentCount: number
  copyStatus: 'idle' | 'copied'
  isCollapsed: boolean
  onCopy: () => void
  onToggleSettings: () => void
  onToggleCollapse: () => void
}

export const TranscriptHeader: React.FC<TranscriptHeaderProps> = ({
  segmentCount,
  copyStatus,
  isCollapsed,
  onCopy,
  onToggleSettings,
  onToggleCollapse,
}) => {
  return (
    <div className="yt-transcript-header-main">
      <div className="yt-transcript-title-area">
        <h3 className="yt-transcript-title">Cadence Transcript</h3>
        {segmentCount > 0 && (
          <span className="yt-transcript-count-badge">
            • {segmentCount} lines
          </span>
        )}
      </div>

      <div className="yt-transcript-header-controls">
        {segmentCount > 0 && (
          <button
            type="button"
            className={`yt-transcript-icon-btn ${copyStatus === 'copied' ? 'copied' : ''}`}
            title={copyStatus === 'copied' ? 'Copied to clipboard!' : 'Copy transcript'}
            onClick={onCopy}
            aria-label={copyStatus === 'copied' ? 'Copied to clipboard' : 'Copy transcript'}
          >
            {copyStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />}
          </button>
        )}

        <button
          type="button"
          className="yt-transcript-icon-btn"
          title="Configuration & Settings"
          onClick={onToggleSettings}
          aria-label="Configuration & Settings"
        >
          <Settings size={16} />
        </button>

        <button
          type="button"
          className="yt-transcript-icon-btn"
          title={isCollapsed ? 'Expand transcript' : 'Collapse transcript'}
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand transcript' : 'Collapse transcript'}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>

        <button
          type="button"
          className="yt-transcript-icon-btn"
          title="Close transcript"
          onClick={() => setPanelOpen(false)}
          aria-label="Close transcript"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
