import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NullValue } from '@/components/ui/null-value'

export interface InputParameter {
  key: string
  label: string
  value: string | number | null
}

interface InputParametersCardProps {
  parameters: InputParameter[]
}

export function InputParametersCard({ parameters }: InputParametersCardProps) {
  if (parameters.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Vstupní parametry</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {parameters.map((param) => (
            <div key={param.key} className="flex justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-muted-foreground text-sm">{param.label}</span>
              <span className="text-sm font-medium">
                {param.value !== null && param.value !== undefined ? param.value : <NullValue />}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
