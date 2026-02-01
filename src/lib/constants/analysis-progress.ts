/**
 * Analysis progress constants for status-to-progress mapping.
 * Used by both API routes and client components.
 */

import type { AnalysisStatus } from '@/generated/prisma/enums'
import { STATUS_COLORS, type ColorConfig } from './color-schemes'

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

/**
 * Short labels for analysis statuses (for badges in lists).
 */
export const ANALYSIS_STATUS_LABELS_SHORT: Record<AnalysisStatus, string> = {
  PENDING: 'Čeká',
  COLLECTING_DATA: 'Stahuje data',
  ANALYZING: 'Analyzuje',
  COMPLETED: 'Dokončeno',
  FAILED: 'Chyba',
}

/**
 * Status configuration with colors and labels for badges.
 */
export const ANALYSIS_STATUS_CONFIG: Record<AnalysisStatus, ColorConfig & { label: string }> = {
  PENDING: { ...STATUS_COLORS.warning, label: 'Čeká' },
  COLLECTING_DATA: { ...STATUS_COLORS.info, label: 'Stahuje data' },
  ANALYZING: { ...STATUS_COLORS.info, label: 'Analyzuje' },
  COMPLETED: { ...STATUS_COLORS.success, label: 'Dokončeno' },
  FAILED: { ...STATUS_COLORS.error, label: 'Chyba' },
}

/**
 * Options for status filter dropdown.
 */
export const ANALYSIS_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Všechny stavy' },
  { value: 'COMPLETED', label: 'Dokončeno' },
  { value: 'FAILED', label: 'Chyba' },
  { value: 'IN_PROGRESS', label: 'Probíhá' },
] as const
