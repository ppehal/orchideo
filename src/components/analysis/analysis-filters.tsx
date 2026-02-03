'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ANALYSIS_STATUS_OPTIONS } from '@/lib/constants/analysis-progress'

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
}: AnalysisFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Page filter */}
      {pages.length > 0 && (
        <Select value={selectedPageId || 'ALL'} onValueChange={onPageChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      <Select value={selectedStatus || 'ALL'} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
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
      <Select value={selectedSort || 'newest'} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
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
