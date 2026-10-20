// Cadence - Open External URL Helper
// Safely opens external links in a new tab using chrome.tabs or window.open fallback.

export function openExternalUrl(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url })
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
