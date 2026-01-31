import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import type { AnalysisRawData } from './types'

const log = createLogger('analysis-status')

// ============================================================================
// Types
// ============================================================================

export type AnalysisStatusType =
  | 'PENDING'
  | 'COLLECTING_DATA'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'

export interface StatusUpdateData {
  rawData?: AnalysisRawData
  overall_score?: number
  error_message?: string
  error_code?: string
  started_at?: Date
  completed_at?: Date
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * Update analysis status in the database.
 * Handles JSON serialization for rawData.
 */
export async function updateAnalysisStatus(
  analysisId: string,
  status: AnalysisStatusType,
  additionalData?: StatusUpdateData
): Promise<void> {
  // Build update data, handling rawData JSON serialization separately
  const updateData: Parameters<typeof prisma.analysis.update>[0]['data'] = {
    status,
    overall_score: additionalData?.overall_score,
    error_message: additionalData?.error_message,
    error_code: additionalData?.error_code,
    started_at: additionalData?.started_at,
    completed_at: additionalData?.completed_at,
  }

  // Prisma Json type requires explicit serialization
  if (additionalData?.rawData) {
    updateData.rawData = JSON.parse(JSON.stringify(additionalData.rawData))
  }

  await prisma.analysis.update({
    where: { id: analysisId },
    data: updateData,
  })

  log.debug({ analysisId, status }, 'Analysis status updated')
}

// ============================================================================
// Analytics Events
// ============================================================================

export interface AnalysisCompletedEventData {
  elapsed_ms: number
  posts_collected: number
  insights_available: boolean
  partial_success: boolean
  overall_score: number
  triggers_evaluated: number
}

export interface AnalysisFailedEventData {
  elapsed_ms: number
  error_message: string
  error_code: string
}

/**
 * Log an analytics event for completed analysis.
 */
export async function logAnalysisCompleted(
  analysisId: string,
  data: AnalysisCompletedEventData
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'analysis_completed',
        analysisId,
        metadata: { ...data },
      },
    })
  } catch (error) {
    log.error({ error, analysisId }, 'Failed to log analysis completed event')
  }
}

/**
 * Log an analytics event for failed analysis.
 */
export async function logAnalysisFailed(
  analysisId: string,
  data: AnalysisFailedEventData
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'analysis_failed',
        analysisId,
        metadata: { ...data },
      },
    })
  } catch (error) {
    log.error({ error, analysisId }, 'Failed to log analysis failed event')
  }
}
