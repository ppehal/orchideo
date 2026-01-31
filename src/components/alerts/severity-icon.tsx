import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEVERITY_CONFIG = {
  1: { icon: CheckCircle2, className: 'text-green-600', label: 'Info' },
  2: { icon: AlertTriangle, className: 'text-amber-600', label: 'Varování' },
  3: { icon: XCircle, className: 'text-red-600', label: 'Kritické' },
} as const

interface SeverityIconProps {
  severity: number
  className?: string
}

export function SeverityIcon({ severity, className }: SeverityIconProps) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG]

  if (!config) {
    return null
  }

  const Icon = config.icon
  return <Icon className={cn('h-5 w-5', config.className, className)} aria-label={config.label} />
}
