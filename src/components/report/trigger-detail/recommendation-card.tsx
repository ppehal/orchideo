'use client'

import { parseRecommendation } from '@/lib/utils/recommendation-parser'
import { ThumbsUp, Lightbulb } from 'lucide-react'

interface RecommendationCardProps {
  text: string
}

export function RecommendationCard({ text }: RecommendationCardProps) {
  const { assessment, tips } = parseRecommendation(text)

  // Fallback to single-column if no tips
  if (tips.length === 0) {
    return (
      <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    )
  }

  return (
    <div className="bg-primary/5 border-primary/20 rounded-lg border">
      <div className="grid gap-6 p-4 md:grid-cols-[300px_1fr]">
        {/* Left: Assessment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ThumbsUp className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">Vaše hodnocení</h4>
          </div>
          <p className="text-base leading-relaxed font-medium">{assessment}</p>
        </div>

        {/* Right: Tips */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-primary h-4 w-4" />
            <h4 className="text-sm font-semibold">Doporučené kroky</h4>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-primary mt-1 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
