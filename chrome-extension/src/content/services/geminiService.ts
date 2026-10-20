// Cadence - Gemini AI Translation Service
// Lets users translate subtitles with Google's Gemini model using their own API key.
// The key is stored in chrome.storage.local; requests are made by the background worker.

import type { TranscriptSegment } from '../types.ts'
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_API_BASE,
  GEMINI_AVAILABLE_MODELS,
  GEMINI_BATCH_SIZE,
  GEMINI_CONCURRENCY,
  GEMINI_KEY_URL,
  GEMINI_ROUTED_MODELS,
  GEMINI_VERIFY_MODELS,
  MESSAGE_ACTIONS,
  STORAGE_KEYS,
} from '../../shared/constants/index.ts'
import type { GeminiModelOption, TranslationEngine } from '../../shared/constants/index.ts'
import { createSecretStore } from '../../shared/storage/index.ts'
import { storageGet, storageSet } from '../../shared/storage/chromeStorage.ts'
import { sendBackgroundMessage } from '../../shared/utils/index.ts'
import type { GeminiTranslateBatchResponse } from '../../shared/types/messages.ts'

export {
  DEFAULT_GEMINI_MODEL,
  GEMINI_AVAILABLE_MODELS,
  GEMINI_ROUTED_MODELS,
  GEMINI_BATCH_SIZE,
  GEMINI_CONCURRENCY,
  GEMINI_KEY_URL,
}
export type { GeminiModelOption, TranslationEngine }

// -------------------------------------------------------------
// Settings storage (backed by shared createSecretStore)
// -------------------------------------------------------------

const geminiKeyStore = createSecretStore<string>(STORAGE_KEYS.geminiApiKey, '')
const geminiModelStore = createSecretStore<string>(STORAGE_KEYS.geminiModel, DEFAULT_GEMINI_MODEL)

export const getGeminiApiKey = () => geminiKeyStore.get()
export const saveGeminiApiKey = (key: string) => geminiKeyStore.set(key)
export const clearGeminiApiKey = () => geminiKeyStore.clear()
export const onGeminiKeyChange = (callback: (hasKey: boolean) => void) =>
  geminiKeyStore.onChange(callback)

export const getSelectedGeminiModel = () => geminiModelStore.get()
export const saveSelectedGeminiModel = (model: string) => geminiModelStore.set(model)

/**
 * Get the list of model IDs enabled for the router fallback pool.
 * Defaults to all models if none are configured.
 */
export async function getEnabledGeminiModels(): Promise<string[]> {
  const stored = await storageGet<string[]>(STORAGE_KEYS.geminiEnabledModels)
  if (Array.isArray(stored) && stored.length > 0) {
    return stored
  }
  return GEMINI_ROUTED_MODELS
}

export async function saveEnabledGeminiModels(models: string[]): Promise<void> {
  await storageSet({ [STORAGE_KEYS.geminiEnabledModels]: models })
}

/** Verify a Gemini API key by fetching model metadata. */
export async function verifyGeminiApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  for (const model of GEMINI_VERIFY_MODELS) {
    try {
      const res = await fetch(`${GEMINI_API_BASE}/models/${model}`, {
        headers: { 'x-goog-api-key': key.trim() },
      })
      if (res.ok) return { valid: true }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { valid: false, error: 'Invalid Gemini API key.' }
      }
      // If 404, continue to next model in case this specific model ID is restricted
      if (res.status === 404) continue
      return { valid: false, error: `Could not verify key (HTTP ${res.status}).` }
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Network error while verifying key.' }
    }
  }
  return { valid: false, error: 'Gemini model is not accessible with this key.' }
}

// -------------------------------------------------------------
// Translation
// -------------------------------------------------------------

async function translateBatchViaBackground(
  texts: string[],
  sourceLang: string,
  targetLangName: string
): Promise<string[]> {
  const response = await sendBackgroundMessage<GeminiTranslateBatchResponse>({
    action: MESSAGE_ACTIONS.geminiTranslateBatch,
    texts,
    sourceLang,
    targetLangName,
  })

  if (!response || !response.success) {
    throw new Error(response?.error || 'Gemini translation failed.')
  }
  return response.translatedTexts || []
}

/**
 * Translate subtitle segments with Gemini using parallel batch requests and progressive updates.
 */
export async function translateSegmentsViaGemini(
  segments: TranscriptSegment[],
  targetLangName: string,
  sourceLang = 'auto',
  onProgress?: (done: number, total: number) => void,
  onBatchComplete?: (translatedSegments: TranscriptSegment[]) => void
): Promise<{ translatedSegments: TranscriptSegment[]; detectedSource: string }> {
  const total = segments.length
  if (total === 0) {
    return { translatedSegments: [], detectedSource: sourceLang }
  }

  const translations: string[] = new Array(total).fill('')
  if (onProgress) onProgress(0, total)

  // Divide segments into batch tasks
  interface ChunkTask {
    start: number
    texts: string[]
  }
  const tasks: ChunkTask[] = []
  for (let start = 0; start < total; start += GEMINI_BATCH_SIZE) {
    const chunk = segments.slice(start, start + GEMINI_BATCH_SIZE)
    tasks.push({
      start,
      texts: chunk.map((s) => s.text),
    })
  }

  let taskIndex = 0
  let completedLines = 0
  let hasError = false
  let failureError: any = null

  // Concurrent worker executing tasks from the queue
  async function worker() {
    while (taskIndex < tasks.length && !hasError) {
      const task = tasks[taskIndex++]
      try {
        const result = await translateBatchViaBackground(
          task.texts,
          sourceLang,
          targetLangName
        )
        if (hasError) return

        result.forEach((text, i) => {
          translations[task.start + i] = text
        })
        completedLines += task.texts.length

        if (onProgress) {
          onProgress(Math.min(completedLines, total), total)
        }

        if (onBatchComplete) {
          const partial = segments.map((seg, idx) => ({
            ...seg,
            translatedText: translations[idx] || undefined,
          }))
          onBatchComplete(partial)
        }
      } catch (err) {
        hasError = true
        failureError = err
        break
      }
    }
  }

  // Launch workers up to GEMINI_CONCURRENCY limit
  const workerCount = Math.min(GEMINI_CONCURRENCY, tasks.length)
  const workers = Array.from({ length: workerCount }, () => worker())
  await Promise.all(workers)

  if (hasError && failureError) {
    throw failureError
  }

  return {
    translatedSegments: segments.map((seg, idx) => ({
      ...seg,
      translatedText: translations[idx] || undefined,
    })),
    detectedSource: sourceLang,
  }
}
