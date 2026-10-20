// Cadence - Interactive YouTube Transcript & Bilingual Subtitles Component
import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { TranscriptData, TranscriptSegment } from '../types.ts'
import {
  parseTranscriptContent,
  seekVideo,
  getCurrentVideoId,
  saveTranscript,
  loadStoredTranscript,
  loadStoredTranscriptAsync,
  clearStoredTranscript,
  getStoredTargetLanguage,
  loadStoredTargetLanguageAsync,
  saveStoredTargetLanguage,
  getApifyToken,
  onApifyTokenChange,
  fetchTranscriptViaApify,
} from '../transcriptService.ts'
import { TIMING } from '../../shared/constants/index.ts'
import { useVideoId } from '../hooks/useVideoId.ts'
import { useActiveSegmentIndex } from '../hooks/useActiveSegmentIndex.ts'
import { useTranslation } from '../hooks/useTranslation.ts'
import { transcriptStore, useTranscriptStore } from '../store/transcriptStore.ts'
import { buildHighlightRegex } from './HighlightedText.tsx'

import { TranscriptHeader } from './transcript/TranscriptHeader.tsx'
import { TranslationActionBar } from './transcript/TranslationActionBar.tsx'
import { TranscriptSearchBar } from './transcript/TranscriptSearchBar.tsx'
import { TranscriptSettingsView } from './transcript/TranscriptSettingsView.tsx'
import { TranscriptDropzone } from './transcript/TranscriptDropzone.tsx'
import { TranscriptPasteDialog } from './transcript/TranscriptPasteDialog.tsx'
import { TranscriptList } from './transcript/TranscriptList.tsx'

const EMPTY_SEGMENTS: TranscriptSegment[] = []

