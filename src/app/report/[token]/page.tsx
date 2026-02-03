import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  ReportHeader,
  OverallScore,
  TopRecommendations,
  TriggerSection,
  ReportDisclaimer,
  CopyLinkButton,
  PdfExportButton,
  type TriggerCategory,
} from '@/components/report'
import { EmailForm } from '@/components/report/email-form'
import type { TriggerResult } from '@/components/report/trigger-card'
import { ReportClientWrapper } from './client-wrapper'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ print?: string; hideBranding?: string; company?: string }>
}

interface TriggerDetails {
  name?: string
  description?: string
  recommendation?: string
  currentValue?: string | number
  targetValue?: string | number
  context?: string
  reason?: string
  metrics?: Record<string, number | string | null>
}

// Transform database trigger results to component format
function transformTriggerResults(
  dbResults: Array<{
    trigger_code: string
    category: string
    score: number
    status: string
    details: unknown
  }>
): Array<TriggerResult & { category: TriggerCategory }> {
  return dbResults.map((result) => {
    const details = result.details as TriggerDetails | null

    return {
      id: result.trigger_code,
      category: result.category as TriggerCategory,
      name: details?.name ?? result.trigger_code,
      description: details?.description ?? '',
      score: result.score,
      recommendation: details?.recommendation,
      details: details
        ? {
            reason: details.reason,
            currentValue: details.currentValue,
            targetValue: details.targetValue,
            context: details.context,
          }
        : undefined,
    }
  })
}

function groupTriggersByCategory(
  triggers: Array<TriggerResult & { category: TriggerCategory }>
): Record<TriggerCategory, TriggerResult[]> {
  const grouped: Record<TriggerCategory, TriggerResult[]> = {
    BASIC: [],
    CONTENT: [],
    TECHNICAL: [],
    TIMING: [],
    SHARING: [],
    PAGE_SETTINGS: [],
  }

  for (const trigger of triggers) {
    grouped[trigger.category].push(trigger)
  }

  return grouped
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { token } = await params
  const { print, hideBranding, company } = await searchParams

  const isPrintMode = print === 'true'
  const shouldHideBranding = hideBranding === 'true'
  const companyName = company

  const analysis = await prisma.analysis.findUnique({
    where: { public_token: token },
    include: {
      triggerResults: {
        orderBy: { trigger_code: 'asc' },
      },
    },
  })

  if (!analysis) {
    notFound()
  }

  // Check if report has expired
  if (analysis.expires_at && analysis.expires_at < new Date()) {
    notFound()
  }

  // Log report view event
  await prisma.analyticsEvent.create({
    data: {
      event_type: 'report_viewed',
      analysisId: analysis.id,
      metadata: {
        public_token: token,
      },
    },
  })

  // Transform database results to component format
  const triggers = transformTriggerResults(analysis.triggerResults)
  const grouped = groupTriggersByCategory(triggers)
  const overallScore = analysis.overall_score ?? 0

  // Extract collection metadata from rawData
  const rawData = analysis.rawData as {
    collectionMetadata?: {
      postsCollected?: number
      daysOfData?: number
      insightsAvailable?: boolean
      insightsError?: string | null
      insightsErrorMessage?: string | null
    }
  } | null

  const postsAnalyzed = rawData?.collectionMetadata?.postsCollected ?? 0
  const daysOfData = rawData?.collectionMetadata?.daysOfData ?? 90
  const insightsAvailable = rawData?.collectionMetadata?.insightsAvailable ?? false
  const insightsError = rawData?.collectionMetadata?.insightsError ?? null
  const insightsErrorMessage = rawData?.collectionMetadata?.insightsErrorMessage ?? null

  return (
    <ReportClientWrapper>
      <div
        className={`bg-muted/30 min-h-screen ${isPrintMode ? 'print-mode' : ''}`}
        data-pdf-ready="true"
      >
        <div
          className="container mx-auto max-w-5xl space-y-6 px-4 py-8"
          data-report-content
        >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <ReportHeader
            pageName={companyName || analysis.page_name || 'Facebook stránka'}
            pagePicture={analysis.page_picture}
            fanCount={analysis.page_fan_count}
            createdAt={analysis.created_at}
            industry={analysis.industry_code !== 'DEFAULT' ? analysis.industry_code : undefined}
            fbCategory={analysis.fb_page_category}
          />
        </div>

        {/* Actions - hidden in print mode */}
        {!isPrintMode && (
          <div className="no-print flex justify-end gap-2">
            <PdfExportButton token={token} />
            <CopyLinkButton />
          </div>
        )}

        {/* Overall Score */}
        <OverallScore score={overallScore} />

        {/* Trigger Sections */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Detailní analýza</h2>

          <TriggerSection category="BASIC" triggers={grouped.BASIC} reportToken={token} />
          <TriggerSection category="CONTENT" triggers={grouped.CONTENT} reportToken={token} />
          <TriggerSection category="TECHNICAL" triggers={grouped.TECHNICAL} reportToken={token} />
          <TriggerSection category="TIMING" triggers={grouped.TIMING} reportToken={token} />
          <TriggerSection category="SHARING" triggers={grouped.SHARING} reportToken={token} />
          <TriggerSection
            category="PAGE_SETTINGS"
            triggers={grouped.PAGE_SETTINGS}
            reportToken={token}
          />
        </div>

        {/* Top Recommendations - moved after trigger sections */}
        <TopRecommendations triggers={triggers} maxRecommendations={5} />

        {/* Disclaimer */}
        <ReportDisclaimer
          expiresAt={analysis.expires_at}
          postsAnalyzed={postsAnalyzed}
          daysOfData={daysOfData}
          insightsStatus={{
            available: insightsAvailable,
            errorCode: insightsError,
            errorMessage: insightsErrorMessage,
          }}
        />

        {/* Email Form - hidden in print mode */}
        {!isPrintMode && (
          <div className="no-print bg-card rounded-lg border p-6">
            <EmailForm analysisToken={token} />
          </div>
        )}

        {/* Footer */}
        {!shouldHideBranding && (
          <footer className="text-muted-foreground border-t pt-6 text-center text-sm">
            <p>
              Vygenerováno nástrojem{' '}
              <span className="text-foreground font-medium">Orchideo FB Triggers</span>
            </p>
          </footer>
        )}
        </div>
      </div>
    </ReportClientWrapper>
  )
}
