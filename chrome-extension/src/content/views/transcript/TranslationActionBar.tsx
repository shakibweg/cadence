// Cadence - Translation Action Bar
import React from 'react'
import { ChevronDown, Languages, RefreshCw, Sparkles } from 'lucide-react'
import type { TranslationEngine } from '../../../shared/constants/index.ts'

interface TranslationActionBarProps {
  segmentCount: number
  isTranslating: boolean
  activeEngine: TranslationEngine
  hasGeminiKey: boolean
  isTranslatedForCurrentLang: boolean
  showTranslation: boolean
  currentEngine: TranslationEngine
  selectedLangName: string
  translateProgress: { done: number; total: number } | null
  onTranslateCadence: () => void
  onTranslateGemini: () => void
  onOpenSettings: () => void
}

export const TranslationActionBar: React.FC<TranslationActionBarProps> = ({
  segmentCount,
  isTranslating,
  activeEngine,
  hasGeminiKey,
  isTranslatedForCurrentLang,
  showTranslation,
  currentEngine,
  selectedLangName,
  translateProgress,
  onTranslateCadence,
  onTranslateGemini,
  onOpenSettings,
}) => {
  return (
    <div className="yt-transcript-action-bar">
      <div className="yt-transcript-engine-group">
        {/* Cadence Engine Chip */}
        <button
          type="button"
          className={`yt-transcript-chip-btn ${
            isTranslatedForCurrentLang && showTranslation && currentEngine === 'cadence'
              ? 'active'
              : ''
          }`}
          title={
            isTranslating && activeEngine === 'cadence'
              ? `Translating with Cadence to ${selectedLangName} (${translateProgress?.done ?? 0}/${translateProgress?.total ?? segmentCount})...`
              : isTranslatedForCurrentLang && currentEngine === 'cadence'
              ? showTranslation
                ? `Cadence Subtitles (${selectedLangName}) ON - Click to hide`
                : `Cadence Subtitles (${selectedLangName}) OFF - Click to show`
              : `Translate with Cadence to ${selectedLangName} (free)`
          }
          disabled={isTranslating}
          onClick={onTranslateCadence}
          aria-label="Translate with Cadence"
        >
          {isTranslating && activeEngine === 'cadence' ? (
            <RefreshCw size={13} className="yt-icon-spin" />
          ) : (
            <Languages size={13} />
          )}
          <span>Cadence</span>
        </button>

        {/* Gemini Engine Chip */}
        <button
          type="button"
          className={`yt-transcript-chip-btn ${
            isTranslatedForCurrentLang && showTranslation && currentEngine === 'gemini'
              ? 'active'
              : ''
          }`}
          title={
            !hasGeminiKey
              ? 'Translate with Gemini AI (API key required - set in extension popup)'
              : isTranslating && activeEngine === 'gemini'
              ? `Translating with Gemini AI to ${selectedLangName} (${translateProgress?.done ?? 0}/${translateProgress?.total ?? segmentCount})...`
              : isTranslatedForCurrentLang && currentEngine === 'gemini'
              ? showTranslation
                ? `Gemini Subtitles (${selectedLangName}) ON - Click to hide`
                : `Gemini Subtitles (${selectedLangName}) OFF - Click to show`
              : `Translate with Gemini to ${selectedLangName} (AI)`
          }
          disabled={isTranslating}
          onClick={onTranslateGemini}
          aria-label="Translate with Gemini AI"
        >
          {isTranslating && activeEngine === 'gemini' ? (
            <RefreshCw size={13} className="yt-icon-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          <span>Gemini</span>
        </button>
      </div>

      {/* Target Language Pill */}
      <button
        type="button"
        className="yt-transcript-target-pill"
        onClick={onOpenSettings}
        title="Change target language or settings"
        aria-label="Change target language"
      >
        <span>→ {selectedLangName}</span>
        <ChevronDown size={11} />
      </button>
    </div>
  )
}
