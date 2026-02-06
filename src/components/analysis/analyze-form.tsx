'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageSelector } from './page-selector'
import { FbConnectButton } from './fb-connect-button'
import { IndustrySelector } from './industry-selector'
import { CategoryMappingInfo } from './category-mapping-info'
import { AnalysisStickyActionBar } from './analysis-sticky-action-bar'
import { useFbPages, type FacebookPageItem } from '@/hooks/use-fb-pages'
import { getIndustryFromFbCategory, type IndustryCode } from '@/lib/constants/fb-category-map'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createAnalysisFormAction, type CreateAnalysisFormState } from '@/lib/actions/analysis-form'

interface AnalyzeFormProps {
  hasFacebookAccount: boolean
  onConnectFacebook: () => void
}

export function AnalyzeForm({ hasFacebookAccount, onConnectFacebook }: AnalyzeFormProps) {
  const router = useRouter()
  const { pages, isLoading, error, errorCode } = useFbPages()
  const [selectedPage, setSelectedPage] = React.useState<FacebookPageItem | null>(null)
  const [selectedIndustry, setSelectedIndustry] = React.useState<IndustryCode>('DEFAULT')
  const [suggestedIndustry, setSuggestedIndustry] = React.useState<IndustryCode>('DEFAULT')

  // React 19 useActionState for form submission with progressive enhancement
  const [formState, formAction, isPending] = React.useActionState<
    CreateAnalysisFormState | null,
    FormData
  >(createAnalysisFormAction, null)

  // Handle page selection
  const handleSelectPage = React.useCallback((page: FacebookPageItem) => {
    setSelectedPage(page)

    // Auto-detect industry from FB category
    const detectedIndustry = getIndustryFromFbCategory(page.category)
    setSuggestedIndustry(detectedIndustry)
    setSelectedIndustry(detectedIndustry)
  }, [])

  // Handle form state changes (success/error)
  React.useEffect(() => {
    if (!formState) return

    if (formState.success && formState.data) {
      toast.success('Analýza zahájena')
      router.push(`/analyze/${formState.data.analysisId}`)
    } else if (!formState.success && formState.error) {
      toast.error(formState.error)
    }
  }, [formState, router])

  // Not connected to Facebook
  if (!hasFacebookAccount || errorCode === 'FACEBOOK_NOT_CONNECTED') {
    return <FbConnectButton onConnect={onConnectFacebook} />
  }

  // Token expired
  if (errorCode === 'TOKEN_EXPIRED') {
    return (
      <Card className="border-destructive">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Facebook token vypršel</CardTitle>
          <CardDescription>
            Váš Facebook token vypršel. Prosím přihlaste se znovu přes Facebook.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={onConnectFacebook}>Přihlásit se znovu</Button>
        </CardContent>
      </Card>
    )
  }

  // Other errors
  if (error && errorCode !== 'FACEBOOK_NOT_CONNECTED') {
    return (
      <Card className="border-destructive">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Chyba</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => window.location.reload()}>Zkusit znovu</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      {/* Add padding when sticky bar is visible */}
      <div className={cn('space-y-8', selectedPage && 'pb-32 sm:pb-24')}>
        <Card>
          <CardHeader>
            <CardTitle>Vyberte stránku k analýze</CardTitle>
            <CardDescription>
              Vyberte stránku, kterou chcete analyzovat. Můžete vyhledávat podle názvu, URL (např.
              facebook.com/vase-stranka) nebo ID. Zobrazeny jsou pouze stránky, ke kterým máte
              přístup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PageSelector
              pages={pages}
              selectedPageId={selectedPage?.id ?? null}
              onSelectPage={handleSelectPage}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {selectedPage && (
          <Card>
            <CardHeader>
              <CardTitle>Nastavení analýzy</CardTitle>
              <CardDescription>Vyberte obor pro porovnání s oborovým benchmarkem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/30 flex flex-col items-start gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">{selectedPage.name}</p>
                  {selectedPage.category && (
                    <p className="text-muted-foreground text-sm">{selectedPage.category}</p>
                  )}
                </div>
              </div>

              <IndustrySelector
                key={selectedPage?.id}
                value={selectedIndustry}
                onChange={setSelectedIndustry}
                suggestedIndustry={suggestedIndustry}
                fbCategory={selectedPage?.category}
                disabled={isPending}
              />

              {/* Button moved to sticky action bar */}
            </CardContent>
          </Card>
        )}

        {/* Category Mapping Reference - Separate informational card */}
        <CategoryMappingInfo />
      </div>

      {/* Sticky action bar with Server Action */}
      <AnalysisStickyActionBar
        selectedPage={selectedPage}
        selectedIndustry={selectedIndustry}
        isPending={isPending}
        formAction={formAction}
      />
    </div>
  )
}
