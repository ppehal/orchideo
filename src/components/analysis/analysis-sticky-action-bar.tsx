'use client'

import Image from 'next/image'
import { LoadingButton } from '@/components/ui/loading-button'
import { INDUSTRIES } from '@/lib/constants/fb-category-map'
import type { FacebookPageItem } from '@/hooks/use-fb-pages'
import type { IndustryCode } from '@/lib/constants/fb-category-map'

interface AnalysisStickyActionBarProps {
  selectedPage: FacebookPageItem | null
  selectedIndustry: IndustryCode
  isPending: boolean
  formAction: (formData: FormData) => void
}

export function AnalysisStickyActionBar({
  selectedPage,
  selectedIndustry,
  isPending,
  formAction,
}: AnalysisStickyActionBarProps) {
  if (!selectedPage) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-4">
        <div className="mx-auto max-w-2xl">
          <form action={formAction}>
            {/* Hidden inputs for form data */}
            <input type="hidden" name="pageId" value={selectedPage.id} />
            <input type="hidden" name="industryCode" value={selectedIndustry} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: Page summary */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  {selectedPage.picture_url ? (
                    <Image
                      src={selectedPage.picture_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                      {selectedPage.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{selectedPage.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {INDUSTRIES[selectedIndustry].name}
                  </p>
                </div>
              </div>

              {/* Right: Action button */}
              <LoadingButton
                type="submit"
                loading={isPending}
                loadingText="Spouštím..."
                size="lg"
                className="w-full sm:w-auto shrink-0"
              >
                Spustit analýzu
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
