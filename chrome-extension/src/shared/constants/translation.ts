// Cadence - Translation settings

export interface TargetLanguage {
  code: string
  name: string
}

export const DEFAULT_TARGET_LANGUAGE = 'en'

export const SUPPORTED_LANGUAGES: TargetLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'zh-CN', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
]

export const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single'

/** Separator used to join subtitle lines into one Google Translate request. */
export const TRANSLATE_DELIMITER = '\n___§___\n'
export const TRANSLATE_DELIMITER_REGEX = /___§___/i

/** Fallback source language when detection fails. */
export const FALLBACK_SOURCE_LANGUAGE = 'de'

/** On-device translation: report partial results every N lines. */
export const CHROME_AI_PROGRESS_INTERVAL = 25
