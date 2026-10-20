// Cadence - Transcript Settings View
import React from 'react'
import { ArrowLeft, CloudDownload, Languages, Settings, Sparkles, Trash2 } from 'lucide-react'
import { SUPPORTED_LANGUAGES, type TranslationEngine } from '../../../shared/constants/index.ts'

interface TranscriptSettingsViewProps {
  targetLang: string
  onTargetLangChange: (lang: string) => void
  activeEngine: TranslationEngine
  onEngineChange: (engine: TranslationEngine) => void
  isVideoOverlayEnabled: boolean
  onToggleVideoOverlay: () => void
  autoScroll: boolean
  onToggleAutoScroll: () => void
  hasSegments: boolean
  isApifyFetching: boolean
  isTranslating: boolean
  onRefetchApify: () => void
  onClearTranscript: () => void
  onCloseSettings: () => void
}

export const TranscriptSettingsView: React.FC<TranscriptSettingsViewProps> = ({
  targetLang,
  onTargetLangChange,
  activeEngine,
  onEngineChange,
  isVideoOverlayEnabled,
  onToggleVideoOverlay,
  autoScroll,
  onToggleAutoScroll,
  hasSegments,
  isApifyFetching,
  isTranslating,
  onRefetchApify,
  onClearTranscript,
  onCloseSettings,
}) => {
  return (
    <div className="yt-transcript-settings-view">
      <div className="yt-settings-header">
        <div className="yt-settings-header-left">
          <button
            type="button"
            className="yt-transcript-icon-btn"
            title="Back to transcript"
            onClick={onCloseSettings}
            aria-label="Back to transcript"
          >
            <ArrowLeft size={16} />
          </button>
          <h4 className="yt-settings-title">Configuration</h4>
        </div>
        <button
          type="button"
          className="yt-transcript-btn yt-transcript-btn-primary"
          onClick={onCloseSettings}
        >
          Done
        </button>
      </div>

      <div className="yt-settings-body">
        {/* Target Language */}
        <div className="yt-settings-group">
          <span className="yt-settings-group-label">
            <Languages size={13} />
            Target language
          </span>
          <select
            className="yt-settings-select"
            value={targetLang}
            onChange={(e) => onTargetLangChange(e.target.value)}
            title="Select translation language"
            aria-label="Select translation language"
            disabled={isTranslating}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Translation Engine */}
        <div className="yt-settings-group">
          <span className="yt-settings-group-label">
            <Sparkles size={13} />
            Translation engine
          </span>
          <div className="yt-settings-engine-grid">
            <button
              type="button"
              className={`yt-settings-engine-card ${activeEngine === 'cadence' ? 'active' : ''}`}
              onClick={() => onEngineChange('cadence')}
            >
              <Languages size={13} />
              <span>Cadence</span>
            </button>

            <button
              type="button"
              className={`yt-settings-engine-card ${activeEngine === 'gemini' ? 'active' : ''}`}
              onClick={() => onEngineChange('gemini')}
            >
              <Sparkles size={13} />
              <span>Gemini</span>
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="yt-settings-group">
          <span className="yt-settings-group-label">
            <Settings size={13} />
            Preferences
          </span>

          <label className="yt-settings-toggle-row">
            <span className="yt-settings-toggle-title">Video player subtitles</span>
            <input
              type="checkbox"
              checked={isVideoOverlayEnabled}
              onChange={onToggleVideoOverlay}
            />
          </label>

          <label className="yt-settings-toggle-row">
            <span className="yt-settings-toggle-title">Auto-scroll transcript</span>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={onToggleAutoScroll}
            />
          </label>
        </div>

        {/* Actions for current transcript */}
        {hasSegments && (
          <div className="yt-settings-group" style={{ marginTop: 2 }}>
            <button
              type="button"
              className="yt-transcript-btn yt-transcript-btn-secondary"
              onClick={() => {
                onCloseSettings()
                onRefetchApify()
              }}
              disabled={isApifyFetching}
              style={{ width: '100%', height: 32, fontSize: 12, justifyContent: 'center', marginBottom: 8 }}
            >
              <CloudDownload size={14} style={{ marginRight: 6 }} />
              Re-fetch via Apify
            </button>
            <button
              type="button"
              className="yt-transcript-btn yt-transcript-btn-danger"
              onClick={() => {
                onClearTranscript()
                onCloseSettings()
              }}
              style={{ width: '100%', height: 32, fontSize: 12, justifyContent: 'center' }}
            >
              <Trash2 size={14} style={{ marginRight: 6 }} />
              Clear stored transcript
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
