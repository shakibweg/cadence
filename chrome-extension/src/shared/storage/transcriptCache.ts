// Cadence - Transcript Cache & Migration
// Consolidates transcript storage to chrome.storage.local only, removing synchronous
// localStorage overhead from youtube.com and auto-migrating existing entries.

import { DEFAULT_TARGET_LANGUAGE, STORAGE_KEYS, transcriptStorageKey } from '../constants/index.ts'
import { storageGet, storageRemove, storageSet } from './chromeStorage.ts'

export interface CachedTranscriptData {
  title?: string
  sourceVideoUrl?: string
  segments: Array<{
    start: number
    dur: number
    formattedTime: string
    text: string
    translatedText?: string
  }>
  detectedLanguage?: string
  targetLanguage?: string
  translationEngine?: any
  showTranslation?: boolean
  rawText?: string
  fileName?: string
  originalSegments?: Array<{
    start: number
    dur: number
    formattedTime: string
    text: string
    translatedText?: string
  }>
}

/**
 * Check and migrate any legacy transcript stored in localStorage into chrome.storage.local,
 * then clean up localStorage to preserve youtube.com quota.
 */
function migrateLegacyLocalStorage(videoId: string): CachedTranscriptData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  const key = transcriptStorageKey(videoId)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as CachedTranscriptData
      // Asynchronously persist to chrome.storage.local
      storageSet({ [key]: parsed }).catch(() => {})
      // Remove from localStorage to reclaim space
      localStorage.removeItem(key)
      return parsed
    }
  } catch (err) {
    console.warn('[Cadence] Error during legacy localStorage migration:', err)
  }
  return null
}

/**
 * Save transcript to chrome.storage.local only.
 * Reclaims any existing localStorage entry for this video.
 */
export async function saveTranscriptToCache(videoId: string, data: CachedTranscriptData): Promise<void> {
  const key = transcriptStorageKey(videoId)
  await storageSet({ [key]: data })

  // Clean up legacy localStorage if it was present
  try {
    if (typeof window !== 'undefined' && window.localStorage?.getItem(key)) {
      window.localStorage.removeItem(key)
    }
  } catch {}
}

/**
 * Load transcript from cache (chrome.storage.local first, falling back to one-time migration from localStorage).
 */
export async function loadTranscriptFromCache(videoId: string): Promise<CachedTranscriptData | null> {
  const key = transcriptStorageKey(videoId)
  const stored = await storageGet<CachedTranscriptData>(key)
  if (stored) return stored

  // Fallback to legacy localStorage migration
  return migrateLegacyLocalStorage(videoId)
}

/**
 * Clear transcript for a video from both chrome.storage.local and legacy localStorage.
 */
export async function clearTranscriptFromCache(videoId: string): Promise<void> {
  const key = transcriptStorageKey(videoId)
  await storageRemove(key)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key)
    }
  } catch {}
}

// -------------------------------------------------------------
// Target Language Persistence
// -------------------------------------------------------------

let inMemoryTargetLang: string = ''

export async function getTargetLanguageFromCache(): Promise<string> {
  if (inMemoryTargetLang) return inMemoryTargetLang

  const stored = await storageGet<string>(STORAGE_KEYS.targetLanguage)
  if (stored && typeof stored === 'string') {
    inMemoryTargetLang = stored
    return stored
  }

  // One-time legacy migration from localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const legacy = localStorage.getItem(STORAGE_KEYS.targetLanguage)
      if (legacy) {
        inMemoryTargetLang = legacy
        await storageSet({ [STORAGE_KEYS.targetLanguage]: legacy })
        localStorage.removeItem(STORAGE_KEYS.targetLanguage)
        return legacy
      }
    }
  } catch {}

  return DEFAULT_TARGET_LANGUAGE
}

export async function saveTargetLanguageToCache(lang: string): Promise<void> {
  inMemoryTargetLang = lang
  await storageSet({ [STORAGE_KEYS.targetLanguage]: lang })
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.targetLanguage)
    }
  } catch {}
}
