// Cadence - Secret & Preference Store Factory
import { onStorageKeyChange, storageGet, storageRemove, storageSet } from './chromeStorage.ts'

export interface SecretStore<T = string> {
  get: () => Promise<T>
  set: (val: T) => Promise<void>
  clear: () => Promise<void>
  onChange: (callback: (hasValue: boolean, val?: T) => void) => () => void
}

/**
 * Creates a type-safe secret or preference store backed by chrome.storage.local.
 */
export function createSecretStore<T = string>(
  storageKey: string,
  defaultValue: T = '' as unknown as T
): SecretStore<T> {
  return {
    async get(): Promise<T> {
      const val = await storageGet<T>(storageKey)
      if (typeof val === 'string') {
        const trimmed = (val as string).trim()
        return (trimmed || defaultValue) as T
      }
      return val ?? defaultValue
    },

    async set(val: T): Promise<void> {
      const toSave = typeof val === 'string' ? ((val as string).trim() as unknown as T) : val
      await storageSet({ [storageKey]: toSave })
    },

    async clear(): Promise<void> {
      await storageRemove(storageKey)
    },

    onChange(callback: (hasValue: boolean, val?: T) => void): () => void {
      return onStorageKeyChange(storageKey, (newValue) => {
        const hasVal = typeof newValue === 'string' ? newValue.trim().length > 0 : Boolean(newValue)
        callback(hasVal, newValue as T | undefined)
      })
    },
  }
}
