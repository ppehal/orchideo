import { AlertTriangle } from 'lucide-react'

interface ReportDisclaimerProps {
  expiresAt: Date | null
  postsAnalyzed: number
  daysOfData: number
}

export function ReportDisclaimer({ expiresAt, postsAnalyzed, daysOfData }: ReportDisclaimerProps) {
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
            <li>
              Některé metriky (např. reach, impressions) vyžadují oprávnění insights, které nemusí
              být dostupné
            </li>
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
