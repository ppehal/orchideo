'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCard } from '@/components/alerts'
import { useAlerts } from '@/hooks/use-alerts'

export function AlertsClient() {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead } = useAlerts()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-12 w-12" />}
        title="Žádná upozornění"
        description="Upozornění se objeví při výrazných změnách vašich stránek."
        action={
          <Button asChild>
            <Link href="/analyze">Spustit analýzu</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{unreadCount} nepřečtených upozornění</p>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Označit vše jako přečtené
          </Button>
        </div>
      )}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onMarkRead={() => markAsRead(alert.id)} />
        ))}
      </div>
    </div>
  )
}
