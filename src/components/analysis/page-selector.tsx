'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FacebookPageItem } from '@/hooks/use-fb-pages'

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
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <PageCardSkeleton key={i} />
        ))}
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
    <div className="grid gap-3 sm:grid-cols-2">
      {pages.map((page) => (
        <PageCard
          key={page.id}
          page={page}
          isSelected={selectedPageId === page.id}
          isHighlighted={highlightedPageId === page.id}
          onClick={() => onSelectPage(page)}
        />
      ))}
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
              {page.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{page.name}</p>
          {page.category && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {page.category}
            </Badge>
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
