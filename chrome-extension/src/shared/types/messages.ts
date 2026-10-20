// Cadence - Background Message Protocol Types
import type { MESSAGE_ACTIONS } from '../constants/events.ts'

export interface ApifyFetchTranscriptRequest {
  action: typeof MESSAGE_ACTIONS.apifyFetchTranscript
  videoId: string
  languages?: string[]
  useAnyAvailableCaptionLanguage?: boolean
}

export interface ApifyTranscriptItem {
  id?: string
  title?: string
  text?: string
  subtitles?: Array<{
    start: number
    dur: number
    text: string
  }>
  [key: string]: unknown
}

export interface ApifyFetchTranscriptResponse {
  success: boolean
  item?: ApifyTranscriptItem
  error?: string
  errorCode?: string
}

export interface GeminiTranslateBatchRequest {
  action: typeof MESSAGE_ACTIONS.geminiTranslateBatch
  texts: string[]
  sourceLang?: string
  targetLangName?: string
}

export interface GeminiTranslateBatchResponse {
  success: boolean
  translatedTexts?: string[]
  usedModel?: string
  error?: string
}

export interface TranslateBatchRequest {
  action: typeof MESSAGE_ACTIONS.translateAll | typeof MESSAGE_ACTIONS.translateBatch
  texts: string[]
  sourceLang?: string
  targetLang?: string
}

export interface TranslateBatchResponse {
  success: boolean
  translatedTexts?: string[]
  detectedSource?: string
  error?: string
}

export interface TranslateTextRequest {
  action: typeof MESSAGE_ACTIONS.translateText
  text: string
  sourceLang?: string
  targetLang?: string
}

export interface TranslateTextResponse {
  success: boolean
  translatedText?: string
  detectedSource?: string
  error?: string
}

export type BackgroundRequest =
  | ApifyFetchTranscriptRequest
  | GeminiTranslateBatchRequest
  | TranslateBatchRequest
  | TranslateTextRequest
