import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/date-utils'
import { Users, Calendar } from 'lucide-react'
import { CategoryMappingBadge } from '@/components/ui/category-mapping-badge'
import { sanitizeIndustryCode } from '@/lib/constants/industry-validation'

interface ReportHeaderProps {
  pageName: string
  pagePicture: string | null
  fanCount: number | null
  createdAt: Date
  industry?: string
  fbCategory?: string | null
}

export function ReportHeader({
  pageName,
  pagePicture,
  fanCount,
  createdAt,
  industry,
  fbCategory,
}: ReportHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {pagePicture ? (
            <Image
              src={pagePicture}
              alt={pageName}
              width={80}
              height={80}
              className="border-background rounded-full border-4 shadow-lg"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold">
              {pageName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold sm:text-3xl">{pageName}</h1>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
              {fanCount !== null && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{fanCount.toLocaleString('cs-CZ')} fanoušků</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Analýza z {formatDate(createdAt)}</span>
              </div>
              {fbCategory && (
                <CategoryMappingBadge
                  fbCategory={fbCategory}
                  industryCode={sanitizeIndustryCode(industry)}
                  variant="compact"
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
