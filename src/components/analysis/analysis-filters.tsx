'use client'

import { Loader2 } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ANALYSIS_STATUS_OPTIONS } from '@/lib/constants/analysis-progress'
import { cn } from '@/lib/utils'

interface Page {
  id: string
  name: string
}

interface AnalysisFiltersProps {
  pages: Page[]
  selectedStatus: string
  selectedPageId: string
  selectedSort: string
  onStatusChange: (status: string) => void
  onPageChange: (pageId: string) => void
  onSortChange: (sort: string) => void
  isPending?: boolean
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nejnovější' },
  { value: 'oldest', label: 'Nejstarší' },
  { value: 'best', label: 'Nejlepší skóre' },
  { value: 'worst', label: 'Nejhorší skóre' },
] as const

export function AnalysisFilters({
  pages,
  selectedStatus,
  selectedPageId,
  selectedSort,
  onStatusChange,
  onPageChange,
  onSortChange,
  isPending = false,
}: AnalysisFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Loading indicator during transition */}
      {isPending && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>Načítání...</span>
        </div>
      )}
      {/* Page filter */}
      {pages.length > 0 && (
        <Select value={selectedPageId || 'ALL'} onValueChange={onPageChange} disabled={isPending}>
          <SelectTrigger className={cn('w-full sm:w-[200px]', isPending && 'opacity-50')}>
            <SelectValue placeholder="Vyberte stránku" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Všechny stránky</SelectItem>
            {pages.map((page) => (
              <SelectItem key={page.id} value={page.id}>
                {page.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status filter */}
      <Select value={selectedStatus || 'ALL'} onValueChange={onStatusChange} disabled={isPending}>
        <SelectTrigger className={cn('w-full sm:w-[180px]', isPending && 'opacity-50')}>
          <SelectValue placeholder="Stav" />
        </SelectTrigger>
        <SelectContent>
          {ANALYSIS_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={selectedSort || 'newest'} onValueChange={onSortChange} disabled={isPending}>
        <SelectTrigger className={cn('w-full sm:w-[180px]', isPending && 'opacity-50')}>
          <SelectValue placeholder="Řazení" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
