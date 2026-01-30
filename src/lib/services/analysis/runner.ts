import { prisma } from '@/lib/prisma'
import { createLogger, withContext } from '@/lib/logging'
import { decrypt } from '@/lib/utils/encryption'
import { collectAnalysisData } from './collector'
import { normalizeCollectedData } from './normalizer'
import { evaluateAll } from '@/lib/triggers'
import type { TriggerInput, TriggerEvaluation } from '@/lib/triggers'
import type { AnalysisRawData, IndustryBenchmarkData } from './types'
import type { TriggerCategory, TriggerStatus } from '@/generated/prisma/enums'
import type { Logger } from 'pino'

const baseLog = createLogger('analysis-runner')

const ANALYSIS_TIMEOUT_MS = parseInt(process.env.ANALYSIS_TIMEOUT_MS || '60000', 10)

// Default benchmark when no industry-specific benchmark exists
function getDefaultBenchmark(): IndustryBenchmarkData {
  return {
    industry_code: 'DEFAULT',
    industry_name: 'Obecný benchmark',
    avg_engagement_rate: 0.02, // 2%
    reactions_pct: 70,
    comments_pct: 20,
    shares_pct: 10,
    ideal_engagement_pct: 60,
    ideal_sales_pct: 15,
    ideal_brand_pct: 25,
    ideal_posts_per_week: 4,
  }
}

// Save trigger evaluation results to database
async function saveTriggerResults(
  analysisId: string,
  evaluations: TriggerEvaluation[]
): Promise<void> {
  // Delete existing results (in case of re-run)
  await prisma.triggerResult.deleteMany({
    where: { analysisId },
  })

  // Create new results
  await prisma.triggerResult.createMany({
    data: evaluations.map((e) => ({
      analysisId,
      trigger_code: e.id,
      category: e.category as TriggerCategory,
      score: e.score,
      status: e.status as TriggerStatus,
      value:
        e.details?.currentValue !== undefined
          ? parseFloat(String(e.details.currentValue).replace(/[^0-9.-]/g, '')) || null
          : null,
      threshold:
        e.details?.targetValue !== undefined
          ? parseFloat(String(e.details.targetValue).replace(/[^0-9.-]/g, '')) || null
          : null,
      details: {
        name: e.name,
        description: e.description,
        recommendation: e.recommendation,
        currentValue: e.details?.currentValue,
        targetValue: e.details?.targetValue,
        context: e.details?.context,
        reason: e.details?.reason,
        metrics: e.details?.metrics,
      },
    })),
  })
}

export interface RunnerResult {
  success: boolean
  analysisId: string
  error?: string
  errorCode?: string
}

async function updateAnalysisStatus(
  analysisId: string,
  status: 'PENDING' | 'COLLECTING_DATA' | 'ANALYZING' | 'COMPLETED' | 'FAILED',
  additionalData?: {
    rawData?: AnalysisRawData
    overall_score?: number
    error_message?: string
    error_code?: string
    started_at?: Date
    completed_at?: Date
  }
) {
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
}

