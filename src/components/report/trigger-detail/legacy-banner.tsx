import { Info } from 'lucide-react'

export function LegacyAnalysisBanner() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex gap-3">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Příklady postů nejsou dostupné
          </p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            Spusťte novou analýzu pro zobrazení konkrétních příkladů postů z vašeho Facebooku.
          </p>
        </div>
      </div>
    </div>
  )
}
