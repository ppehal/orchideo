import type { NormalizedPost } from '@/lib/services/analysis/types'

/**
 * Získat post IDs z trigger metrics
 * Parse JSON string array z metrics._*PostIds
 */
export function getPostIdsFromMetrics(
  metrics: Record<string, string | number | null> | undefined,
  key: string
): string[] {
  if (!metrics || !metrics[key]) return []
  try {
    const value = metrics[key]
    if (typeof value !== 'string') return []
    return JSON.parse(value) as string[]
  } catch {
    return []
  }
}

/**
 * Najít posty podle IDs v posts90d array
 * Používá Set pro O(n) lookup místo O(n²)
 */
export function getPostsByIds(
  posts90d: NormalizedPost[],
  postIds: string[]
): NormalizedPost[] {
  if (postIds.length === 0) return []
  const idSet = new Set(postIds)
  return posts90d.filter((p) => idSet.has(p.id))
}

/**
 * Formátovat typ postu pro zobrazení (české labely)
 */
export function formatPostType(type: NormalizedPost['type']): string {
  const labels: Record<NormalizedPost['type'], string> = {
    photo: 'Foto',
    video: 'Video',
    reel: 'Reel',
    link: 'Odkaz',
    status: 'Text',
    shared: 'Sdíleno',
    other: 'Jiné',
  }
  return labels[type] || 'Jiné'
}

/**
 * Badge variant pro typ postu
 */
export function getPostTypeBadgeVariant(
  type: NormalizedPost['type']
): 'default' | 'secondary' | 'outline' {
  if (type === 'photo') return 'default'
  if (type === 'video' || type === 'reel') return 'secondary'
  return 'outline'
}
