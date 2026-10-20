// Cadence - Transcript List Component
import React from 'react'
import type { TranscriptSegment } from '../../types.ts'
import TranscriptRow from '../TranscriptRow.tsx'

interface TranscriptListProps {
  segments: TranscriptSegment[]
  filteredSegments: TranscriptSegment[]
  activeIndex: number
  showTranslation: boolean
  highlightRegex: RegExp | null
  searchQuery: string
  activeItemRef: React.RefObject<HTMLDivElement | null>
  listContainerRef: React.RefObject<HTMLDivElement | null>
  onSeek: (time: number) => void
}

export const TranscriptList: React.FC<TranscriptListProps> = ({
  segments,
  filteredSegments,
  activeIndex,
  showTranslation,
  highlightRegex,
  searchQuery,
  activeItemRef,
  listContainerRef,
  onSeek,
}) => {
  if (filteredSegments.length === 0) {
    return (
      <div className="yt-transcript-status-msg">
        No lines matching "{searchQuery}"
      </div>
    )
  }

  return (
    <div className="yt-transcript-list" ref={listContainerRef}>
      {filteredSegments.map((segment) => {
        const isActive = segments[activeIndex] === segment
        return (
          <TranscriptRow
            key={`${segment.start}-${segment.formattedTime}-${segment.text.slice(0, 15)}`}
            segment={segment}
            isActive={isActive}
            showTranslation={showTranslation}
            highlightRegex={highlightRegex}
            activeItemRef={activeItemRef}
            onSeek={onSeek}
          />
        )
      })}
    </div>
  )
}
