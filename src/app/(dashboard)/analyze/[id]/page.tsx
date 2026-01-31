'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useAnalysisStatus } from '@/hooks/use-analysis-status'
import { CLIENT_FETCH_TIMEOUT_MS } from '@/lib/config/timeouts'

const STATUS_MESSAGES = {
  PENDING: {
    title: 'Analýza se připravuje',
    description: 'Připravujeme analýzu vaší Facebook stránky...',
  },
  COLLECTING_DATA: {
    title: 'Sbíráme data',
    description: 'Stahujeme příspěvky a statistiky z vaší stránky...',
  },
  ANALYZING: {
    title: 'Analyzujeme',
    description: 'Vyhodnocujeme výkon vaší stránky...',
  },
  COMPLETED: {
    title: 'Hotovo!',
    description: 'Analýza je dokončena. Přesměrováváme na report...',
  },
  FAILED: {
    title: 'Analýza selhala',
    description: 'Při analýze nastala chyba.',
  },
} as const

type StatusKey = keyof typeof STATUS_MESSAGES

export default function AnalysisProgressPage() {
  const params = useParams()
  const router = useRouter()
  const analysisId = params.id as string

  const { status, progress, isLoading, error } = useAnalysisStatus(analysisId, {
    pollingInterval: 2500,
    onComplete: () => {
      // Will redirect when we get the public token
    },
  })

  // Redirect to report when completed
  useEffect(() => {
    if (status === 'COMPLETED') {
      // Fetch the public token and redirect
      fetch(`/api/analysis/${analysisId}/status`, {
        signal: AbortSignal.timeout(CLIENT_FETCH_TIMEOUT_MS),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.publicToken) {
            router.push(`/report/${data.data.publicToken}`)
          }
        })
        .catch(console.error)
    }
  }, [status, analysisId, router])

  const statusKey = status && status in STATUS_MESSAGES ? (status as StatusKey) : 'PENDING'
  const statusInfo = STATUS_MESSAGES[statusKey]

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'FAILED' ? (
              <AlertCircle className="text-destructive h-12 w-12" />
            ) : status === 'COMPLETED' ? (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            ) : (
              <Loader2 className="text-primary h-12 w-12 animate-spin" />
            )}
          </div>
          <CardTitle className="text-2xl">{statusInfo.title}</CardTitle>
          <CardDescription>{statusInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status !== 'FAILED' && (
            <div className="space-y-2">
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>Průběh</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {status === 'FAILED' && (
            <div className="space-y-4">
              {error && <p className="text-destructive text-center text-sm">{error}</p>}
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => router.push('/analyze')}>
                  Zkusit znovu
                </Button>
              </div>
            </div>
          )}

          {status !== 'FAILED' && status !== 'COMPLETED' && (
            <p className="text-muted-foreground text-center text-sm">
              Prosím nevypínejte tuto stránku. Analýza obvykle trvá 1-2 minuty.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
