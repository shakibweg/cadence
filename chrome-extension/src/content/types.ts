// Cadence - Transcript Types
import type { TranslationEngine } from '../shared/constants/index.ts'

export interface TranscriptSegment {
  start: number
  dur: number
  formattedTime: string
  text: string
  translatedText?: string
}

export interface TranscriptData {
  title?: string
  sourceVideoUrl?: string
  segments: TranscriptSegment[]
  detectedLanguage?: string
  targetLanguage?: string
  translationEngine?: TranslationEngine
  showTranslation?: boolean
  rawText?: string
  fileName?: string
  originalSegments?: TranscriptSegment[]
}

export interface TargetInsertion {
  parent: HTMLElement
  before: HTMLElement | null
}
