// Cadence - Background Messaging Client
// Type-safe wrapper for chrome.runtime.sendMessage with clear error handling.

import type { BackgroundRequest } from '../types/messages.ts'

export async function sendBackgroundMessage<TResponse>(
  message: BackgroundRequest
): Promise<TResponse> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('Chrome runtime extension API is not available in this context.')
  }

  return new Promise<TResponse>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const lastError = chrome.runtime.lastError
      if (lastError) {
        reject(new Error(lastError.message || 'Unknown Chrome runtime error'))
        return
      }
      resolve(response as TResponse)
    })
  })
}