export async function runAnalysis(analysisId: string): Promise<RunnerResult> {
  const log: Logger = withContext(baseLog, { analysis_id: analysisId })
  const startTime = Date.now()

  log.info('Starting analysis')

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Analysis timeout exceeded'))
    }, ANALYSIS_TIMEOUT_MS)
  })

  try {
    // Get analysis record with Facebook page data
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        facebookPage: true,
      },
    })

    if (!analysis) {
      log.error('Analysis not found')
      return {
        success: false,
        analysisId,
        error: 'Analýza nenalezena',
        errorCode: 'NOT_FOUND',
      }
    }

    if (!analysis.facebookPage) {
      log.error('Facebook page not found for analysis')
      await updateAnalysisStatus(analysisId, 'FAILED', {
        error_message: 'Facebook stránka nenalezena',
        error_code: 'PAGE_NOT_FOUND',
      })
      return {
        success: false,
        analysisId,
        error: 'Facebook stránka nenalezena',
        errorCode: 'PAGE_NOT_FOUND',
      }
    }

    const fbPage = analysis.facebookPage
    log.info({ fb_page_id: fbPage.fb_page_id, page_name: fbPage.name }, 'Processing page')

    // Update status to COLLECTING_DATA
    await updateAnalysisStatus(analysisId, 'COLLECTING_DATA', {
      started_at: new Date(),
    })

    // Decrypt the page access token
    let accessToken: string
    try {
      accessToken = decrypt(fbPage.page_access_token)
    } catch (error) {
      log.error({ error }, 'Failed to decrypt page access token')
      await updateAnalysisStatus(analysisId, 'FAILED', {
        error_message: 'Nepodařilo se dešifrovat přístupový token',
        error_code: 'DECRYPTION_ERROR',
      })
      return {
        success: false,
        analysisId,
        error: 'Nepodařilo se dešifrovat přístupový token',
        errorCode: 'DECRYPTION_ERROR',
      }
    }

    // Collect data from Facebook (with timeout)
    const collectionResult = await Promise.race([
      collectAnalysisData(fbPage.fb_page_id, accessToken),
      timeoutPromise,
    ])

    if (!collectionResult.success || !collectionResult.data) {
      const errorMessage =
        collectionResult.errors[0]?.message || 'Nepodařilo se získat data z Facebooku'
      log.error({ errors: collectionResult.errors }, 'Data collection failed')
      await updateAnalysisStatus(analysisId, 'FAILED', {
        error_message: errorMessage,
        error_code: 'COLLECTION_ERROR',
      })
      return {
        success: false,
        analysisId,
        error: errorMessage,
        errorCode: 'COLLECTION_ERROR',
      }
    }

    log.info(
      {
        postsCollected: collectionResult.data.metadata.postsCollected,
        insightsAvailable: collectionResult.data.metadata.insightsAvailable,
      },
      'Data collection completed'
    )

    // Update status to ANALYZING
    await updateAnalysisStatus(analysisId, 'ANALYZING')

    // Normalize the collected data
    const normalizedData = normalizeCollectedData(collectionResult.data)

    log.info({ postsNormalized: normalizedData.posts90d.length }, 'Data normalization completed')

    // Get industry benchmark
    const industryCode = analysis.industry_code || 'DEFAULT'
    const benchmark = await prisma.industryBenchmark.findUnique({
      where: { industry_code: industryCode },
    })

    const industryBenchmark: IndustryBenchmarkData = benchmark
      ? {
          industry_code: benchmark.industry_code,
          industry_name: benchmark.industry_name,
          avg_engagement_rate: benchmark.avg_engagement_rate,
          reactions_pct: benchmark.reactions_pct,
          comments_pct: benchmark.comments_pct,
          shares_pct: benchmark.shares_pct,
          ideal_engagement_pct: benchmark.ideal_engagement_pct,
          ideal_sales_pct: benchmark.ideal_sales_pct,
          ideal_brand_pct: benchmark.ideal_brand_pct,
          ideal_posts_per_week: benchmark.ideal_posts_per_week,
        }
      : getDefaultBenchmark()

    // Build trigger input
    const triggerInput: TriggerInput = {
      pageData: normalizedData.pageData,
      posts90d: normalizedData.posts90d,
      insights28d: normalizedData.insights28d,
      industryBenchmark,
    }

    // Evaluate all triggers
    log.info('Running trigger evaluation')
    const evaluationResult = evaluateAll(triggerInput)

    log.info(
      {
        triggersEvaluated: evaluationResult.evaluations.length,
        overallScore: evaluationResult.overallScore,
        errors: evaluationResult.errors.length,
      },
      'Trigger evaluation completed'
    )

    // Save trigger results to database
    await saveTriggerResults(analysisId, evaluationResult.evaluations)

    const elapsedMs = Date.now() - startTime

    await updateAnalysisStatus(analysisId, 'COMPLETED', {
      rawData: normalizedData,
      overall_score: evaluationResult.overallScore,
      completed_at: new Date(),
    })

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'analysis_completed',
        analysisId,
        metadata: {
          elapsed_ms: elapsedMs,
          posts_collected: normalizedData.posts90d.length,
          insights_available: !!normalizedData.insights28d,
          partial_success: collectionResult.partialSuccess,
          overall_score: evaluationResult.overallScore,
          triggers_evaluated: evaluationResult.evaluations.length,
        },
      },
    })

    log.info(
      {
        elapsedMs,
        postsCount: normalizedData.posts90d.length,
        overallScore: evaluationResult.overallScore,
      },
      'Analysis completed successfully'
    )

    return {
      success: true,
      analysisId,
    }
  } catch (error) {
    const elapsedMs = Date.now() - startTime
    const isTimeout = error instanceof Error && error.message === 'Analysis timeout exceeded'

    log.error({ error, elapsedMs, isTimeout }, 'Analysis failed')

    const errorMessage = isTimeout
      ? 'Analýza překročila časový limit'
      : error instanceof Error
        ? error.message
        : 'Neznámá chyba'
    const errorCode = isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR'

    await updateAnalysisStatus(analysisId, 'FAILED', {
      error_message: errorMessage,
      error_code: errorCode,
    })

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'analysis_failed',
        analysisId,
        metadata: {
          elapsed_ms: elapsedMs,
          error_message: errorMessage,
          error_code: errorCode,
        },
      },
    })

    return {
      success: false,
      analysisId,
      error: errorMessage,
      errorCode,
    }
  }
}

// Function to start analysis in background (fire-and-forget)
export function startAnalysisInBackground(analysisId: string): void {
  const log = withContext(baseLog, { analysis_id: analysisId })

  // Run analysis without awaiting
  runAnalysis(analysisId).catch((error) => {
    log.error({ error }, 'Background analysis failed unexpectedly')
  })
}
