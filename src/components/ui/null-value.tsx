import { cn } from '@/lib/utils'

interface NullValueProps {
  italic?: boolean
  className?: string
}

export function NullValue({ italic = false, className }: NullValueProps) {
  return <span className={cn('text-muted-foreground', italic && 'italic', className)}>—</span>
}
