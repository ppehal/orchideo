import { Badge } from '@/components/ui/badge'
import { INDUSTRIES, type IndustryCode } from '@/lib/constants/fb-category-map'
import { sanitizeIndustryCode } from '@/lib/constants/industry-validation'
import { cn } from '@/lib/utils'

interface CategoryMappingBadgeProps {
  fbCategory: string | null
  industryCode: IndustryCode
  variant?: 'compact' | 'full'
  className?: string
}

/**
 * Sanitize string for safe display (prevent potential XSS)
 */
function sanitizeForDisplay(str: string): string {
  return str.slice(0, 200) // Limit length
}

/**
 * Display Facebook category → Industry mapping
 * Shows source category mapping to target industry with visual arrow
 */
export function CategoryMappingBadge({
  fbCategory,
  industryCode,
  variant = 'compact',
  className,
}: CategoryMappingBadgeProps) {
  // CRITICAL: Early return if no category
  if (!fbCategory?.trim()) return null

  // Validate industry code (defense in depth)
  const validIndustryCode = sanitizeIndustryCode(industryCode)
  const industryInfo = INDUSTRIES[validIndustryCode]

  if (!industryInfo) {
    console.error(`[CategoryMappingBadge] Invalid industry code: ${industryCode}`)
    return null
  }

  const industryName = industryInfo.name
  const sanitizedCategory = sanitizeForDisplay(fbCategory.trim())

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        variant === 'full' && 'flex-wrap',
        className
      )}
    >
      {variant === 'full' && (
        <span className="text-muted-foreground text-xs">FB kategorie:</span>
      )}
      <Badge
        variant="secondary"
        className="text-xs max-w-[180px]"
        title={sanitizedCategory}
      >
        <span className="truncate">{sanitizedCategory}</span>
      </Badge>
      <span
        className="text-muted-foreground text-xs sm:text-sm"
        aria-label="mapuje se na"
      >
        →
      </span>
      {variant === 'full' && (
        <span className="text-muted-foreground text-xs">Obor:</span>
      )}
      <Badge variant="secondary" className="text-xs">
        {industryName}
      </Badge>
    </div>
  )
}
