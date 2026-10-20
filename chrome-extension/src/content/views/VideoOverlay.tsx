// Cadence - Video Player Subtitle Overlay Component
// Displays synchronized transcript and bilingual translations directly on top of the YouTube video player.

import { useVideoId } from '../hooks/useVideoId.ts'
import { useActiveSegmentIndex } from '../hooks/useActiveSegmentIndex.ts'
import { useTranscriptStore } from '../store/transcriptStore.ts'

export default function VideoOverlay() {
  // Subscribes directly to videoId and shared in-memory transcript store
  useVideoId()
  const { transcriptData, showTranslation, isVideoOverlayEnabled } = useTranscriptStore()

  // Identify currently active segment (re-renders only when the active line changes)
  const segments = transcriptData?.segments
  const activeIndex = useActiveSegmentIndex(segments ?? [])
  const activeSegment = segments && activeIndex >= 0 ? segments[activeIndex] : null

  // If overlay is disabled or there is no active speech segment, render nothing
  if (!isVideoOverlayEnabled || !activeSegment) {
    return null
  }

  const hasTranslation = showTranslation && Boolean(activeSegment.translatedText)

  return (
    <div className="cadence-video-subtitle-card" role="status" aria-live="polite">
      <div className="cadence-sub-line-orig">{activeSegment.text}</div>
      {hasTranslation && (
        <div className="cadence-sub-line-trans">{activeSegment.translatedText}</div>
      )}
    </div>
  )
}
