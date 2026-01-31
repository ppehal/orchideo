'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { SeverityIcon } from './severity-icon'
import type { TrendAlertData } from '@/types/trends'

interface AlertItemProps {
  alert: TrendAlertData
  onMarkRead?: () => void
}

export function AlertItem({ alert, onMarkRead }: AlertItemProps) {
  const handleClick = React.useCallback(() => {
    if (!alert.isRead && onMarkRead) {
      onMarkRead()
    }
  }, [alert.isRead, onMarkRead])

  return (
    <div
      className={cn(
        'hover:bg-muted flex items-start gap-3 px-3 py-2 transition-colors',
        !alert.isRead && 'bg-primary/5'
      )}
      role="button"
      onClick={handleClick}
    >
      <SeverityIcon severity={alert.severity} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', !alert.isRead && 'font-medium')}>{alert.message}</p>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <Link
            href={`/trends?page=${alert.pageId}`}
            className="hover:text-foreground truncate hover:underline"
          >
            {alert.pageName}
          </Link>
          <span>·</span>
          <span>
            {formatDistanceToNow(new Date(alert.createdAt), {
              addSuffix: true,
              locale: cs,
            })}
          </span>
        </div>
      </div>
      {!alert.isRead && (
        <span className="bg-primary mt-1 h-2 w-2 shrink-0 rounded-full" aria-label="Nepřečteno" />
      )}
    </div>
  )
}
