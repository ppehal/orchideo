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

type OptimisticAction =
  | { type: 'MARK_AS_READ'; alertId: string }
  | { type: 'MARK_ALL_AS_READ' }

export function useAlerts(): UseAlertsReturn {
  const [data, setData] = React.useState<UserAlertsResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // React 19 useOptimistic for automatic optimistic updates with revert
  const [optimisticData, updateOptimisticData] = React.useOptimistic(
    data,
    (state, action: OptimisticAction) => {
      if (!state) return null

      switch (action.type) {
        case 'MARK_AS_READ': {
          const alert = state.alerts.find((a) => a.id === action.alertId)
          const wasUnread = alert && !alert.isRead

          return {
            ...state,
            alerts: state.alerts.map((a) =>
              a.id === action.alertId ? { ...a, isRead: true } : a
            ),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          }
        }
        case 'MARK_ALL_AS_READ':
          return {
            ...state,
            alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
            unreadCount: 0,
          }
        default:
          return state
      }
    }
  )

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

  // Optimistic mark as read - React 19 useOptimistic handles revert automatically
  const markAsRead = React.useCallback(
    async (alertId: string) => {
      // Apply optimistic update
      React.startTransition(() => {
        updateOptimisticData({ type: 'MARK_AS_READ', alertId })
      })

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

        // Update actual state on success
        await fetchAlerts()
      } catch (error) {
        // Show error toast
        toast.error('Nepodařilo se označit jako přečtené')
        // Re-throw to trigger useOptimistic automatic revert
        throw error
      }
    },
    [updateOptimisticData, fetchAlerts]
  )

  const markAllAsRead = React.useCallback(async () => {
    // Apply optimistic update
    React.startTransition(() => {
      updateOptimisticData({ type: 'MARK_ALL_AS_READ' })
    })

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

      // Update actual state on success
      await fetchAlerts()
    } catch (error) {
      // Show error toast
      toast.error('Nepodařilo se označit všechny jako přečtené')
      // Re-throw to trigger useOptimistic automatic revert
      throw error
    }
  }, [updateOptimisticData, fetchAlerts])

  return {
    alerts: optimisticData?.alerts ?? [],
    unreadCount: optimisticData?.unreadCount ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchAlerts,
  }
}
