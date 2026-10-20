// Cadence - Gemini settings (shared by the content script, popup and background worker)

export interface GeminiModelOption {
  id: string
  name: string
}

export const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey'
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const GEMINI_INTERACTIONS_URL = `${GEMINI_API_BASE}/interactions`
export const GEMINI_API_REVISION = '2026-05-20'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

/** Supported text-out models for translation, in prioritized fallback routing order. */
export const GEMINI_AVAILABLE_MODELS: GeminiModelOption[] = [
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
]

/** Model IDs only, in fallback order. */
export const GEMINI_ROUTED_MODELS: string[] = GEMINI_AVAILABLE_MODELS.map((m) => m.id)

/** Models tried (in order) when verifying an API key. */
export const GEMINI_VERIFY_MODELS: string[] = [DEFAULT_GEMINI_MODEL, 'gemini-3.1-flash-lite', 'gemini-2.5-flash']

/** Number of subtitle lines translated per Gemini request. */
export const GEMINI_BATCH_SIZE = 200

/** Number of parallel batch requests sent to Gemini simultaneously. */
export const GEMINI_CONCURRENCY = 2

/** Per-request timeout. */
export const GEMINI_REQUEST_TIMEOUT_MS = 90_000

/** How long a model is skipped after a failure, by HTTP status. */
export const GEMINI_COOLDOWN_MS = {
  rateLimited: 60_000, // 429
  serverError: 30_000, // 500 / 503
  notFound: 24 * 60 * 60 * 1000, // 404
} as const

/** 'cadence' = built-in free translation (Google Translate / on-device AI), 'gemini' = Gemini AI (needs API key) */
export type TranslationEngine = 'cadence' | 'gemini'
