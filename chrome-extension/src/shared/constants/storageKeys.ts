// Cadence - Storage keys (chrome.storage.local / localStorage / sessionStorage)

export const STORAGE_KEYS = {
  geminiApiKey: 'cadence_gemini_api_key',
  geminiModel: 'cadence_gemini_model',
  geminiEnabledModels: 'cadence_gemini_enabled_models',
  apifyToken: 'cadence_apify_token',
  targetLanguage: 'cadence_yt_target_lang',
  /** Prefix; the video ID (or `global`) is appended. */
  transcriptPrefix: 'cadence_yt_transcript_',
  panelOpen: 'cadence_panel_open',
  videoOverlayEnabled: 'cadence_video_overlay_enabled',
  showTranslation: 'cadence_show_translation',
} as const

/** Build the storage key for a video's transcript. */
export function transcriptStorageKey(videoId: string): string {
  return `${STORAGE_KEYS.transcriptPrefix}${videoId || 'global'}`
}
