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

interface CategoryDefinition {
  intro: string
  dimensions: {
    fanCount: Array<{ id: string; label: string; min?: number; max?: number }>
    postsPerMonth: Array<{ id: string; label: string; min?: number; max?: number }>
    interactionsPerPost: Array<{ id: string; label: string; min?: number; max?: number }>
  }
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
