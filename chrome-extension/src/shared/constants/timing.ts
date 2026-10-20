// Cadence - Timing values (ms)

export const TIMING = {
  /** Trailing debounce for the DOM mutation observer that keeps injected UI attached. */
  observerDebounceMs: 250,
  /** Extra re-injection attempts after a YouTube SPA navigation finishes. */
  reinjectDelaysMs: [200, 700, 1500],
  /** Delay before re-injecting after `yt-page-data-updated`. */
  pageDataReinjectMs: 300,
  /** Delay before re-injecting after `popstate`. */
  popstateReinjectMs: 200,
  /** Delay before scrolling the panel into view after it opens. */
  panelScrollDelayMs: 60,
  /** How long the panel highlight lasts after opening. */
  panelHighlightMs: 1500,
  /** How long the "copied" state of the copy button is shown. */
  copyStatusMs: 2000,
  /** Debounce applied to the transcript search input. */
  searchDebounceMs: 150,
} as const
