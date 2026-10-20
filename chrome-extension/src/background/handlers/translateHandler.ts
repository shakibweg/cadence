// Cadence - Background Google Translate Handler
import {
  GOOGLE_TRANSLATE_URL,
  TRANSLATE_DELIMITER,
  TRANSLATE_DELIMITER_REGEX,
} from '../../shared/constants/index.ts'
import type {
  TranslateBatchRequest,
  TranslateBatchResponse,
  TranslateTextRequest,
  TranslateTextResponse,
} from '../../shared/types/messages.ts'

export async function handleTranslateBatch(
  request: TranslateBatchRequest
): Promise<TranslateBatchResponse> {
  const { texts, sourceLang = 'auto', targetLang = 'en' } = request
  if (!Array.isArray(texts) || texts.length === 0) {
    return { success: true, translatedTexts: [], detectedSource: sourceLang }
  }

  const combined = texts.join(TRANSLATE_DELIMITER)

  try {
    const res = await fetch(GOOGLE_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: combined,
      }),
    })

    if (!res.ok) {
      return { success: false, error: `Translation request failed (HTTP ${res.status})` }
    }

    const data = await res.json()
    const fullTranslated = Array.isArray(data[0])
      ? data[0].map((item: any) => item[0] || '').join('')
      : ''
    const detectedSource = data[2] || sourceLang
    const parts = fullTranslated.split(TRANSLATE_DELIMITER_REGEX).map((s) => s.trim())

    return {
      success: true,
      translatedTexts: parts,
      detectedSource,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Translation network error' }
  }
}

export async function handleTranslateText(
  request: TranslateTextRequest
): Promise<TranslateTextResponse> {
  const { text, sourceLang = 'auto', targetLang = 'en' } = request
  try {
    const res = await fetch(GOOGLE_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text,
      }),
    })

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    const translatedText = Array.isArray(data[0])
      ? data[0].map((item: any) => item[0] || '').join('')
      : ''
    const detectedSource = data[2] || sourceLang
    return { success: true, translatedText, detectedSource }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Single text translation error' }
  }
}
