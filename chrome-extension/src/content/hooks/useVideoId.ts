// Cadence - Current YouTube video ID, driven by navigation events (no polling)
import { useSyncExternalStore } from 'react'
import { getCurrentVideoId } from '../services/timeUtils.ts'
import { YT_EVENTS } from '../../shared/constants/index.ts'

const NAV_EVENTS = [YT_EVENTS.navigateFinish, YT_EVENTS.pageDataUpdated, YT_EVENTS.popstate]

function subscribe(onChange: () => void): () => void {
  NAV_EVENTS.forEach((name) => window.addEventListener(name, onChange))
  return () => NAV_EVENTS.forEach((name) => window.removeEventListener(name, onChange))
}

/** Returns the current video ID (empty string when not on a video). Re-renders only when it changes. */
export function useVideoId(): string {
  return useSyncExternalStore(subscribe, getCurrentVideoId, () => '')
}
