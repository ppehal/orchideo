'use client'

import * as React from 'react'
import { toast } from 'sonner'
import type { TrendAlertData, UserAlertsResponse } from '@/types/trends'

interface UseAlertsReturn {
  alerts: TrendAlertData[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (alertId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useAlerts(): UseAlertsReturn {
  const [data, setData] = React.useState<UserAlertsResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchAlerts = React.useCallback(async () => {
    // Only fetch when tab is visible
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }

    try {
      const res = await fetch('/api/user/alerts?limit=50', {
        signal: AbortSignal.timeout(10000),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!res.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const json = (await res.json()) as UserAlertsResponse
      setData(json)
    } catch (error) {
      console.error('[useAlerts] fetch failed', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch + polling every 60s
  React.useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000)

    // Resume polling on tab visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAlerts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchAlerts])

  // Optimistic mark as read
  const markAsRead = React.useCallback(
    async (alertId: string) => {
      // Find if alert exists and is unread
      const alert = data?.alerts.find((a) => a.id === alertId)
      const wasUnread = alert && !alert.isRead

      // Optimistic update
      setData((prev) =>
        prev
          ? {
              ...prev,
              alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
              unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
            }
          : null
      )

      try {
        const res = await fetch(`/api/user/alerts/${alertId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true }),
          signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) {
          throw new Error('Failed to mark as read')
        }
      } catch {
        // Revert on error
        await fetchAlerts()
        toast.error('Nepodařilo se označit jako přečtené')
      }
    },
    [data?.alerts, fetchAlerts]
  )

  const markAllAsRead = React.useCallback(async () => {
    // Optimistic update
    setData((prev) =>
      prev
        ? {
            ...prev,
            alerts: prev.alerts.map((a) => ({ ...a, isRead: true })),
            unreadCount: 0,
          }
        : null
    )

    try {
      const res = await fetch('/api/user/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        throw new Error('Failed to mark all as read')
      }
    } catch {
      // Revert on error
      await fetchAlerts()
      toast.error('Nepodařilo se označit všechny jako přečtené')
    }
  }, [fetchAlerts])

  return {
    alerts: data?.alerts ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchAlerts,
  }
}
