import { useSyncExternalStore } from 'react'
import { YT_EVENTS } from '../../shared/constants/index.ts'

export type YouTubeTheme = 'light' | 'dark'

export function getYouTubeTheme(): YouTubeTheme {
  const html = document.documentElement

  // 1. Direct dark attribute check on <html> or <ytd-app>
  // Note: NEVER check 'darker-dark-theme' or 'darker-dark-theme-deprecate',
  // because YouTube includes those typography/experiment tokens in both light and dark modes!
  // YouTube uses the exact boolean attribute 'dark' (e.g. <html dark> or <ytd-app dark>)
  if (
    html.hasAttribute('dark') ||
    html.getAttribute('dark') === 'true' ||
    html.getAttribute('theme') === 'dark' ||
    Boolean(document.querySelector('ytd-app[dark]'))
  ) {
    return 'dark'
  }

  // 2. Computed text color check
  // In YouTube Light Theme: text color is near-black (#0f0f0f / rgb(15, 15, 15))
  // In YouTube Dark Theme: text color is near-white (#f1f1f1 / rgb(241, 241, 241))
  try {
    const targetEl = document.querySelector('ytd-app') || document.body || html
    const computed = window.getComputedStyle(targetEl)
    const textColor = computed.color
    const textMatch = textColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (textMatch) {
      const r = parseInt(textMatch[1], 10)
      const g = parseInt(textMatch[2], 10)
      const b = parseInt(textMatch[3], 10)
      const textLum = 0.299 * r + 0.587 * g + 0.114 * b
      if (textLum > 170) {
        return 'dark'
      }
      if (textLum < 90) {
        return 'light'
      }
    }

    // 3. Computed background color fallback (only if opacity is solid)
    const bg = computed.backgroundColor
    const bgMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (bgMatch) {
      const alpha = bgMatch[4] !== undefined ? parseFloat(bgMatch[4]) : 1
      if (alpha > 0.5) {
        const br = parseInt(bgMatch[1], 10)
        const bg_val = parseInt(bgMatch[2], 10)
        const bb = parseInt(bgMatch[3], 10)
        const bgLum = 0.299 * br + 0.587 * bg_val + 0.114 * bb
        return bgLum < 128 ? 'dark' : 'light'
      }
    }
  } catch {
    // Ignore error
  }

  return 'light'
}

// -------------------------------------------------------------
// Shared theme store: one observer for every component that uses the hook
// -------------------------------------------------------------

const THEME_ATTRIBUTES = ['dark', 'darker-dark-theme', 'darker-dark-theme-deprecate', 'theme', 'color-version']
const THEME_REFRESH_EVENTS = [YT_EVENTS.navigateFinish, YT_EVENTS.pageDataUpdated, YT_EVENTS.popstate]

let currentTheme: YouTubeTheme | null = null
const listeners = new Set<() => void>()
let teardown: (() => void) | null = null

function refreshTheme(): void {
  const next = getYouTubeTheme()
  if (next === currentTheme) return
  currentTheme = next
  listeners.forEach((listener) => listener())
}

function startWatching(): void {
  const observer = new MutationObserver(refreshTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: THEME_ATTRIBUTES })

  // <ytd-app> may not exist yet when the first subscriber mounts
  const ytdApp = document.querySelector('ytd-app')
  if (ytdApp) {
    observer.observe(ytdApp, { attributes: true, attributeFilter: ['dark'] })
  }

  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  media?.addEventListener('change', refreshTheme)
  THEME_REFRESH_EVENTS.forEach((name) => window.addEventListener(name, refreshTheme))

  teardown = () => {
    observer.disconnect()
    media?.removeEventListener('change', refreshTheme)
    THEME_REFRESH_EVENTS.forEach((name) => window.removeEventListener(name, refreshTheme))
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    startWatching()
    refreshTheme()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && teardown) {
      teardown()
      teardown = null
    }
  }
}

function getSnapshot(): YouTubeTheme {
  if (currentTheme === null) currentTheme = getYouTubeTheme()
  return currentTheme
}

export function useYouTubeTheme(): YouTubeTheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light')
}
