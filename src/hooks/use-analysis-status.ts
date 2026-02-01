'use client'

import { useState, useEffect, useCallback } from 'react'
import { CLIENT_FETCH_TIMEOUT_MS } from '@/lib/config/timeouts'
import type { AnalysisStatus } from '@/generated/prisma/enums'

interface AnalysisStatusData {
  status: AnalysisStatus
  progress?: number
  errorCode?: string | null
  errorTitle?: string | null
  errorMessage?: string | null
}

interface UseAnalysisStatusOptions {
  /** Polling interval in milliseconds (default: 2500) */
  pollingInterval?: number
  /** Whether to poll automatically (default: true) */
  enabled?: boolean
  /** Callback when analysis completes */
  onComplete?: () => void
  /** Callback when analysis fails */
  onError?: (error: string) => void
}

interface UseAnalysisStatusReturn {
  status: AnalysisStatus | null
  progress: number
  isLoading: boolean
  error: string | null
  errorTitle: string | null
  refetch: () => Promise<void>
}

export function useAnalysisStatus(
  analysisId: string | null,
  options: UseAnalysisStatusOptions = {}
): UseAnalysisStatusReturn {
  const { pollingInterval = 2500, enabled = true, onComplete, onError } = options

  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!analysisId) return

    try {
      const response = await fetch(`/api/analysis/${analysisId}/status`, {
        signal: AbortSignal.timeout(CLIENT_FETCH_TIMEOUT_MS),
      })
      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Nepodařilo se získat stav analýzy')
        onError?.(data.error || 'Nepodařilo se získat stav analýzy')
        return
      }

      const statusData = data.data as AnalysisStatusData
      setStatus(statusData.status)
      setProgress(statusData.progress ?? 0)

      // Handle error state
      if (statusData.status === 'FAILED') {
        setErrorTitle(statusData.errorTitle ?? 'Analýza selhala')
        setError(statusData.errorMessage ?? 'Při analýze nastala chyba.')
        onError?.(statusData.errorMessage ?? 'Analýza selhala')
      } else {
        setErrorTitle(null)
        setError(null)
      }

      // Check if completed
      if (statusData.status === 'COMPLETED') {
        onComplete?.()
      }
    } catch (err) {
      console.error('[useAnalysisStatus]', err)
      setError('Chyba připojení')
    } finally {
      setIsLoading(false)
    }
  }, [analysisId, onComplete, onError])

  useEffect(() => {
    if (!analysisId || !enabled) {
      setIsLoading(false)
      return
    }

    // Initial fetch
    fetchStatus()

    // Set up polling for non-terminal states
    const shouldPoll =
      status === null ||
      status === 'PENDING' ||
      status === 'COLLECTING_DATA' ||
      status === 'ANALYZING'

    if (!shouldPoll) return

    const intervalId = setInterval(fetchStatus, pollingInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [analysisId, enabled, status, pollingInterval, fetchStatus])

  return {
    status,
    progress,
    isLoading,
    error,
    errorTitle,
    refetch: fetchStatus,
  }
}
