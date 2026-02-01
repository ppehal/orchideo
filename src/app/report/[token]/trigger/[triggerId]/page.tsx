import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getTrigger } from '@/lib/triggers/registry'
import '@/lib/triggers/rules' // Register all triggers
import {
  TriggerDetailHeader,
  InputParametersCard,
  FormulaCard,
  IntroText,
  CategoryDisplay,
  type InputParameter,
} from '@/components/report/trigger-detail'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TriggerStatus } from '@/lib/triggers/types'

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
    // Additional triggers will be added here
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

  // 7. Load category definition for this trigger
  const categoryDefinition = await getCategoryDefinition(triggerId)

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Back to report */}
        <Link href={`/report/${token}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zpět na report
          </Button>
        </Link>

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

        {/* Intro text */}
        {categoryDefinition?.intro && <IntroText text={categoryDefinition.intro} />}

        {/* Categories */}
        {categoryDefinition && categoryKey && (
          <CategoryDisplay definition={categoryDefinition} currentKey={categoryKey} />
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
