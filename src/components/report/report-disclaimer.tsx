'use client'

import { AlertTriangle } from 'lucide-react'
import { signIn } from 'next-auth/react'

interface ReportDisclaimerProps {
  expiresAt: Date | null
  postsAnalyzed: number
  daysOfData: number
  insightsStatus?: {
    available: boolean
    errorCode?: string | null
    errorMessage?: string | null
  }
}

export function ReportDisclaimer({
  expiresAt,
  postsAnalyzed,
  daysOfData,
  insightsStatus,
}: ReportDisclaimerProps) {
  // Determine insights message based on error code
  const insightsMessage = (() => {
    if (insightsStatus?.available) {
      return 'Insights metriky (reach, impressions) jsou k dispozici'
    }

    switch (insightsStatus?.errorCode) {
      case 'PERMISSION_DENIED':
        return (
          <>
            Chybí oprávnění pro insights metriky (reach, impressions).{' '}
            <button
              type="button"
              className="text-amber-800 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
              onClick={() => signIn('facebook', { callbackUrl: '/analyze' })}
            >
              Přihlaste se znovu
            </button>{' '}
            přes Facebook pro opravu.
          </>
        )
      case 'NOT_SUPPORTED':
        return 'Insights metriky nejsou pro tuto stránku dostupné (např. málo sledujících)'
      case 'RATE_LIMITED':
        return 'Insights metriky dočasně nedostupné (Facebook API limit). Zkuste později.'
      default:
        return 'Některé insights metriky nemusí být dostupné'
    }
  })()

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
        <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Důležité informace o tomto reportu</p>
          <ul className="list-inside list-disc space-y-1 text-amber-700 dark:text-amber-300">
            <li>
              Analyzováno {postsAnalyzed} příspěvků za posledních {daysOfData} dní
            </li>
            <li>{insightsMessage}</li>
            <li>
              Skóre vychází z obecných best practices a nemusí odpovídat specifikům vašeho oboru
            </li>
            {expiresAt && (
              <li>
                Report je platný do{' '}
                {expiresAt.toLocaleDateString('cs-CZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
