/**
 * Analysis progress constants for status-to-progress mapping.
 * Used by both API routes and client components.
 */

import type { AnalysisStatus } from '@/generated/prisma/enums'

/**
 * Progress percentage for each analysis status.
 * Values chosen to give smooth visual feedback during polling.
 */
export const ANALYSIS_STATUS_PROGRESS: Record<AnalysisStatus, number> = {
  PENDING: 5,
  COLLECTING_DATA: 40,
  ANALYZING: 75,
  COMPLETED: 100,
  FAILED: 100,
}

/**
 * Human-readable labels for analysis statuses (Czech).
 */
export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  PENDING: 'Čekání na zpracování...',
  COLLECTING_DATA: 'Stahování dat z Facebooku...',
  ANALYZING: 'Vyhodnocování triggerů...',
  COMPLETED: 'Analýza dokončena',
  FAILED: 'Analýza selhala',
}
