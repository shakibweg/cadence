// Cadence - Background Apify Handler
import { APIFY_REQUEST_TIMEOUT_MS, APIFY_RUN_SYNC_URL, STORAGE_KEYS } from '../../shared/constants/index.ts'
import type { ApifyFetchTranscriptRequest, ApifyFetchTranscriptResponse } from '../../shared/types/messages.ts'

export async function handleApifyFetchTranscript(
  request: ApifyFetchTranscriptRequest
): Promise<ApifyFetchTranscriptResponse> {
  const { videoId, languages, useAnyAvailableCaptionLanguage } = request
  if (!videoId) {
    return { success: false, error: 'No YouTube video ID detected.' }
  }

  const stored = await chrome.storage.local.get(STORAGE_KEYS.apifyToken)
  const storedToken = stored[STORAGE_KEYS.apifyToken]
  const token = typeof storedToken === 'string' ? storedToken.trim() : ''
  if (!token) {
    return {
      success: false,
      errorCode: 'NO_API_TOKEN',
      error: 'No Apify API token set. Open the Cadence popup and add your token.',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), APIFY_REQUEST_TIMEOUT_MS)

  try {
    const input: Record<string, unknown> = {
      startUrls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }],
      maxResults: 1,
      outputFormats: ['json'],
      enableAiFallback: false,
      useAnyAvailableCaptionLanguage: useAnyAvailableCaptionLanguage ?? true,
      machineTranslateCaptions: false,
    }
    if (Array.isArray(languages) && languages.length > 0) {
      input.languages = languages
    }

    const res = await fetch(APIFY_RUN_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = body?.error?.message || ''
      } catch {}
      const message =
        res.status === 401 || res.status === 403
          ? 'Your Apify API token was rejected. Check it in the Cadence popup.'
          : res.status === 402
            ? 'Your Apify account has insufficient credit or the Actor requires a paid plan.'
            : res.status === 408
              ? 'The Apify run took too long. Try again.'
              : detail || `Apify request failed (HTTP ${res.status}).`
      return { success: false, errorCode: `HTTP_${res.status}`, error: message }
    }

    const items = await res.json()
    const item = Array.isArray(items) ? items[0] : null
    if (!item) {
      return { success: false, errorCode: 'NO_RESULT', error: 'Apify returned no result for this video.' }
    }
    return { success: true, item }
  } catch (err: any) {
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: err?.name === 'AbortError' ? 'The Apify request timed out.' : err?.message || 'Network error.',
    }
  } finally {
    clearTimeout(timeout)
  }
}
