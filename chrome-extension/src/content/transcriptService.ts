// Cadence - Transcript & Translation Service (Facade)
// Re-exports all modular sub-services for clean modularity and backwards compatibility.

// 1. Time & Video Control Utilities
export {
  formatTimestamp,
  parseTimestampToSeconds,
  seekVideo,
  getCurrentVideoId,
} from './services/timeUtils.ts'

// 2. Transcript & Language Storage
export {
  saveTranscript,
  loadStoredTranscript,
  loadStoredTranscriptAsync,
  clearStoredTranscript,
  getStoredTargetLanguage,
  loadStoredTargetLanguageAsync,
  saveStoredTargetLanguage,
} from './services/transcriptStorage.ts'

// 3. Transcript Parsing & Sanitization
export {
  sanitizeSegmentText,
  cleanText,
  tryParseJson,
  tryParseSubtitle,
  parseTimestampedLines,
  parseTranscriptContent,
} from './services/transcriptParser.ts'


// 5. Translation Service & Language Definitions
export {
  SUPPORTED_LANGUAGES,
  isTranslationApiSupported,
  detectLanguage,
  translateSegmentsViaChromeAi,
  translateSegments,
} from './services/translationService.ts'
export type { TargetLanguage } from './services/translationService.ts'

// 5b. Gemini AI Translation (user-supplied API key)
export {
  DEFAULT_GEMINI_MODEL,
  GEMINI_AVAILABLE_MODELS,
  GEMINI_ROUTED_MODELS,
  GEMINI_KEY_URL,
  GEMINI_BATCH_SIZE,
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  getEnabledGeminiModels,
  saveEnabledGeminiModels,
  onGeminiKeyChange,
  verifyGeminiApiKey,
} from './services/geminiService.ts'
export type { TranslationEngine, GeminiModelOption } from './services/geminiService.ts'

// 6. Apify API Transcript Service (user-supplied API token)
export {
  APIFY_TOKEN_URL,
  getApifyToken,
  saveApifyToken,
  clearApifyToken,
  onApifyTokenChange,
  verifyApifyToken,
  fetchTranscriptViaApify,
  apifyItemToTranscriptData,
} from './services/apifyService.ts'
export type { ApifyTranscriptOptions, ApifyTranscriptResult } from './services/apifyService.ts'
