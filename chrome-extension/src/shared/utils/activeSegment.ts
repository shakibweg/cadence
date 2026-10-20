// Cadence - Active subtitle lookup

interface TimedSegment {
  start: number
  dur: number
}

/** Fallback duration (seconds) for the last segment when it has no duration. */
const DEFAULT_LAST_SEGMENT_DURATION = 4

/**
 * Index of the segment that is playing at `time`, or -1 when none is.
 * Segments must be ordered by `start`. O(log n) instead of scanning the whole list.
 *
 * A segment is active from its own `start` until the next segment starts
 * (or `start + dur` for the last one).
 */
export function findActiveSegmentIndex(segments: readonly TimedSegment[], time: number): number {
  let lo = 0
  let hi = segments.length - 1
  let found = -1

  // Last segment whose start <= time
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid].start <= time) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  if (found === -1) return -1

  if (found === segments.length - 1) {
    const last = segments[found]
    const end = last.start + (last.dur || DEFAULT_LAST_SEGMENT_DURATION)
    return time < end ? found : -1
  }

  return found
}
