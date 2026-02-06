'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { isValidEmail } from '@/lib/validators/email'
import { CLIENT_FETCH_TIMEOUT_MS } from '@/lib/config/timeouts.client'

interface EmailFormProps {
  analysisToken: string
}

export function EmailForm({ analysisToken }: EmailFormProps) {
  const [email, setEmail] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSent, setIsSent] = React.useState(false)

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isValidEmail(email)) {
        toast.error('Neplatný email', {
          description: 'Zadejte platnou emailovou adresu.',
        })
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/email/send-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            analysisToken,
          }),
          signal: AbortSignal.timeout(CLIENT_FETCH_TIMEOUT_MS),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Nepodařilo se odeslat email')
        }

        setIsSent(true)
        toast.success('Email odeslán', {
          description: `Odkaz na report byl odeslán na ${email}`,
        })
      } catch (error) {
        console.error('[EmailForm]', error)
        toast.error('Chyba při odesílání', {
          description: error instanceof Error ? error.message : 'Zkuste to prosím znovu.',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [email, analysisToken]
  )

  if (isSent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-800">
          <Mail className="h-4 w-4" />
          <span className="text-sm font-medium">Email odeslán na {email}</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="email" className="text-muted-foreground mb-1.5 block text-sm font-medium">
          Pošlete si odkaz na report
        </label>
        <Input
          id="email"
          type="email"
          placeholder="vas@email.cz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full"
        />
      </div>
      <LoadingButton type="submit" loading={isLoading} disabled={!email.trim()}>
        <Mail className="mr-2 h-4 w-4" />
        Odeslat
      </LoadingButton>
    </form>
  )
}
