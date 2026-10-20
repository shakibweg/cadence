// Cadence - Chrome Storage Utility
// Safe, promise-based helper around chrome.storage.local with environment checks.

export function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

export async function storageGet<T = unknown>(key: string): Promise<T | undefined> {
  if (!hasChromeStorage()) return undefined
  try {
    const res = await chrome.storage.local.get(key)
    return res?.[key] as T | undefined
  } catch (err) {
    console.warn(`[Cadence] Error reading key "${key}" from storage:`, err)
    return undefined
  }
}

export async function storageGetMultiple<T extends Record<string, unknown>>(
  keys: string[]
): Promise<Partial<T>> {
  if (!hasChromeStorage()) return {}
  try {
    return (await chrome.storage.local.get(keys)) as Partial<T>
  } catch (err) {
    console.warn('[Cadence] Error reading multiple keys from storage:', err)
    return {}
  }
}

export async function storageSet(items: Record<string, unknown>): Promise<void> {
  if (!hasChromeStorage()) return
  try {
    await chrome.storage.local.set(items)
  } catch (err) {
    console.warn('[Cadence] Error saving to storage:', err)
  }
}

export async function storageRemove(keyOrKeys: string | string[]): Promise<void> {
  if (!hasChromeStorage()) return
  try {
    await chrome.storage.local.remove(keyOrKeys)
  } catch (err) {
    console.warn(`[Cadence] Error removing from storage:`, err)
  }
}

export function onStorageKeyChange(
  key: string,
  callback: (newValue: unknown, oldValue: unknown) => void
): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return () => {}
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local' || !changes[key]) return
    callback(changes[key].newValue, changes[key].oldValue)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
