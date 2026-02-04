import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTrigger } from '@/lib/triggers/registry'
import '@/lib/triggers/rules' // Register all triggers
import {
  TriggerDetailHeader,
  InputParametersCard,
  FormulaCard,
  IntroText,
  CategoryDisplay,
  PostListCard,
  LegacyAnalysisBanner,
  CalculationStepsCard,
  ThresholdVisualizationCard,
  BenchmarkContextCard,
  PostClassificationCard,
  type InputParameter,
} from '@/components/report/trigger-detail'
import type { TriggerDebugData } from '@/lib/triggers/debug-types'
import { getPostIdsFromMetrics, getPostsByIds } from '@/lib/utils/post-utils'
import type { NormalizedPost } from '@/lib/services/analysis/types'
import type { TriggerStatus } from '@/lib/triggers/types'
import { Breadcrumbs } from '@/components/layout'

interface Props {
  params: Promise<{ token: string; triggerId: string }>
}

interface TriggerDetails {
  name?: string
  description?: string
  recommendation?: string
  currentValue?: string | number
  targetValue?: string | number
  context?: string
  reason?: string
  metrics?: Record<string, string | number | null>
}

interface CategoryDimension {
  id: string
  label: string
  min?: number
  max?: number
}

interface CategoryDefinition {
  intro: string
  dimensions: Record<string, CategoryDimension[]>
  recommendations: Record<string, string>
}