export default function Transcript() {
  const videoId = useVideoId()
  const { transcriptData, showTranslation, isVideoOverlayEnabled } = useTranscriptStore()

  const [targetLang, setTargetLang] = useState<string>(() => getStoredTargetLanguage())
  const [searchQuery, setSearchQuery] = useState<string>('')
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Apify fetch state
  const [hasApifyToken, setHasApifyToken] = useState<boolean>(false)
  const [isApifyFetching, setIsApifyFetching] = useState<boolean>(false)
  const [apifyError, setApifyError] = useState<string | null>(null)

  // Paste dialog state
  const [isPasteOpen, setIsPasteOpen] = useState<boolean>(false)
  const [pasteInput, setPasteInput] = useState<string>('')
  const [parseError, setParseError] = useState<string | null>(null)

  const activeItemRef = useRef<HTMLDivElement | null>(null)
  const listContainerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Set transcript helper that updates the shared store
  const setTranscript = useCallback(
    (updater: TranscriptData | null | ((prev: TranscriptData | null) => TranscriptData | null)) => {
      const next = typeof updater === 'function' ? updater(transcriptStore.getSnapshot().transcriptData) : updater
      transcriptStore.setTranscriptData(next)
    },
    []
  )

  const setShowTrans = useCallback((show: boolean) => {
    transcriptStore.setShowTranslation(show)
  }, [])

  // Translation hook
  const {
    hasGeminiKey,
    activeEngine,
    setActiveEngine,
    isTranslating,
    translateProgress,
    translateError,
    setTranslateError,
    isTranslatedForCurrentLang,
    selectedLangObj,
    handleTranslateCadence,
    handleTranslateGemini,
  } = useTranslation({
    transcriptData,
    setTranscriptData: setTranscript,
    targetLang,
    setTargetLang,
    showTranslation,
    setShowTranslation: setShowTrans,
    videoId,
  })

  // Initial load of target language and stored transcript
  useEffect(() => {
    const id = getCurrentVideoId()
    if (id && !transcriptData) {
      const synchronous = loadStoredTranscript(id)
      if (synchronous) {
        setTranscript(synchronous)
        if (synchronous.targetLanguage) setTargetLang(synchronous.targetLanguage)
        if (synchronous.translationEngine) setActiveEngine(synchronous.translationEngine)
      } else {
        loadStoredTranscriptAsync(id).then((stored) => {
          if (stored && getCurrentVideoId() === id) {
            setTranscript(stored)
            if (stored.targetLanguage) setTargetLang(stored.targetLanguage)
            if (stored.translationEngine) setActiveEngine(stored.translationEngine)
          }
        })
      }
    }
    loadStoredTargetLanguageAsync().then((lang) => {
      if (lang) setTargetLang(lang)
    })
  }, [setTranscript, setActiveEngine])

  // Track Apify token presence
  useEffect(() => {
    getApifyToken().then((token) => setHasApifyToken(token.length > 0))
    return onApifyTokenChange((hasToken) => {
      setHasApifyToken(hasToken)
      if (hasToken) setApifyError(null)
    })
  }, [])

  // Video navigation reset
  const previousVideoIdRef = useRef<string>(videoId)
  useEffect(() => {
    if (!videoId || videoId === previousVideoIdRef.current) return
    previousVideoIdRef.current = videoId

    setParseError(null)
    setTranslateError(null)
    setApifyError(null)
    setIsPasteOpen(false)
    setIsSettingsOpen(false)

    const stored = loadStoredTranscript(videoId)
    if (stored) {
      setTranscript(stored)
      if (stored.targetLanguage) setTargetLang(stored.targetLanguage)
      if (stored.translationEngine) setActiveEngine(stored.translationEngine)
    } else {
      setTranscript(null)
      loadStoredTranscriptAsync(videoId).then((asyncStored) => {
        if (asyncStored && getCurrentVideoId() === videoId) {
          setTranscript(asyncStored)
          if (asyncStored.targetLanguage) setTargetLang(asyncStored.targetLanguage)
          if (asyncStored.translationEngine) setActiveEngine(asyncStored.translationEngine)
        }
      })
    }
  }, [videoId, setTranscript, setActiveEngine, setTranslateError])

  const segments = transcriptData?.segments || EMPTY_SEGMENTS
  const activeIndex = useActiveSegmentIndex(segments)

  // Smoothly auto-scroll to active item
  useEffect(() => {
    if (autoScroll && activeItemRef.current && listContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [activeIndex, autoScroll])

  // Search filter across both original and translated text
  const filteredSegments = useMemo(() => {
    if (!deferredSearchQuery.trim()) return segments
    const q = deferredSearchQuery.toLowerCase()
    return segments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        (showTranslation && s.translatedText && s.translatedText.toLowerCase().includes(q))
    )
  }, [segments, deferredSearchQuery, showTranslation])

  const highlightRegex = useMemo(() => buildHighlightRegex(deferredSearchQuery), [deferredSearchQuery])

  // Load raw content and save
  const handleLoadContent = useCallback(
    (raw: string, fileName?: string) => {
      const parsed = parseTranscriptContent(raw, fileName)
      if (!parsed.segments || parsed.segments.length === 0) {
        setParseError('No readable transcript lines or timestamps found.')
        return false
      }

      setTranscript(parsed)
      saveTranscript(videoId, parsed)
      setIsPasteOpen(false)
      setPasteInput('')
      setParseError(null)
      setTranslateError(null)
      setShowTrans(true)
      return true
    },
    [videoId, setTranscript, setTranslateError, setShowTrans]
  )

  // File Upload handling
  const handleFile = useCallback(
    (file: File) => {
      setParseError(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === 'string') {
          handleLoadContent(content, file.name)
        }
      }
      reader.onerror = () => setParseError('Failed to read file.')
      reader.readAsText(file)
    },
    [handleLoadContent]
  )

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    e.target.value = ''
  }

  // Apify Fetch
  const handleFetchViaApify = useCallback(async () => {
    const id = getCurrentVideoId()
    if (!id || isApifyFetching) return
    if (!hasApifyToken) {
      setApifyError('Add your Apify API token first: click the Cadence extension icon in your browser toolbar.')
      return
    }

    setIsApifyFetching(true)
    setApifyError(null)
    setParseError(null)
    setTranslateError(null)

    const result = await fetchTranscriptViaApify({
      videoId: id,
      useAnyAvailableCaptionLanguage: true,
    })

    if (getCurrentVideoId() !== id) {
      setIsApifyFetching(false)
      return
    }

    if (result.success && result.data) {
      setTranscript(result.data)
      saveTranscript(id, result.data)
      setShowTrans(true)
      setIsPasteOpen(false)
    } else {
      setApifyError(result.error || 'Failed to fetch the transcript via Apify.')
    }
    setIsApifyFetching(false)
  }, [hasApifyToken, isApifyFetching, setTranscript, setTranslateError, setShowTrans])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    } else {
      const text = e.dataTransfer.getData('text')
      if (text) {
        handleLoadContent(text, 'Pasted Transcript')
      }
    }
  }

  const handleClearTranscript = () => {
    clearStoredTranscript(videoId)
    setTranscript(null)
    setSearchQuery('')
    setParseError(null)
    setTranslateError(null)
  }

  const handleCopyTranscript = async () => {
    if (!transcriptData || segments.length === 0) return
    try {
      const textToCopy = segments
        .map((s) => {
          if (showTranslation && s.translatedText) {
            return `[${s.formattedTime}] ${s.text}\n   ↳ ${s.translatedText}`
          }
          return `[${s.formattedTime}] ${s.text}`
        })
        .join('\n\n')

      await navigator.clipboard.writeText(textToCopy)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), TIMING.copyStatusMs)
    } catch (e) {
      console.warn('Failed to copy transcript', e)
    }
  }

  const handleTargetLangChange = (newLang: string) => {
    setTargetLang(newLang)
    saveStoredTargetLanguage(newLang)
  }

  return (
    <div
      className={`yt-transcript-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".txt,.srt,.vtt,.json,.text,text/*"
        onChange={onFileInputChange}
      />

      {isSettingsOpen ? (
        <TranscriptSettingsView
          targetLang={targetLang}
          onTargetLangChange={handleTargetLangChange}
          activeEngine={activeEngine}
          onEngineChange={setActiveEngine}
          isVideoOverlayEnabled={isVideoOverlayEnabled}
          onToggleVideoOverlay={() => transcriptStore.setVideoOverlayEnabled(!isVideoOverlayEnabled)}
          autoScroll={autoScroll}
          onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
          hasSegments={segments.length > 0}
          isApifyFetching={isApifyFetching}
          isTranslating={isTranslating}
          onRefetchApify={handleFetchViaApify}
          onClearTranscript={handleClearTranscript}
          onCloseSettings={() => setIsSettingsOpen(false)}
        />
      ) : (
        <>
          <div className="yt-transcript-header">
            <TranscriptHeader
              segmentCount={segments.length}
              copyStatus={copyStatus}
              isCollapsed={isCollapsed}
              onCopy={handleCopyTranscript}
              onToggleSettings={() => setIsSettingsOpen(true)}
              onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {!isCollapsed && segments.length > 0 && (
              <TranslationActionBar
                segmentCount={segments.length}
                isTranslating={isTranslating}
                activeEngine={activeEngine}
                hasGeminiKey={hasGeminiKey}
                isTranslatedForCurrentLang={isTranslatedForCurrentLang}
                showTranslation={showTranslation}
                currentEngine={transcriptData?.translationEngine || 'cadence'}
                selectedLangName={selectedLangObj.name}
                translateProgress={translateProgress}
                onTranslateCadence={handleTranslateCadence}
                onTranslateGemini={handleTranslateGemini}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {translateError && (
              <div
                className="yt-transcript-error-badge"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} />
                  <span>{translateError}</span>
                </span>
                <button
                  type="button"
                  className="yt-error-dismiss-btn"
                  onClick={() => setTranslateError(null)}
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {apifyError && (
              <div
                className="yt-transcript-error-badge"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} />
                  <span>{apifyError}</span>
                </span>
                <button
                  type="button"
                  className="yt-error-dismiss-btn"
                  onClick={() => setApifyError(null)}
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {!isCollapsed && !isPasteOpen && segments.length > 0 && (
              <TranscriptSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            )}
          </div>

          {!isCollapsed && isPasteOpen && (
            <TranscriptPasteDialog
              pasteInput={pasteInput}
              parseError={parseError}
              onPasteInputChange={(val) => {
                setPasteInput(val)
                if (parseError) setParseError(null)
              }}
              onCancel={() => {
                setIsPasteOpen(false)
                setParseError(null)
              }}
              onSubmit={(e) => {
                e.preventDefault()
                if (!pasteInput.trim()) {
                  setParseError('Please paste your transcript content first.')
                  return
                }
                handleLoadContent(pasteInput, 'Pasted Transcript')
              }}
            />
          )}

          {!isCollapsed && !isPasteOpen && (
            <div className="yt-transcript-body" ref={listContainerRef}>
              {segments.length === 0 ? (
                <TranscriptDropzone
                  hasApifyToken={hasApifyToken}
                  isApifyFetching={isApifyFetching}
                  parseError={parseError}
                  onFetchApify={handleFetchViaApify}
                  onTriggerUpload={() => fileInputRef.current?.click()}
                  onOpenPaste={() => {
                    setIsPasteOpen(true)
                    setParseError(null)
                  }}
                />
              ) : (
                <TranscriptList
                  segments={segments}
                  filteredSegments={filteredSegments}
                  activeIndex={activeIndex}
                  showTranslation={showTranslation}
                  highlightRegex={highlightRegex}
                  searchQuery={searchQuery}
                  activeItemRef={activeItemRef}
                  listContainerRef={listContainerRef}
                  onSeek={seekVideo}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
