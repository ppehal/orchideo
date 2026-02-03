'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { parseFacebookUrl, matchPageByIdentifier } from '@/lib/utils/url-parser'
import type { FacebookPageItem } from '@/hooks/use-fb-pages'

interface UrlInputFormProps {
  pages: FacebookPageItem[]
  onUrlParsed: (pageId: string | null) => void
  disabled?: boolean
}

export function UrlInputForm({ pages, onUrlParsed, disabled }: UrlInputFormProps) {
  const [url, setUrl] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!url.trim()) {
        setError(null)
        onUrlParsed(null)
        return
      }

      const parsed = parseFacebookUrl(url)

      if (!parsed) {
        setError('Neplatná Facebook URL')
        onUrlParsed(null)
        return
      }

      // Try to match with available pages
      const matchedPage = matchPageByIdentifier(
        pages.map((p) => ({ id: p.id, name: p.name, username: p.username })),
        parsed.value
      )

      if (matchedPage) {
        setError(null)
        onUrlParsed(matchedPage.id)
      } else {
        setError(
          `Stránka "${parsed.value}" nebyla nalezena mezi vašimi stránkami. Vyberte ji prosím ze seznamu níže.`
        )
        onUrlParsed(null)
      }
    },
    [url, pages, onUrlParsed]
  )

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setUrl(value)
      setError(null)

      // Auto-match on change if URL is valid
      if (value.trim()) {
        const parsed = parseFacebookUrl(value)
        if (parsed) {
          const matchedPage = matchPageByIdentifier(
            pages.map((p) => ({ id: p.id, name: p.name, username: p.username })),
            parsed.value
          )
          if (matchedPage) {
            onUrlParsed(matchedPage.id)
            return
          }
        }
      }
      onUrlParsed(null)
    },
    [pages, onUrlParsed]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          placeholder="https://facebook.com/vase-stranka"
          value={url}
          onChange={handleChange}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={disabled || !url.trim()}
          className="w-full sm:w-auto"
        >
          Najít
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  )
}