// Helper to load category definition for a trigger
async function getCategoryDefinition(triggerId: string): Promise<CategoryDefinition | null> {
  switch (triggerId) {
    case 'BASIC_001': {
      const { BASIC_001_INTRO, BASIC_001_DIMENSIONS, BASIC_001_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/basic-001')
      return {
        intro: BASIC_001_INTRO,
        dimensions: BASIC_001_DIMENSIONS,
        recommendations: BASIC_001_RECOMMENDATIONS,
      }
    }
    case 'BASIC_002': {
      const { BASIC_002_INTRO, BASIC_002_DIMENSIONS, BASIC_002_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/basic-002')
      return {
        intro: BASIC_002_INTRO,
        dimensions: BASIC_002_DIMENSIONS,
        recommendations: BASIC_002_RECOMMENDATIONS,
      }
    }
    case 'BASIC_003': {
      const { BASIC_003_INTRO, BASIC_003_DIMENSIONS, BASIC_003_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/basic-003')
      return {
        intro: BASIC_003_INTRO,
        dimensions: BASIC_003_DIMENSIONS,
        recommendations: BASIC_003_RECOMMENDATIONS,
      }
    }
    case 'BASIC_004': {
      const { BASIC_004_INTRO, BASIC_004_DIMENSIONS, BASIC_004_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/basic-004')
      return {
        intro: BASIC_004_INTRO,
        dimensions: BASIC_004_DIMENSIONS,
        recommendations: BASIC_004_RECOMMENDATIONS,
      }
    }
    case 'BASIC_005': {
      const { BASIC_005_INTRO, BASIC_005_DIMENSIONS, BASIC_005_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/basic-005')
      return {
        intro: BASIC_005_INTRO,
        dimensions: BASIC_005_DIMENSIONS,
        recommendations: BASIC_005_RECOMMENDATIONS,
      }
    }
    case 'CONT_001': {
      const { CONT_001_INTRO, CONT_001_DIMENSIONS, CONT_001_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/cont-001')
      return {
        intro: CONT_001_INTRO,
        dimensions: CONT_001_DIMENSIONS,
        recommendations: CONT_001_RECOMMENDATIONS,
      }
    }
    case 'CONT_002': {
      const { CONT_002_INTRO, CONT_002_DIMENSIONS, CONT_002_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/cont-002')
      return {
        intro: CONT_002_INTRO,
        dimensions: CONT_002_DIMENSIONS,
        recommendations: CONT_002_RECOMMENDATIONS,
      }
    }
    case 'CONT_003': {
      const { CONT_003_INTRO, CONT_003_DIMENSIONS, CONT_003_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/cont-003')
      return {
        intro: CONT_003_INTRO,
        dimensions: CONT_003_DIMENSIONS,
        recommendations: CONT_003_RECOMMENDATIONS,
      }
    }
    case 'CONT_004': {
      const { CONT_004_INTRO, CONT_004_DIMENSIONS, CONT_004_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/cont-004')
      return {
        intro: CONT_004_INTRO,
        dimensions: CONT_004_DIMENSIONS,
        recommendations: CONT_004_RECOMMENDATIONS,
      }
    }
    case 'CONT_005': {
      const { CONT_005_INTRO, CONT_005_DIMENSIONS, CONT_005_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/cont-005')
      return {
        intro: CONT_005_INTRO,
        dimensions: CONT_005_DIMENSIONS,
        recommendations: CONT_005_RECOMMENDATIONS,
      }
    }
    case 'CONT_006': {
      const { CONT_006_INTRO, CONT_006_DIMENSIONS, CONT_006_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/cont-006')
      return {
        intro: CONT_006_INTRO,
        dimensions: CONT_006_DIMENSIONS,
        recommendations: CONT_006_RECOMMENDATIONS,
      }
    }
    case 'TECH_001': {
      const { TECH_001_INTRO, TECH_001_DIMENSIONS, TECH_001_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-001')
      return {
        intro: TECH_001_INTRO,
        dimensions: TECH_001_DIMENSIONS,
        recommendations: TECH_001_RECOMMENDATIONS,
      }
    }
    case 'TECH_002': {
      const { TECH_002_INTRO, TECH_002_DIMENSIONS, TECH_002_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-002')
      return {
        intro: TECH_002_INTRO,
        dimensions: TECH_002_DIMENSIONS,
        recommendations: TECH_002_RECOMMENDATIONS,
      }
    }
    case 'TECH_003': {
      const { TECH_003_INTRO, TECH_003_DIMENSIONS, TECH_003_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-003')
      return {
        intro: TECH_003_INTRO,
        dimensions: TECH_003_DIMENSIONS,
        recommendations: TECH_003_RECOMMENDATIONS,
      }
    }
    case 'TECH_004': {
      const { TECH_004_INTRO, TECH_004_DIMENSIONS, TECH_004_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-004')
      return {
        intro: TECH_004_INTRO,
        dimensions: TECH_004_DIMENSIONS,
        recommendations: TECH_004_RECOMMENDATIONS,
      }
    }
    case 'TECH_005': {
      const { TECH_005_INTRO, TECH_005_DIMENSIONS, TECH_005_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-005')
      return {
        intro: TECH_005_INTRO,
        dimensions: TECH_005_DIMENSIONS,
        recommendations: TECH_005_RECOMMENDATIONS,
      }
    }
    case 'TECH_006': {
      const { TECH_006_INTRO, TECH_006_DIMENSIONS, TECH_006_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-006')
      return {
        intro: TECH_006_INTRO,
        dimensions: TECH_006_DIMENSIONS,
        recommendations: TECH_006_RECOMMENDATIONS,
      }
    }
    case 'TECH_007': {
      const { TECH_007_INTRO, TECH_007_DIMENSIONS, TECH_007_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/tech-007')
      return {
        intro: TECH_007_INTRO,
        dimensions: TECH_007_DIMENSIONS,
        recommendations: TECH_007_RECOMMENDATIONS,
      }
    }
    case 'TIME_001': {
      const { TIME_001_INTRO, TIME_001_DIMENSIONS, TIME_001_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/time-001')
      return {
        intro: TIME_001_INTRO,
        dimensions: TIME_001_DIMENSIONS,
        recommendations: TIME_001_RECOMMENDATIONS,
      }
    }
    case 'TIME_002': {
      const { TIME_002_INTRO, TIME_002_DIMENSIONS, TIME_002_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/time-002')
      return {
        intro: TIME_002_INTRO,
        dimensions: TIME_002_DIMENSIONS,
        recommendations: TIME_002_RECOMMENDATIONS,
      }
    }
    case 'TIME_003': {
      const { TIME_003_INTRO, TIME_003_DIMENSIONS, TIME_003_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/time-003')
      return {
        intro: TIME_003_INTRO,
        dimensions: TIME_003_DIMENSIONS,
        recommendations: TIME_003_RECOMMENDATIONS,
      }
    }
    case 'SHARE_001': {
      const { SHARE_001_INTRO, SHARE_001_DIMENSIONS, SHARE_001_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/share-001')
      return {
        intro: SHARE_001_INTRO,
        dimensions: SHARE_001_DIMENSIONS,
        recommendations: SHARE_001_RECOMMENDATIONS,
      }
    }
    case 'SHARE_002': {
      const { SHARE_002_INTRO, SHARE_002_DIMENSIONS, SHARE_002_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/share-002')
      return {
        intro: SHARE_002_INTRO,
        dimensions: SHARE_002_DIMENSIONS,
        recommendations: SHARE_002_RECOMMENDATIONS,
      }
    }
    case 'SHARE_003': {
      const { SHARE_003_INTRO, SHARE_003_DIMENSIONS, SHARE_003_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/share-003')
      return {
        intro: SHARE_003_INTRO,
        dimensions: SHARE_003_DIMENSIONS,
        recommendations: SHARE_003_RECOMMENDATIONS,
      }
    }
    case 'SHARE_004': {
      const { SHARE_004_INTRO, SHARE_004_DIMENSIONS, SHARE_004_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/share-004')
      return {
        intro: SHARE_004_INTRO,
        dimensions: SHARE_004_DIMENSIONS,
        recommendations: SHARE_004_RECOMMENDATIONS,
      }
    }
    case 'PAGE_001': {
      const { PAGE_001_INTRO, PAGE_001_DIMENSIONS, PAGE_001_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/page-001')
      return {
        intro: PAGE_001_INTRO,
        dimensions: PAGE_001_DIMENSIONS,
        recommendations: PAGE_001_RECOMMENDATIONS,
      }
    }
    case 'PAGE_002': {
      const { PAGE_002_INTRO, PAGE_002_DIMENSIONS, PAGE_002_RECOMMENDATIONS } =
        await import('@/lib/constants/trigger-categories/page-002')
      return {
        intro: PAGE_002_INTRO,
        dimensions: PAGE_002_DIMENSIONS,
        recommendations: PAGE_002_RECOMMENDATIONS,
      }
    }
    default:
      return null
  }
}

export default async function TriggerDetailPage({ params }: Props) {
  const { token, triggerId } = await params
  const showFormulas = process.env.SHOW_DEBUG_FORMULAS === 'true'

  // 1. Verify trigger definition exists
  const triggerRule = getTrigger(triggerId)
  if (!triggerRule) {
    notFound()
  }

  // 2. Load analysis from database
  const analysis = await prisma.analysis.findUnique({
    where: { public_token: token },
    include: {
      triggerResults: {
        where: { trigger_code: triggerId },
      },
    },
  })

  if (!analysis) {
    notFound()
  }

  // 3. Check expiration
  if (analysis.expires_at && analysis.expires_at < new Date()) {
    notFound()
  }

  // 4. Get trigger result
  const triggerResult = analysis.triggerResults[0]
  if (!triggerResult) {
    notFound()
  }

  // 5. Parse details
  const details = triggerResult.details as TriggerDetails | null

  // 6. Parse extended data from metrics
  const metrics = details?.metrics ?? {}
  let inputParams: InputParameter[] = []
  try {
    if (metrics._inputParams) {
      inputParams = JSON.parse(metrics._inputParams as string)
    }
  } catch {
    // Ignore parse errors
  }
  const formula = metrics._formula as string | undefined
  const categoryKey = metrics._categoryKey as string | undefined

  // Parse debug data with error handling
  let debugData: TriggerDebugData | null = null
  try {
    if (metrics._debugData) {
      debugData = JSON.parse(metrics._debugData as string)
    }
  } catch (error) {
    // Gracefully ignore parse errors (old analyses or corrupted data)
    console.warn('Failed to parse debug data:', error)
  }

  // 7. Load category definition for this trigger
  const categoryDefinition = await getCategoryDefinition(triggerId)

  // 8. Parse posts from rawData and get post examples
  const rawData = analysis.rawData as { posts90d?: NormalizedPost[] } | null
  const posts90d = rawData?.posts90d ?? []

  // Get post IDs from metrics
  const topPostIds = getPostIdsFromMetrics(metrics, '_topPostIds')
  const bottomPostIds = getPostIdsFromMetrics(metrics, '_bottomPostIds')
  const bestHourPostIds = getPostIdsFromMetrics(metrics, '_bestHourPostIds')
  const bestDayPostIds = getPostIdsFromMetrics(metrics, '_bestDayPostIds')
  const worstDayPostIds = getPostIdsFromMetrics(metrics, '_worstDayPostIds')
  const photoExampleIds = getPostIdsFromMetrics(metrics, '_photoExampleIds')
  const videoExampleIds = getPostIdsFromMetrics(metrics, '_videoExampleIds')

  // Fetch actual posts by IDs
  const topPosts = getPostsByIds(posts90d, topPostIds)
  const bottomPosts = getPostsByIds(posts90d, bottomPostIds)
  const bestHourPosts = getPostsByIds(posts90d, bestHourPostIds)
  const bestDayPosts = getPostsByIds(posts90d, bestDayPostIds)
  const worstDayPosts = getPostsByIds(posts90d, worstDayPostIds)
  const photoExamples = getPostsByIds(posts90d, photoExampleIds)
  const videoExamples = getPostsByIds(posts90d, videoExampleIds)

  // Check if ANY post examples exist (for legacy banner)
  const hasAnyPostExamples =
    topPosts.length > 0 ||
    bottomPosts.length > 0 ||
    bestHourPosts.length > 0 ||
    bestDayPosts.length > 0 ||
    worstDayPosts.length > 0 ||
    photoExamples.length > 0 ||
    videoExamples.length > 0

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Report', href: `/report/${token}` },
            { label: details?.name ?? triggerRule.name },
          ]}
        />

        {/* Header */}
        <TriggerDetailHeader
          name={details?.name ?? triggerRule.name}
          description={details?.description ?? triggerRule.description}
          score={triggerResult.score}
          status={triggerResult.status as TriggerStatus}
        />

        {/* Input parameters */}
        {inputParams.length > 0 && <InputParametersCard parameters={inputParams} />}

        {/* Formula (debug mode only) */}
        {showFormulas && formula && (
          <FormulaCard formula={formula} categoryKey={categoryKey} metrics={metrics} />
        )}

        {/* Debug visualizations - controlled by SHOW_DEBUG_FORMULAS flag */}
        {showFormulas && debugData && (
          <div className="space-y-6">
            {/* Step-by-step calculation - always useful */}
            {debugData.calculationSteps && debugData.calculationSteps.length > 0 && (
              <CalculationStepsCard steps={debugData.calculationSteps} />
            )}

            {/* Threshold visualization - shows where score falls */}
            {debugData.thresholdPosition && (
              <ThresholdVisualizationCard position={debugData.thresholdPosition} />
            )}

            {/* Benchmark context - for triggers using industry benchmarks */}
            {debugData.benchmarkContext && (
              <BenchmarkContextCard context={debugData.benchmarkContext} />
            )}

            {/* Post classifications - for content analysis triggers */}
            {debugData.postClassifications && debugData.postClassifications.length > 0 && (
              <PostClassificationCard classifications={debugData.postClassifications} />
            )}
          </div>
        )}

        {/* Categories */}
        {categoryDefinition && categoryKey && (
          <CategoryDisplay definition={categoryDefinition} currentKey={categoryKey} />
        )}

        {/* Intro text */}
        {categoryDefinition?.intro && <IntroText text={categoryDefinition.intro} />}

        {/* Legacy banner if no post examples exist */}
        {!hasAnyPostExamples && posts90d.length > 0 && <LegacyAnalysisBanner />}

        {/* Top Posts (CONT_002) */}
        {topPosts.length > 0 && (
          <PostListCard
            title="Nejsilnější posty"
            description="Příklady postů s nejvyšším engagementem"
            posts={topPosts}
            variant="top"
          />
        )}

        {/* Bottom Posts (CONT_003) */}
        {bottomPosts.length > 0 && (
          <PostListCard
            title="Nejslabší posty"
            description="Příklady postů s nejnižším engagementem"
            posts={bottomPosts}
            variant="bottom"
          />
        )}

        {/* Best Hour Posts (TIME_001) */}
        {bestHourPosts.length > 0 && (
          <PostListCard
            title="Posty v nejlepších hodinách"
            description="Příklady úspěšných postů publikovaných v optimálních časech"
            posts={bestHourPosts}
            variant="top"
          />
        )}

        {/* Best Day Posts (TIME_003) */}
        {bestDayPosts.length > 0 && (
          <PostListCard
            title="Posty v nejlepších dnech"
            description="Příklady úspěšných postů publikovaných v optimálních dnech"
            posts={bestDayPosts}
            variant="top"
          />
        )}

        {/* Worst Day Posts (TIME_003) */}
        {worstDayPosts.length > 0 && (
          <PostListCard
            title="Posty v nejslabších dnech"
            description="Příklady postů publikovaných ve dnech s nižším engagementem"
            posts={worstDayPosts}
            variant="bottom"
          />
        )}

        {/* Photo Examples (CONT_005) */}
        {photoExamples.length > 0 && (
          <PostListCard
            title="Příklady fotografií"
            description="Nejúspěšnější fotografie z vašich příspěvků"
            posts={photoExamples}
            variant="default"
          />
        )}

        {/* Video Examples (CONT_005) */}
        {videoExamples.length > 0 && (
          <PostListCard
            title="Příklady videí"
            description="Nejúspěšnější videa a Reels z vašich příspěvků"
            posts={videoExamples}
            variant="default"
          />
        )}

        {/* Fallback reason if no category data */}
        {details?.reason && !categoryKey && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-muted-foreground text-sm italic">
              {details.reason === 'INSUFFICIENT_DATA' && 'Nedostatek dat pro přesné vyhodnocení.'}
              {details.reason === 'METRIC_UNAVAILABLE' && 'Metrika není dostupná.'}
              {details.reason === 'NOT_APPLICABLE' && 'Trigger není aplikovatelný.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
