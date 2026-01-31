'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NullValue } from '@/components/ui/null-value'
import { TrendIndicator } from './trend-indicator'
import { TrendChart } from './trend-chart'
import type { TrendData } from '@/types/trends'

const METRIC_LABELS: Record<string, string> = {
  overallScore: 'Celkové skóre',
  engagementRate: 'Engagement Rate',
  postsPerWeek: 'Příspěvky/týden',
  avgReactions: 'Prům. reakce',
  avgComments: 'Prům. komentáře',
  avgShares: 'Prům. sdílení',
}

interface TrendCardProps {
  metricKey: string
  data: TrendData
}

function formatMetricValue(key: string, value: number): string {
  if (key === 'engagementRate') {
    return `${value.toFixed(2)}%`
  }
  if (key === 'overallScore') {
    return `${Math.round(value)}`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toFixed(1)
}

export function TrendCard({ metricKey, data }: TrendCardProps) {
  const label = METRIC_LABELS[metricKey] ?? metricKey

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="flex items-baseline gap-2">
          {data.currentValue !== null ? (
            <>
              <span className="text-2xl font-bold">
                {formatMetricValue(metricKey, data.currentValue)}
              </span>
              <TrendIndicator
                direction={data.direction}
                changePercent={data.changePercent}
                isSignificant={data.isSignificant}
              />
            </>
          ) : (
            <NullValue />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-[4/1] w-full min-w-[200px]">
          {data.dataPoints.length >= 2 ? (
            <TrendChart dataPoints={data.dataPoints} />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              Nedostatek dat pro graf
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
