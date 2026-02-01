'use client'

import { ExternalLink, Heart, MessageSquare, Share2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date-utils'
import { formatPostType, getPostTypeBadgeVariant } from '@/lib/utils/post-utils'
import { cn } from '@/lib/utils'
import type { NormalizedPost } from '@/lib/services/analysis/types'

interface PostCardProps {
  post: NormalizedPost
  variant?: 'top' | 'bottom' | 'default'
}

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const borderClass = {
    top: 'border-l-4 border-green-500',
    bottom: 'border-l-4 border-amber-500',
    default: '',
  }[variant]

  // Determine if message should be truncated (using Tailwind line-clamp)
  const hasMessage = post.message && post.message.length > 0

  return (
    <Card className={cn(borderClass)}>
      <CardContent className="space-y-3">
        {/* Header: Type & Date */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={getPostTypeBadgeVariant(post.type)}>
            {formatPostType(post.type)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(post.created_time)}
          </span>
        </div>

        {/* Message (using line-clamp for truncation) */}
        {hasMessage ? (
          <div className="line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap">
            {post.message}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">Bez textu</div>
        )}

        {/* Engagement Metrics - Responsive Grid */}
        <div className="grid grid-cols-3 gap-3 border-t pt-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">Reakce</span>
            </div>
            <span className="text-base sm:text-lg font-semibold">{post.reactions_count}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">Komentáře</span>
            </div>
            <span className="text-base sm:text-lg font-semibold">{post.comments_count}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">Sdílení</span>
            </div>
            <span className="text-base sm:text-lg font-semibold">{post.shares_count}</span>
          </div>
        </div>

        {/* External Link */}
        {post.permalink_url && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full"
          >
            <a
              href={post.permalink_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Zobrazit na Facebooku
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
