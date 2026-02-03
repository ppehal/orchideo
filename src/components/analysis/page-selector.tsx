'use client'

import * as React from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import type { FacebookPageItem } from '@/hooks/use-fb-pages'
import { CategoryMappingBadge } from '@/components/ui/category-mapping-badge'
import { getIndustryFromFbCategory } from '@/lib/constants/fb-category-map'

interface PageSelectorProps {
  pages: FacebookPageItem[]
  selectedPageId: string | null
  onSelectPage: (page: FacebookPageItem) => void
  isLoading?: boolean
  highlightedPageId?: string | null
}

export function PageSelector({
  pages,
  selectedPageId,
  onSelectPage,
  isLoading,
  highlightedPageId,
}: PageSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  const normalizeForSearch = React.useCallback((str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }, [])

  const filteredPages = React.useMemo(() => {
    if (!searchQuery.trim()) return pages

    const normalizedQuery = normalizeForSearch(searchQuery)

    return pages.filter((page) => {
      const normalizedName = normalizeForSearch(page.name)
      const normalizedUsername = page.username ? normalizeForSearch(page.username) : ''

      return (
        normalizedName.includes(normalizedQuery) || normalizedUsername.includes(normalizedQuery)
      )
    })
  }, [pages, searchQuery, normalizeForSearch])

  const handleClearSearch = React.useCallback(() => {
    setSearchQuery('')
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Vyhledat stránku podle názvu nebo URL..."
            value=""
            onChange={() => {}}
            disabled
            className="pl-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PageCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <p>Nemáte žádné Facebook stránky ke správě.</p>
        <p className="mt-2 text-sm">
          Vytvořte si stránku na Facebooku nebo požádejte o přístup ke správě existující stránky.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Vyhledat stránku podle názvu nebo URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Vymazat vyhledávání</span>
          </Button>
        )}
      </div>

      {searchQuery && (
        <p className="text-muted-foreground text-sm">
          {filteredPages.length === 0
            ? 'Žádné stránky nenalezeny'
            : filteredPages.length === 1
              ? '1 stránka nalezena'
              : `${filteredPages.length} stránek nalezeno`}
        </p>
      )}

      {filteredPages.length === 0 ? (
        <EmptyState
          title="Žádné stránky nenalezeny"
          description={`Zkuste jiný hledaný výraz nebo vymažte filtr`}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              isSelected={selectedPageId === page.id}
              isHighlighted={highlightedPageId === page.id}
              onClick={() => onSelectPage(page)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface PageCardProps {
  page: FacebookPageItem
  isSelected: boolean
  isHighlighted?: boolean
  onClick: () => void
}

function PageCard({ page, isSelected, isHighlighted, onClick }: PageCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-primary ring-2',
        isHighlighted && !isSelected && 'ring-primary/50 ring-1'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
          {page.picture_url ? (
            <Image
              src={page.picture_url}
              alt={page.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
              {(page.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{page.name}</p>
          {page.category?.trim() && (
            <CategoryMappingBadge
              fbCategory={page.category}
              industryCode={getIndustryFromFbCategory(page.category)}
              variant="compact"
              className="mt-1"
            />
          )}
        </div>
        {isSelected && (
          <div className="text-primary shrink-0">
            <CheckIcon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PageCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
