import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PostCard } from './post-card'
import type { NormalizedPost } from '@/lib/services/analysis/types'

interface PostListCardProps {
  title: string
  description?: string
  posts: NormalizedPost[]
  variant?: 'top' | 'bottom' | 'default'
  emptyMessage?: string
}

export function PostListCard({
  title,
  description,
  posts,
  variant = 'default',
  emptyMessage = 'Žádné posty k zobrazení',
}: PostListCardProps) {
  const Icon = variant === 'top' ? TrendingUp : variant === 'bottom' ? TrendingDown : null

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState title={emptyMessage} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} variant={variant} />
        ))}
      </CardContent>
    </Card>
  )
}
