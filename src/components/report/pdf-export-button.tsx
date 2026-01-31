'use client'

import * as React from 'react'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'

import { LoadingButton } from '@/components/ui/loading-button'

interface PdfExportButtonProps {
  token: string
}

interface ExportState {
  isPending: boolean
  rateLimitedUntil: Date | null
}

export function PdfExportButton({ token }: PdfExportButtonProps) {
  const [state, setState] = React.useState<ExportState>({
    isPending: false,
    rateLimitedUntil: null,
  })

  const handleDownload = React.useCallback(async () => {
    if (state.isPending) return // Debounce

    setState((s) => ({ ...s, isPending: true }))
    const toastId = toast.loading('Generuji PDF...', {
      description: 'Obvykle trvá 10-30 sekund',
    })

    try {
      const res = await fetch(`/api/report/${token}/pdf`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
      })

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '3600', 10)
        setState((s) => ({
          ...s,
          rateLimitedUntil: new Date(Date.now() + retryAfter * 1000),
        }))
        toast.error('Limit dosažen', {
          id: toastId,
          description: `Zkuste znovu za ${Math.ceil(retryAfter / 60)} minut`,
        })
        return
      }

      if (!res.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Download blob
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${token}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('PDF staženo', { id: toastId })
    } catch (error) {
      console.error('[PdfExportButton]', error)
      toast.error('Generování PDF selhalo', { id: toastId })
    } finally {
      setState((s) => ({ ...s, isPending: false }))
    }
  }, [state.isPending, token])

  const isDisabled =
    state.isPending || Boolean(state.rateLimitedUntil && state.rateLimitedUntil > new Date())

  return (
    <LoadingButton
      variant="outline"
      loading={state.isPending}
      disabled={isDisabled}
      onClick={handleDownload}
      aria-label="Stáhnout report jako PDF"
    >
      <FileText className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">Stáhnout PDF</span>
      <span className="sm:hidden">PDF</span>
    </LoadingButton>
  )
}
