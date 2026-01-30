'use client'

import { useState, useEffect, useCallback } from 'react'

export interface FacebookPageItem {
  id: string
  name: string
  category: string | null
  picture_url: string | null
  tasks: string[]
}

interface UseFbPagesResult {
  pages: FacebookPageItem[]
  isLoading: boolean
  error: string | null
  errorCode: string | null
  refetch: () => Promise<void>
}

export function useFbPages(): UseFbPagesResult {
  const [pages, setPages] = useState<FacebookPageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const fetchPages = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const response = await fetch('/api/facebook/pages')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Neznámá chyba')
        setErrorCode(data.code || null)
        setPages([])
        return
      }

      setPages(data.pages || [])
    } catch (err) {
      console.error('[useFbPages]', err)
      setError('Nepodařilo se načíst stránky')
      setErrorCode('NETWORK_ERROR')
      setPages([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  return {
    pages,
    isLoading,
    error,
    errorCode,
    refetch: fetchPages,
  }
}
