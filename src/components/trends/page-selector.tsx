'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Page {
  id: string
  name: string
}

interface PageSelectorProps {
  pages: Page[]
  selectedPageId: string | null
  onPageChange: (pageId: string) => void
}

export function PageSelector({ pages, selectedPageId, onPageChange }: PageSelectorProps) {
  if (pages.length === 0) {
    return null
  }

  return (
    <Select value={selectedPageId ?? undefined} onValueChange={onPageChange}>
      <SelectTrigger className="w-full sm:w-[280px]">
        <SelectValue placeholder="Vyberte stránku" />
      </SelectTrigger>
      <SelectContent>
        {pages.map((page) => (
          <SelectItem key={page.id} value={page.id}>
            {page.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
