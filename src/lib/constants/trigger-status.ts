import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export type TriggerStatus = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'

export const TRIGGER_STATUS_LABELS: Record<TriggerStatus, string> = {
  EXCELLENT: 'Výborné',
  GOOD: 'Dobré',
  NEEDS_IMPROVEMENT: 'Ke zlepšení',
  CRITICAL: 'Kritické',
}

export const TRIGGER_STATUS_CONFIG: Record<
  TriggerStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  EXCELLENT: {
    label: TRIGGER_STATUS_LABELS.EXCELLENT,
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
  GOOD: {
    label: TRIGGER_STATUS_LABELS.GOOD,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  NEEDS_IMPROVEMENT: {
    label: TRIGGER_STATUS_LABELS.NEEDS_IMPROVEMENT,
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  CRITICAL: {
    label: TRIGGER_STATUS_LABELS.CRITICAL,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
}

// Status icons
export const TRIGGER_STATUS_ICONS: Record<TriggerStatus, typeof CheckCircle2> = {
  EXCELLENT: CheckCircle2,
  GOOD: CheckCircle2,
  NEEDS_IMPROVEMENT: AlertTriangle,
  CRITICAL: XCircle,
}

// Icon colors
export const TRIGGER_STATUS_ICON_COLORS: Record<TriggerStatus, string> = {
  EXCELLENT: 'text-green-500',
  GOOD: 'text-blue-500',
  NEEDS_IMPROVEMENT: 'text-amber-500',
  CRITICAL: 'text-red-500',
}

// Score thresholds for status mapping
// 85-100 = EXCELLENT
// 70-84  = GOOD
// 40-69  = NEEDS_IMPROVEMENT
// 0-39   = CRITICAL
export function getStatusFromScore(score: number): TriggerStatus {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 40) return 'NEEDS_IMPROVEMENT'
  return 'CRITICAL'
}
