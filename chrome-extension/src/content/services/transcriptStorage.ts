// Cadence - Transcript & Target Language Storage Service
// Delegates to shared transcriptCache (backed by chrome.storage.local with automatic localStorage migration).

import type { TranscriptData } from '../types.ts'
import { sanitizeSegmentText } from './transcriptParser.ts'
import {
  clearTranscriptFromCache,
  getTargetLanguageFromCache,
  loadTranscriptFromCache,
  saveTargetLanguageToCache,
  saveTranscriptToCache,
} from '../../shared/storage/index.ts'
import { DEFAULT_TARGET_LANGUAGE } from '../../shared/constants/index.ts'

/** Sanitize every segment's text after loading from storage. */
function hydrateTranscript(data: TranscriptData): TranscriptData {
  if (Array.isArray(data.segments)) {
    data.segments = data.segments.map((seg) => ({
      ...seg,
      text: sanitizeSegmentText(seg.text),
    }))
  }
  return data
}

/**
 * Save transcript data to storage cache (chrome.storage.local).
 */
export function saveTranscript(videoId: string, data: TranscriptData): void {
  saveTranscriptToCache(videoId, data).catch((err) => {
    console.warn('[Cadence] Failed to save transcript to cache:', err)
  })
}

/**
 * Synchronous load fallback for initial mount if cached in memory/legacy.
 */
export function loadStoredTranscript(videoId: string): TranscriptData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(`cadence_yt_transcript_${videoId}`)
    if (raw) {
      return hydrateTranscript(JSON.parse(raw) as TranscriptData)
    }
  } catch {}
  return null
}

/**
 * Asynchronous load from chrome.storage.local with one-time localStorage migration.
 */
export async function loadStoredTranscriptAsync(videoId: string): Promise<TranscriptData | null> {
  try {
    const cached = await loadTranscriptFromCache(videoId)
    if (cached) {
      return hydrateTranscript(cached as TranscriptData)
    }
  } catch (err) {
    console.warn('[Cadence] Failed to load stored transcript async:', err)
  }
  return null
}

/**
 * Remove stored transcript for video from storage cache.
 */
export function clearStoredTranscript(videoId: string): void {
  clearTranscriptFromCache(videoId).catch((err) => {
    console.warn('[Cadence] Failed to clear transcript from cache:', err)
  })
}

// -------------------------------------------------------------
// Target Language Preference Storage
// -------------------------------------------------------------

export function getStoredTargetLanguage(): string {
  // Synchronous read fallback for instant initial render
  if (typeof window !== 'undefined' && window.localStorage) {
    const val = localStorage.getItem('cadence_yt_target_lang')
    if (val) return val
  }
  return DEFAULT_TARGET_LANGUAGE
}

export async function loadStoredTargetLanguageAsync(): Promise<string> {
  return getTargetLanguageFromCache()
}

export function saveStoredTargetLanguage(lang: string): void {
  saveTargetLanguageToCache(lang).catch(() => {})
}
