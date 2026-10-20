// Cadence - Event and message names

/** `window` CustomEvent names used between content-script React roots. */
export const EVENTS = {
  panelToggle: 'cadence-transcript-panel-toggle',
  panelToggleClick: 'cadence-transcript-panel-toggle-click',
  overlayToggle: 'cadence-video-overlay-toggle',
  transcriptUpdated: 'cadence-transcript-updated',
  requestTranscript: 'cadence-request-transcript',
} as const

/** YouTube SPA navigation events. */
export const YT_EVENTS = {
  navigateFinish: 'yt-navigate-finish',
  pageDataUpdated: 'yt-page-data-updated',
  popstate: 'popstate',
} as const

/** `chrome.runtime.sendMessage` actions handled by the background worker. */
export const MESSAGE_ACTIONS = {
  apifyFetchTranscript: 'APIFY_FETCH_TRANSCRIPT',
  geminiTranslateBatch: 'GEMINI_TRANSLATE_BATCH',
  translateAll: 'TRANSLATE_ALL',
  translateBatch: 'TRANSLATE_BATCH',
  translateText: 'TRANSLATE_TEXT',
} as const
