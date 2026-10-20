// Cadence - Single transcript row. Memoized so playback only re-renders the rows whose
// `isActive` flag flips, instead of the whole list on every video time update.
import { memo } from 'react'
import type { RefObject } from 'react'
import { CornerDownRight } from 'lucide-react'
import type { TranscriptSegment } from '../types.ts'
import HighlightedText from './HighlightedText.tsx'

interface TranscriptRowProps {
  segment: TranscriptSegment
  isActive: boolean
  showTranslation: boolean
  /** Case-insensitive regex with one capture group, or null when there is no search query. */
  highlightRegex: RegExp | null
  activeItemRef: RefObject<HTMLDivElement | null>
  onSeek: (time: number) => void
}

function TranscriptRow({ segment, isActive, showTranslation, highlightRegex, activeItemRef, onSeek }: TranscriptRowProps) {
  return (
    <div
      ref={isActive ? activeItemRef : null}
      className={`yt-transcript-item ${isActive ? 'active' : ''}`}
      onClick={() => onSeek(segment.start)}
    >
      <button
        type="button"
        className="yt-transcript-timestamp"
        onClick={(e) => {
          e.stopPropagation()
          onSeek(segment.start)
        }}
        title={`Jump to ${segment.formattedTime}`}
      >
        {segment.formattedTime}
      </button>

      <div className="yt-transcript-content-rows">
        <div className="yt-transcript-row-original">
          <HighlightedText text={segment.text} regex={highlightRegex} />
        </div>

        {showTranslation && segment.translatedText && (
          <div className="yt-transcript-row-translation">
            <CornerDownRight size={13} className="yt-transcript-arrow" aria-hidden="true" />
            <span className="yt-transcript-translation-text">
              <HighlightedText text={segment.translatedText} regex={highlightRegex} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(TranscriptRow)
