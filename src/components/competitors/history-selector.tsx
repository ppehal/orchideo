'use client'

import { Clock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils/date-utils'
import type { ComparisonResult } from '@/lib/services/competitors'

export interface HistoryItem {
  id: string
  createdAt: string
  data: ComparisonResult
}

interface HistorySelectorProps {
  history: HistoryItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  isLoading: boolean
}

export function HistorySelector({
  history,
  selectedId,
  onSelect,
  isLoading,
}: HistorySelectorProps) {
  if (isLoading) {
    return <Skeleton className="h-10 w-full sm:w-[220px]" />
  }

  return (
    <Select
      value={selectedId ?? 'current'}
      onValueChange={(v) => onSelect(v === 'current' ? null : v)}
    >
      <SelectTrigger className="w-full sm:w-[220px]">
        <SelectValue placeholder="Vyberte snapshot" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="current">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aktuální stav
          </div>
        </SelectItem>

        {history.length > 0 && (
          <>
            <SelectSeparator />
            {history.map((item) => (
              <SelectItem key={item.id} value={item.id} className="min-h-[44px]">
                {formatDateTime(item.createdAt)}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  )
}
