// Cadence - Apify Transcript API Service
// Stores the user's Apify API token and fetches transcripts through the
// "YouTube Transcript Scraper" Actor (codepoetry/youtube-transcript-ai-scraper).
// The token lives in chrome.storage.local; the network call is dispatched to the background.

import type { TranscriptData, TranscriptSegment } from '../types.ts'
import { formatTimestamp } from './timeUtils.ts'
import { APIFY_ME_URL, APIFY_TOKEN_URL, MESSAGE_ACTIONS, STORAGE_KEYS } from '../../shared/constants/index.ts'
import { createSecretStore } from '../../shared/storage/index.ts'
import { sendBackgroundMessage } from '../../shared/utils/index.ts'
import type { ApifyFetchTranscriptResponse } from '../../shared/types/messages.ts'

export { APIFY_TOKEN_URL }

export interface ApifyTranscriptOptions {
  videoId: string
  /** Preferred caption languages, in order. */
  languages?: string[]
  /** Deliver the video's original-language captions when none match requested languages. Defaults to true. */
  useAnyAvailableCaptionLanguage?: boolean
}

export interface ApifyTranscriptResult {
  success: boolean
  data?: TranscriptData
  error?: string
  errorCode?: string
}

// -------------------------------------------------------------
// Token storage (via shared createSecretStore)
// -------------------------------------------------------------

const apifyTokenStore = createSecretStore<string>(STORAGE_KEYS.apifyToken, '')

export const getApifyToken = () => apifyTokenStore.get()
export const saveApifyToken = (token: string) => apifyTokenStore.set(token)
export const clearApifyToken = () => apifyTokenStore.clear()
export const onApifyTokenChange = (callback: (hasToken: boolean) => void) =>
  apifyTokenStore.onChange(callback)

// -------------------------------------------------------------
// Token verification
// -------------------------------------------------------------

export async function verifyApifyToken(token: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const res = await fetch(APIFY_ME_URL, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    })
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: 'Invalid API token.' }
    }
    if (!res.ok) {
      return { valid: false, error: `Could not verify token (HTTP ${res.status}).` }
    }
    const json = await res.json()
    return { valid: true, username: json?.data?.username }
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Network error while verifying token.' }
  }
}

// -------------------------------------------------------------
// Transcript fetching
// -------------------------------------------------------------

export async function fetchTranscriptViaApify(options: ApifyTranscriptOptions): Promise<ApifyTranscriptResult> {
  try {
    const response = await sendBackgroundMessage<ApifyFetchTranscriptResponse>({
      action: MESSAGE_ACTIONS.apifyFetchTranscript,
      ...options,
    })

    if (!response.success) {
      return { success: false, error: response.error, errorCode: response.errorCode }
    }

    return { success: true, data: apifyItemToTranscriptData(response.item) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to contact background worker.' }
  }
}

/**
 * Convert one Actor dataset item into Cadence's TranscriptData.
 */
export function apifyItemToTranscriptData(item: any): TranscriptData {
  if (item?.error_code) {
    const err: any = new Error(item.error || item.error_code)
    err.code = item.error_code
    throw err
  }

  const rawSegments: Array<{ start: number; end?: number; text: string }> = Array.isArray(item?.transcript_json)
    ? item.transcript_json
    : []

  const segments: TranscriptSegment[] = rawSegments
    .filter((s) => s && typeof s.text === 'string' && s.text.trim())
    .map((s) => {
      const start = Number(s.start) || 0
      const end = typeof s.end === 'number' ? s.end : start + 4
      return {
        start,
        dur: Math.max(0, end - start) || 4,
        formattedTime: formatTimestamp(start),
        text: s.text.replace(/\s+/g, ' ').trim(),
      }
    })

  if (segments.length === 0) {
    const err: any = new Error('The API returned no transcript segments for this video.')
    err.code = 'EMPTY_TRANSCRIPT'
    throw err
  }

  const language: string | undefined = typeof item.language === 'string' ? item.language : undefined
  const source = item.is_machine_translated
    ? `Translated (${item.translated_from || 'orig'} → ${language || 'target'})`
    : item.is_auto_generated
      ? `Auto Captions (${language || 'Apify'})`
      : `Captions (${language || 'Apify'})`

  return {
    title: item.metadata?.title,
    sourceVideoUrl: item.metadata?.url,
    segments,
    originalSegments: segments.map((s) => ({ ...s })),
    detectedLanguage: language,
    fileName: source,
  }
}
