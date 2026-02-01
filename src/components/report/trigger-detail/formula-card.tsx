import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Code2 } from 'lucide-react'

interface FormulaCardProps {
  formula: string
  categoryKey?: string
  metrics?: Record<string, string | number | null>
}

export function FormulaCard({ formula, categoryKey, metrics }: FormulaCardProps) {
  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-400">
            Výpočetní vzorec (debug)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formula */}
        <pre className="bg-muted/50 rounded-md p-3 font-mono text-sm whitespace-pre-wrap">
          {formula}
        </pre>

        {/* Category key */}
        {categoryKey && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Kategorie:</span>
            <Badge variant="outline" className="font-mono">
              {categoryKey}
            </Badge>
          </div>
        )}

        {/* Raw metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Raw metriky:</span>
            <pre className="bg-muted/50 overflow-x-auto rounded-md p-2 font-mono text-xs">
              {JSON.stringify(
                Object.fromEntries(Object.entries(metrics).filter(([k]) => !k.startsWith('_'))),
                null,
                2
              )}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
