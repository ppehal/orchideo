'use client'

import { useState, useCallback } from 'react'

interface UseCopyToClipboardReturn {
  copied: boolean
  copy: (text: string) => Promise<boolean>
  reset: () => void
}

export function useCopyToClipboard(resetDelay = 2000): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false)

  const reset = useCallback(() => {
    setCopied(false)
  }, [])

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn('[useCopyToClipboard] Clipboard API not available')
        return false
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)

        // Auto-reset after delay
        if (resetDelay > 0) {
          setTimeout(() => {
            setCopied(false)
          }, resetDelay)
        }

        return true
      } catch (error) {
        console.error('[useCopyToClipboard] Failed to copy:', error)
        setCopied(false)
        return false
      }
    },
    [resetDelay]
  )

  return { copied, copy, reset }
}
