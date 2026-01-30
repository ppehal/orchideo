'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { PageSelector } from './page-selector'
import { UrlInputForm } from './url-input-form'
import { FbConnectButton } from './fb-connect-button'
import { IndustrySelector } from './industry-selector'
import { useFbPages, type FacebookPageItem } from '@/hooks/use-fb-pages'
import { getIndustryFromFbCategory, type IndustryCode } from '@/lib/constants/fb-category-map'
import { CLIENT_FETCH_TIMEOUT_MS } from '@/lib/config/timeouts'
import { toast } from 'sonner'

interface AnalyzeFormProps {
  hasFacebookAccount: boolean
  onConnectFacebook: () => void
}

export function AnalyzeForm({ hasFacebookAccount, onConnectFacebook }: AnalyzeFormProps) {
  const router = useRouter()
  const { pages, isLoading, error, errorCode } = useFbPages()
  const [selectedPage, setSelectedPage] = React.useState<FacebookPageItem | null>(null)
  const [highlightedPageId, setHighlightedPageId] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedIndustry, setSelectedIndustry] = React.useState<IndustryCode>('DEFAULT')
  const [suggestedIndustry, setSuggestedIndustry] = React.useState<IndustryCode>('DEFAULT')

  // Handle URL-based page highlighting
  const handleUrlParsed = React.useCallback((pageId: string | null) => {
    setHighlightedPageId(pageId)
    if (pageId) {
      // Auto-select if only one match
      setSelectedPage((prev) => (prev?.id === pageId ? prev : null))
    }
  }, [])

  // Handle page selection
  const handleSelectPage = React.useCallback((page: FacebookPageItem) => {
    setSelectedPage(page)
    setHighlightedPageId(null)

    // Auto-detect industry from FB category
    const detectedIndustry = getIndustryFromFbCategory(page.category)
    setSuggestedIndustry(detectedIndustry)
    setSelectedIndustry(detectedIndustry)
  }, [])

  // Handle form submission
  const handleSubmit = React.useCallback(async () => {
    if (!selectedPage) {
      toast.error('Vyberte stránku k analýze')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/analysis/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: selectedPage.id,
          industryCode: selectedIndustry,
        }),
        signal: AbortSignal.timeout(CLIENT_FETCH_TIMEOUT_MS),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Nepodařilo se spustit analýzu')
        return
      }

      toast.success('Analýza zahájena')
      router.push(`/analyze/${data.analysisId}`)
    } catch (err) {
      console.error('[AnalyzeForm]', err)
      toast.error('Nepodařilo se spustit analýzu')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedPage, selectedIndustry, router])

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zadejte URL stránky</CardTitle>
          <CardDescription>
            Vložte URL vaší Facebook stránky pro rychlé vyhledání, nebo vyberte ze seznamu níže.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UrlInputForm
            pages={pages}
            onUrlParsed={handleUrlParsed}
            disabled={isLoading || isSubmitting}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vaše stránky</CardTitle>
          <CardDescription>
            Vyberte stránku, kterou chcete analyzovat. Zobrazeny jsou pouze stránky, ke kterým máte
            přístup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PageSelector
            pages={pages}
            selectedPageId={selectedPage?.id ?? null}
            highlightedPageId={highlightedPageId}
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
              value={selectedIndustry}
              onChange={setSelectedIndustry}
              suggestedIndustry={suggestedIndustry}
              disabled={isSubmitting}
            />

            <div className="flex justify-end">
              <LoadingButton
                onClick={handleSubmit}
                loading={isSubmitting}
                loadingText="Spouštím analýzu..."
                size="lg"
                className="w-full sm:w-auto"
              >
                Spustit analýzu
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
