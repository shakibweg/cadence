// Cadence - In-Memory Content Script State Store
// Replaces heavy DOM CustomEvents with a unified, lightweight external store
// shared between Transcript panel and VideoOverlay.

import { useSyncExternalStore } from 'react'
import type { TranscriptData } from '../types.ts'
import { EVENTS, STORAGE_KEYS } from '../../shared/constants/index.ts'
import { storageGet, storageSet } from '../../shared/storage/index.ts'

interface TranscriptStoreState {
  transcriptData: TranscriptData | null
  showTranslation: boolean
  isVideoOverlayEnabled: boolean
}

let state: TranscriptStoreState = {
  transcriptData: null,
  showTranslation: true,
  isVideoOverlayEnabled: (() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.videoOverlayEnabled) === 'true'
    } catch {
      return false
    }
  })(),
}

// Initial async load of persisted preferences
storageGet<boolean>(STORAGE_KEYS.showTranslation).then((val) => {
  if (typeof val === 'boolean') {
    state = { ...state, showTranslation: val }
    emitChange()
  }
})
storageGet<boolean>(STORAGE_KEYS.videoOverlayEnabled).then((val) => {
  if (typeof val === 'boolean') {
    state = { ...state, isVideoOverlayEnabled: val }
    emitChange()
  }
})

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
  // Also dispatch window CustomEvents for backward compatibility or external listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENTS.transcriptUpdated, {
        detail: { transcriptData: state.transcriptData, showTranslation: state.showTranslation },
      })
    )
  }
}

export const transcriptStore = {
  getSnapshot(): TranscriptStoreState {
    return state
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  setTranscriptData(data: TranscriptData | null) {
    state = { ...state, transcriptData: data }
    emitChange()
  },

  setShowTranslation(show: boolean) {
    state = { ...state, showTranslation: show }
    storageSet({ [STORAGE_KEYS.showTranslation]: show }).catch(() => {})
    try {
      localStorage.setItem(STORAGE_KEYS.showTranslation, String(show))
    } catch {}
    emitChange()
  },

  setVideoOverlayEnabled(enabled: boolean) {
    state = { ...state, isVideoOverlayEnabled: enabled }
    storageSet({ [STORAGE_KEYS.videoOverlayEnabled]: enabled }).catch(() => {})
    try {
      localStorage.setItem(STORAGE_KEYS.videoOverlayEnabled, String(enabled))
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(EVENTS.overlayToggle, {
          detail: { enabled },
        })
      )
    }
    emitChange()
  },
}

export function useTranscriptStore(): TranscriptStoreState {
  return useSyncExternalStore(transcriptStore.subscribe, transcriptStore.getSnapshot)
}
