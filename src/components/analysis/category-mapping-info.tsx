'use client'

import * as React from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  getGroupedMappings,
  INDUSTRIES,
  type IndustryCode,
} from '@/lib/constants/fb-category-map'

/**
 * Expandable section showing all Facebook category mappings grouped by industry
 * Default: collapsed
 */
export function CategoryMappingInfo() {
  const [isOpen, setIsOpen] = React.useState(false)
  const groupedMappings = getGroupedMappings()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Referenční seznam Facebook kategorií
        </CardTitle>
        <CardDescription>
          Přehled všech Facebook kategorií a jejich mapování na obory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="category-mapping-content"
          className="flex min-h-11 w-full items-center gap-2 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {isOpen ? 'Skrýt mapování' : 'Zobrazit mapování'}
        </button>

        {isOpen && (
          <div id="category-mapping-content" className="mt-4 space-y-4">
            {Object.entries(groupedMappings)
              .filter(([code]) => code !== 'DEFAULT')
              .map(([industryCode, categories]) => (
                <div key={industryCode}>
                  <h4 className="font-medium text-sm mb-2">
                    {INDUSTRIES[industryCode as IndustryCode].name}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({categories.length} kategorií)
                    </span>
                  </h4>
                  <div className="text-muted-foreground text-sm space-y-1">
                    {categories.map((cat) => (
                      <div key={cat} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
