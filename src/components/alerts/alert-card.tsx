'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeverityIcon } from './severity-icon'
import type { TrendAlertData } from '@/types/trends'

interface AlertCardProps {
  alert: TrendAlertData
  onMarkRead?: () => void
}

export function AlertCard({ alert, onMarkRead }: AlertCardProps) {
  const handleMarkRead = React.useCallback(() => {
    if (!alert.isRead && onMarkRead) {
      onMarkRead()
    }
  }, [alert.isRead, onMarkRead])

  return (
    <Card className={cn(!alert.isRead && 'border-primary/30 bg-primary/5')}>
      <CardContent className="flex items-start gap-4 p-4">
        <SeverityIcon severity={alert.severity} className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm', !alert.isRead && 'font-medium')}>{alert.message}</p>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Link
              href={`/trends?page=${alert.pageId}`}
              className="hover:text-foreground hover:underline"
            >
              {alert.pageName}
            </Link>
            <span>
              {formatDistanceToNow(new Date(alert.createdAt), {
                addSuffix: true,
                locale: cs,
              })}
            </span>
          </div>
        </div>
        {!alert.isRead && (
          <Button variant="ghost" size="sm" onClick={handleMarkRead} className="shrink-0">
            Označit jako přečtené
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
