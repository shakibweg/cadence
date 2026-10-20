// Cadence - Translation Service (Batch Background + On-Device Chrome AI Fallback)
import type { TranscriptSegment } from '../types.ts'
import { getGeminiApiKey, translateSegmentsViaGemini } from './geminiService.ts'
import {
  CHROME_AI_PROGRESS_INTERVAL,
  FALLBACK_SOURCE_LANGUAGE,
  MESSAGE_ACTIONS,
  SUPPORTED_LANGUAGES,
} from '../../shared/constants/index.ts'
import type { TargetLanguage, TranslationEngine } from '../../shared/constants/index.ts'
import { sendBackgroundMessage } from '../../shared/utils/index.ts'
import type { TranslateBatchResponse } from '../../shared/types/messages.ts'

// Re-exported so existing imports (and the transcriptService facade) keep working.
export { SUPPORTED_LANGUAGES }
export type { TargetLanguage }

export function isTranslationApiSupported(): boolean {
  const win = window as any
  return Boolean(
    (win.translation && typeof win.translation.createTranslator === 'function') ||
    (win.ai && win.ai.translator && typeof win.ai.translator.create === 'function')
  )
}

export async function detectLanguage(text: string): Promise<string> {
  const win = window as any
  try {
    if (win.translation && typeof win.translation.createDetector === 'function') {
      const detector = await win.translation.createDetector()
      const results = await detector.detect(text)
      if (results && results.length > 0) {
        return results[0].detectedLanguage || FALLBACK_SOURCE_LANGUAGE
      }
    } else if (win.ai?.languageDetector && typeof win.ai.languageDetector.create === 'function') {
      const detector = await win.ai.languageDetector.create()
      const results = await detector.detect(text)
      if (results && results.length > 0) {
        return results[0].detectedLanguage || FALLBACK_SOURCE_LANGUAGE
      }
    }
  } catch (err) {
    console.debug('[Cadence] Language detection error:', err)
  }
  return FALLBACK_SOURCE_LANGUAGE
}

/**
 * Fallback to Chrome on-device AI model if available
 */
export async function translateSegmentsViaChromeAi(
  segments: TranscriptSegment[],
  targetLang = 'en',
  sourceLang?: string,
  onProgress?: (done: number, total: number) => void,
  onBatchComplete?: (translatedSegments: TranscriptSegment[]) => void
): Promise<{ translatedSegments: TranscriptSegment[]; detectedSource: string }> {
  const win = window as any
  let detected = sourceLang
  if (!detected || detected === 'auto') {
    const sample = segments.slice(0, 10).map((s) => s.text).join(' ')
    detected = await detectLanguage(sample)
  }
  if (!detected) detected = FALLBACK_SOURCE_LANGUAGE

  let translator: any = null

  if (win.translation && typeof win.translation.createTranslator === 'function') {
    translator = await win.translation.createTranslator({
      sourceLanguage: detected,
      targetLanguage: targetLang,
    })
  } else if (win.ai?.translator && typeof win.ai.translator.create === 'function') {
    translator = await win.ai.translator.create({
      sourceLanguage: detected,
      targetLanguage: targetLang,
    })
  }

  if (!translator) {
    throw new Error('On-device AI translator could not be initialized.')
  }

  const translatedSegments: TranscriptSegment[] = []
  const total = segments.length

  for (let idx = 0; idx < total; idx++) {
    const seg = segments[idx]
    try {
      const translatedText = await translator.translate(seg.text)
      translatedSegments.push({
        ...seg,
        text: seg.text,
        translatedText: translatedText || undefined,
      })
    } catch {
      translatedSegments.push({ ...seg })
    }
    if (onProgress) {
      onProgress(idx + 1, total)
    }
    if (onBatchComplete && ((idx + 1) % CHROME_AI_PROGRESS_INTERVAL === 0 || idx + 1 === total)) {
      onBatchComplete([...translatedSegments, ...segments.slice(idx + 1)])
    }
  }

  return {
    translatedSegments,
    detectedSource: detected,
  }
}

/**
 * Universal translate function:
 * engine 'cadence' (default): zero-config background translation (single batch request)
 * with on-device AI as fallback. engine 'gemini': Gemini AI using the user's API key.
 */
export async function translateSegments(
  segments: TranscriptSegment[],
  targetLang = 'en',
  sourceLang = 'auto',
  onProgress?: (done: number, total: number) => void,
  engine: TranslationEngine = 'cadence',
  onBatchComplete?: (translatedSegments: TranscriptSegment[]) => void
): Promise<{ translatedSegments: TranscriptSegment[]; detectedSource: string }> {
  const total = segments.length
  if (total === 0) {
    return { translatedSegments: [], detectedSource: sourceLang }
  }

  // 0. Gemini AI translation (when chosen and an API key is saved)
  if (engine === 'gemini') {
    const apiKey = await getGeminiApiKey()
    if (!apiKey) {
      throw new Error('No Gemini API key set. Add it in the Cadence popup.')
    }
    const targetLangName = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang
    try {
      return await translateSegmentsViaGemini(segments, targetLangName, sourceLang, onProgress, onBatchComplete)
    } catch (err: any) {
      throw new Error(`Gemini translation failed: ${err?.message || 'unknown error'}`)
    }
  }

  // 1. Single Request via Extension Background Service Worker
  if (typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function') {
    try {
      if (onProgress) onProgress(0, total)
      const allTexts = segments.map((s) => s.text)

      const response = await sendBackgroundMessage<TranslateBatchResponse>({
        action: MESSAGE_ACTIONS.translateAll,
        texts: allTexts,
        sourceLang,
        targetLang,
      })

      if (!response || !response.success) {
        throw new Error(response?.error || 'Translation failed')
      }

      const result = {
        texts: response.translatedTexts || [],
        detectedSource: response.detectedSource || sourceLang,
      }

      if (onProgress) onProgress(total, total)

      const translatedSegments: TranscriptSegment[] = segments.map((seg, idx) => ({
        ...seg,
        text: seg.text,
        translatedText: result.texts[idx] || undefined,
      }))

      if (onBatchComplete) {
        onBatchComplete(translatedSegments)
      }

      return {
        translatedSegments,
        detectedSource: result.detectedSource,
      }
    } catch (err) {
      console.warn('[Cadence] Single-request translation error, trying on-device AI:', err)
    }
  }

  // 2. Secondary: On-Device AI
  if (isTranslationApiSupported()) {
    return translateSegmentsViaChromeAi(segments, targetLang, sourceLang, onProgress, onBatchComplete)
  }

  throw new Error('Translation service is temporarily unreachable. Please try again.')
}
