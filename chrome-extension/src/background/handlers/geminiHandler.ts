// Cadence - Background Gemini Translation Handler
import {
  GEMINI_API_REVISION,
  GEMINI_COOLDOWN_MS,
  GEMINI_INTERACTIONS_URL,
  GEMINI_REQUEST_TIMEOUT_MS,
  GEMINI_ROUTED_MODELS,
  STORAGE_KEYS,
} from '../../shared/constants/index.ts'
import type { GeminiTranslateBatchRequest, GeminiTranslateBatchResponse } from '../../shared/types/messages.ts'

// Cooldown map: model -> timestamp until which it is cooling down.
// Persists in background module scope while the service worker is active.
const geminiModelCooldowns = new Map<string, number>()

export async function handleGeminiTranslateBatch(
  request: GeminiTranslateBatchRequest
): Promise<GeminiTranslateBatchResponse> {
  const { texts, sourceLang = 'auto', targetLangName = 'English' } = request
  if (!Array.isArray(texts) || texts.length === 0) {
    return { success: true, translatedTexts: [] }
  }

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.geminiApiKey,
    STORAGE_KEYS.geminiEnabledModels,
  ])

  const storedKey = stored[STORAGE_KEYS.geminiApiKey]
  const apiKey = typeof storedKey === 'string' ? storedKey.trim() : ''
  if (!apiKey) {
    return { success: false, error: 'No Gemini API key set. Add it in the Cadence popup.' }
  }

  // Determine enabled models from user settings (default to all models in priority order)
  const storedEnabled = stored[STORAGE_KEYS.geminiEnabledModels]
  const enabledSet =
    Array.isArray(storedEnabled) && storedEnabled.length > 0
      ? new Set<string>(storedEnabled)
      : new Set<string>(GEMINI_ROUTED_MODELS)

  const activeChain = GEMINI_ROUTED_MODELS.filter((m) => enabledSet.has(m))

  if (activeChain.length === 0) {
    return {
      success: false,
      error: 'No Gemini models are enabled in the router pool. Open the Cadence popup and check at least one model.',
    }
  }

  // Sort candidates: models with expired cooldown first, followed by earliest recovering models
  const now = Date.now()
  const availableModels = activeChain.filter((m) => (geminiModelCooldowns.get(m) ?? 0) <= now)
  const coolingModels = activeChain
    .filter((m) => (geminiModelCooldowns.get(m) ?? 0) > now)
    .sort((a, b) => (geminiModelCooldowns.get(a) ?? 0) - (geminiModelCooldowns.get(b) ?? 0))

  const candidateModels = availableModels.length > 0 ? [...availableModels, ...coolingModels] : coolingModels
  const failureSummary: string[] = []

  for (const model of candidateModels) {
    const body = {
      model,
      system_instruction:
        `You are a professional subtitle translator. Translate each subtitle line into ${targetLangName}` +
        (sourceLang && sourceLang !== 'auto' ? ` (source language code: ${sourceLang})` : '') +
        '. Keep the meaning, tone and brevity. Translate every line individually - never merge, split, skip or reorder lines. ' +
        'Keep sound tags like [Music] translated in brackets. Return one result per input, using the same "i" index.',
      input: JSON.stringify(texts.map((t: string, i: number) => ({ i, t }))),
      store: false,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            translations: {
              type: 'array',
              items: {
                type: 'object',
                properties: { i: { type: 'integer' }, t: { type: 'string' } },
                required: ['i', 't'],
              },
            },
          },
          required: ['translations'],
        },
      },
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(GEMINI_INTERACTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
          'Api-Revision': GEMINI_API_REVISION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        let detail = ''
        try {
          detail = (await res.json())?.error?.message || ''
        } catch {}

        const status = res.status
        if (status === 400 && /api key/i.test(detail)) {
          return { success: false, error: 'Gemini API key is invalid.' }
        }
        if (status === 401 || status === 403) {
          return { success: false, error: 'Gemini API key was rejected. Check it in the Cadence popup.' }
        }

        if (status === 429) {
          console.warn(`[Cadence Router] Model "${model}" hit rate limit (429). Routing to next model in pool...`)
          geminiModelCooldowns.set(model, Date.now() + GEMINI_COOLDOWN_MS.rateLimited)
          failureSummary.push(`${model}: Rate limit reached (429)`)
          continue
        }

        if (status === 503 || status === 500) {
          console.warn(`[Cadence Router] Model "${model}" overloaded (${status}). Routing to next model in pool...`)
          geminiModelCooldowns.set(model, Date.now() + GEMINI_COOLDOWN_MS.serverError)
          failureSummary.push(`${model}: Server error (${status})`)
          continue
        }

        if (status === 404) {
          console.warn(`[Cadence Router] Model "${model}" not available for this key (404). Routing to next model...`)
          geminiModelCooldowns.set(model, Date.now() + GEMINI_COOLDOWN_MS.notFound)
          failureSummary.push(`${model}: Not accessible with this key (404)`)
          continue
        }

        console.warn(`[Cadence Router] Model "${model}" failed (HTTP ${status}): ${detail}. Routing to next model...`)
        failureSummary.push(`${model}: HTTP ${status}${detail ? ` - ${detail}` : ''}`)
        continue
      }

      const data = await res.json()
      let raw: string = typeof data?.output_text === 'string' ? data.output_text : ''
      if (!raw && Array.isArray(data?.steps)) {
        for (const step of data.steps) {
          const content = Array.isArray(step?.content) ? step.content : []
          for (const block of content) {
            if (block?.type === 'text' && typeof block.text === 'string' && step?.type !== 'user_input') {
              raw = block.text
            }
          }
        }
      }

      let parsed: Array<{ i: number; t: string }> = []
      try {
        const json = JSON.parse(raw)
        parsed = Array.isArray(json) ? json : Array.isArray(json?.translations) ? json.translations : []
      } catch {
        console.warn(`[Cadence Router] Model "${model}" returned invalid JSON. Routing to next model...`)
        failureSummary.push(`${model}: Invalid JSON output`)
        continue
      }

      if (parsed.length === 0 && texts.length > 0) {
        console.warn(`[Cadence Router] Model "${model}" returned empty translations. Routing to next model...`)
        failureSummary.push(`${model}: Empty translations`)
        continue
      }

      // Successful response: clear cooldown for this model
      geminiModelCooldowns.delete(model)

      const translatedTexts: string[] = new Array(texts.length).fill('')
      for (const item of parsed) {
        if (item && Number.isInteger(item.i) && item.i >= 0 && item.i < texts.length && typeof item.t === 'string') {
          translatedTexts[item.i] = item.t.trim()
        }
      }

      return { success: true, translatedTexts, usedModel: model }
    } catch (err: any) {
      console.warn(`[Cadence Router] Error with model "${model}": ${err?.message}. Routing to next model...`)
      failureSummary.push(`${model}: ${err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Network error'}`)
      continue
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    success: false,
    error:
      failureSummary.length > 0
        ? `All enabled Gemini models in the router pool failed:\n• ${failureSummary.join('\n• ')}`
        : 'All enabled Gemini models reached rate limits or failed.',
  }
}
