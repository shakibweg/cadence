// Cadence - Index of the subtitle that is currently playing.
// Only triggers a re-render when the active line actually changes (not on every `timeupdate`).
import { useEffect, useRef, useState } from 'react'
import type { TranscriptSegment } from '../types.ts'
import { findActiveSegmentIndex } from '../../shared/utils/activeSegment.ts'
import { YT_EVENTS } from '../../shared/constants/index.ts'
import { useVideoId } from './useVideoId.ts'

const VIDEO_EVENTS = ['timeupdate', 'seeked', 'loadedmetadata'] as const
/** The <video> element may not exist yet right after navigation; retry a few times. */
const VIDEO_LOOKUP_RETRY_MS = 500
const VIDEO_LOOKUP_MAX_RETRIES = 20

export function useActiveSegmentIndex(segments: readonly TranscriptSegment[]): number {
  const videoId = useVideoId()
  const [index, setIndex] = useState<number>(-1)
  const segmentsRef = useRef(segments)
  const updateRef = useRef<() => void>(() => {})

  // Recompute immediately when the transcript itself changes (e.g. loaded / translated)
  useEffect(() => {
    segmentsRef.current = segments
    updateRef.current()
  }, [segments])

  useEffect(() => {
    let video: HTMLVideoElement | null = null
    let retryTimer: number | undefined
    let retries = 0

    const update = () => {
      const time = video ? video.currentTime : 0
      const next = findActiveSegmentIndex(segmentsRef.current, time)
      setIndex((prev) => (prev === next ? prev : next))
    }
    updateRef.current = update

    const detach = () => {
      if (!video) return
      for (const name of VIDEO_EVENTS) video.removeEventListener(name, update)
      video = null
    }

    const attach = () => {
      window.clearTimeout(retryTimer)
      const found = document.querySelector<HTMLVideoElement>('video')
      if (!found) {
        if (retries++ < VIDEO_LOOKUP_MAX_RETRIES) {
          retryTimer = window.setTimeout(attach, VIDEO_LOOKUP_RETRY_MS)
        }
        return
      }
      if (found === video) return
      detach()
      video = found
      for (const name of VIDEO_EVENTS) found.addEventListener(name, update)
      update()
    }

    const reattach = () => {
      retries = 0
      attach()
    }

    attach()
    window.addEventListener(YT_EVENTS.navigateFinish, reattach)
    window.addEventListener(YT_EVENTS.pageDataUpdated, reattach)

    return () => {
      window.clearTimeout(retryTimer)
      window.removeEventListener(YT_EVENTS.navigateFinish, reattach)
      window.removeEventListener(YT_EVENTS.pageDataUpdated, reattach)
      detach()
      updateRef.current = () => {}
    }
  }, [videoId])

  return index
}
