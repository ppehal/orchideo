'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AlertItem } from '@/components/alerts/alert-item'
import { useAlerts } from '@/hooks/use-alerts'

export function AlertsDropdown() {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead } = useAlerts()
  const recentAlerts = React.useMemo(() => alerts.filter((a) => !a.isRead).slice(0, 5), [alerts])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
              aria-label={`${unreadCount} nepřečtených upozornění`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Upozornění</span>
          {/* Screen reader announcement for unread count changes */}
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {unreadCount === 0
              ? 'Žádná nepřečtená upozornění'
              : unreadCount === 1
                ? '1 nepřečtené upozornění'
                : unreadCount <= 4
                  ? `${unreadCount} nepřečtená upozornění`
                  : `${unreadCount} nepřečtených upozornění`}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 md:w-96">
        <div className="flex items-center justify-between p-2">
          <span className="font-medium">Upozornění</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto px-2 py-1 text-xs"
              onClick={markAllAsRead}
            >
              Označit vše jako přečtené
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-sm">Žádná nová upozornění</div>
        ) : (
          <div
            className="max-h-80 overflow-y-auto"
            role="region"
            aria-live="polite"
            aria-atomic="false"
          >
            {recentAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} onMarkRead={() => markAsRead(alert.id)} />
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/alerts" className="justify-center">
            Zobrazit všechny
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
