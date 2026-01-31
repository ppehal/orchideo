'use client'

import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TrendDataPoint } from '@/types/trends'

interface TrendChartProps {
  dataPoints: TrendDataPoint[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

export function TrendChart({ dataPoints }: TrendChartProps) {
  // Generate unique gradient ID for this chart instance
  const gradientId = React.useId()

  // Reverse to show chronologically (oldest first)
  const chartData = [...dataPoints].reverse()

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          dot={chartData.length <= 5}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null
            const point = payload[0].payload as TrendDataPoint
            return (
              <div className="bg-popover rounded border px-2 py-1 text-sm shadow-md">
                <div className="text-muted-foreground text-xs">{formatDate(point.date)}</div>
                <div className="font-medium">{point.value.toLocaleString('cs-CZ')}</div>
              </div>
            )
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
