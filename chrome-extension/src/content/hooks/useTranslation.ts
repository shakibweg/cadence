// Cadence - Translation Orchestration Hook
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { TranscriptData, TranscriptSegment } from '../types.ts'
import {
  SUPPORTED_LANGUAGES,
  getGeminiApiKey,
  onGeminiKeyChange,
  saveTranscript,
  translateSegments,
  getCurrentVideoId,
} from '../transcriptService.ts'
import type { TranslationEngine } from '../../shared/constants/index.ts'
import { STORAGE_KEYS } from '../../shared/constants/index.ts'

interface UseTranslationParams {
  transcriptData: TranscriptData | null
  setTranscriptData: (updater: TranscriptData | null | ((prev: TranscriptData | null) => TranscriptData | null)) => void
  targetLang: string
  setTargetLang: (lang: string) => void
  showTranslation: boolean
  setShowTranslation: (show: boolean) => void
  videoId: string
}

export function useTranslation({
  transcriptData,
  setTranscriptData,
  targetLang,
  setTargetLang,
  showTranslation,
  setShowTranslation,
  videoId,
}: UseTranslationParams) {
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false)
  const [activeEngine, setActiveEngine] = useState<TranslationEngine>(() => {
    return transcriptData?.translationEngine || 'cadence'
  })
  const [isTranslating, setIsTranslating] = useState<boolean>(false)
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(null)
  const [translateError, setTranslateError] = useState<string | null>(null)

  const segments = transcriptData?.segments || []

  // Check if Gemini key is present in extension storage
  useEffect(() => {
    getGeminiApiKey().then((key) => setHasGeminiKey(key.length > 0))
    return onGeminiKeyChange(setHasGeminiKey)
  }, [])

  // Check if segments currently have translations
  const hasTranslations = useMemo(() => {
    return segments.some((s) => Boolean(s.translatedText))
  }, [segments])

  const isTranslatedForCurrentLang = useMemo(() => {
    return hasTranslations && (transcriptData?.targetLanguage || 'en') === targetLang
  }, [hasTranslations, transcriptData?.targetLanguage, targetLang])

  const selectedLangObj = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || { code: 'en', name: 'English' }
  }, [targetLang])

  // Track latest references to prevent stale closures
  const transcriptDataRef = useRef<TranscriptData | null>(transcriptData)
  useEffect(() => {
    transcriptDataRef.current = transcriptData
  }, [transcriptData])

  const performTranslation = useCallback(
    async (langToUse: string, engineToUse: TranslationEngine = 'cadence') => {
      const currentData = transcriptDataRef.current
      if (!currentData || !currentData.segments || currentData.segments.length === 0) return
      const thisVideoId = videoId || getCurrentVideoId()

      setActiveEngine(engineToUse)
      setIsTranslating(true)
      setTranslateError(null)
      const baseSegments = currentData.originalSegments || currentData.segments
      setTranslateProgress({ done: 0, total: baseSegments.length })
      setShowTranslation(true)

      try {
        const res = await translateSegments(
          baseSegments,
          langToUse,
          currentData.detectedLanguage,
          (done, total) => setTranslateProgress({ done, total }),
          engineToUse,
          (partialSegments) => {
            if (getCurrentVideoId() !== thisVideoId) return

            setTranscriptData((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                segments: partialSegments,
                originalSegments: prev.originalSegments || baseSegments.map((s: TranscriptSegment) => ({ ...s })),
                targetLanguage: langToUse,
                translationEngine: engineToUse,
                showTranslation: true,
              }
            })
          }
        )

        if (getCurrentVideoId() !== thisVideoId) {
          setIsTranslating(false)
          setTranslateProgress(null)
          return
        }

        const updated: TranscriptData = {
          ...currentData,
          segments: res.translatedSegments,
          originalSegments: currentData.originalSegments || baseSegments.map((s: TranscriptSegment) => ({ ...s })),
          detectedLanguage: res.detectedSource,
          targetLanguage: langToUse,
          translationEngine: engineToUse,
          showTranslation: true,
        }
        setTranscriptData(updated)
        saveTranscript(thisVideoId, updated)
        setShowTranslation(true)
        setIsTranslating(false)
        setTranslateProgress(null)
      } catch (err: any) {
        if (getCurrentVideoId() === thisVideoId) {
          console.error('[Cadence] Translation error:', err)
          setTranslateError(err.message || 'Translation failed')
          setIsTranslating(false)
          setTranslateProgress(null)
        }
      }
    },
    [videoId, setTranscriptData, setShowTranslation]
  )

  const performTranslationRef = useRef(performTranslation)
  useEffect(() => {
    performTranslationRef.current = performTranslation
  }, [performTranslation])

  // React to storage target language changes
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = (changes: any, areaName: string) => {
        if (areaName === 'local' || !areaName) {
          if (changes[STORAGE_KEYS.targetLanguage]) {
            const newLang = changes[STORAGE_KEYS.targetLanguage].newValue
            if (newLang && typeof newLang === 'string') {
              setTargetLang(newLang)
              const current = transcriptDataRef.current
              if (current && current.segments && current.segments.length > 0 && current.targetLanguage !== newLang) {
                performTranslationRef.current(newLang, current.translationEngine || 'cadence')
              }
            }
          }
        }
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    }
  }, [setTargetLang])

  const handleTranslateCadence = useCallback(async () => {
    if (!transcriptData || segments.length === 0) return
    setTranslateError(null)
    if (isTranslating) return

    const isCurrentEngine = (transcriptData.translationEngine || 'cadence') === 'cadence'
    if (isTranslatedForCurrentLang && isCurrentEngine) {
      setShowTranslation(!showTranslation)
      return
    }

    await performTranslation(targetLang, 'cadence')
  }, [transcriptData, segments.length, isTranslating, isTranslatedForCurrentLang, showTranslation, setShowTranslation, performTranslation, targetLang])

  const handleTranslateGemini = useCallback(async () => {
    if (!transcriptData || segments.length === 0) return
    setTranslateError(null)

    if (!hasGeminiKey) {
      setTranslateError('Gemini API key is required. Click the Cadence extension icon in your browser toolbar to enter your key.')
      return
    }

    if (isTranslating) return

    const isCurrentEngine = transcriptData.translationEngine === 'gemini'
    if (isTranslatedForCurrentLang && isCurrentEngine) {
      setShowTranslation(!showTranslation)
      return
    }

    await performTranslation(targetLang, 'gemini')
  }, [transcriptData, segments.length, hasGeminiKey, isTranslating, isTranslatedForCurrentLang, showTranslation, setShowTranslation, performTranslation, targetLang])

  return {
    hasGeminiKey,
    activeEngine,
    setActiveEngine,
    isTranslating,
    translateProgress,
    translateError,
    setTranslateError,
    hasTranslations,
    isTranslatedForCurrentLang,
    selectedLangObj,
    handleTranslateCadence,
    handleTranslateGemini,
    performTranslation,
  }
}
