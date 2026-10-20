// Cadence - Typed CustomEvent Helpers
// Standardizes dispatching and listening for content-script events.

export function emitCustomEvent<T = unknown>(eventName: string, detail?: T): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

export function onCustomEvent<T = unknown>(
  eventName: string,
  handler: (detail: T, event: CustomEvent<T>) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const listener = (e: Event) => {
    const customEvt = e as CustomEvent<T>
    handler(customEvt.detail, customEvt)
  }

  window.addEventListener(eventName, listener)
  return () => window.removeEventListener(eventName, listener)
}
