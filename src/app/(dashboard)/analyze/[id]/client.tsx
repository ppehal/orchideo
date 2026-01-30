'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { AnalysisStatus } from '@/generated/prisma/enums'

interface AnalysisProgressClientProps {
  analysisId: string
  pageName: string | null
  pagePicture: string | null
  initialStatus: AnalysisStatus
  errorMessage: string | null
  publicToken: string
}

const STATUS_LABELS: Record<AnalysisStatus, string> = {
  PENDING: 'Čekání na zpracování...',
  COLLECTING_DATA: 'Stahování dat z Facebooku...',
  ANALYZING: 'Vyhodnocování triggerů...',
  COMPLETED: 'Analýza dokončena',
  FAILED: 'Analýza selhala',
}

const STATUS_PROGRESS: Record<AnalysisStatus, number> = {
  PENDING: 5,
  COLLECTING_DATA: 40,
  ANALYZING: 75,
  COMPLETED: 100,
  FAILED: 100,
}

const POLL_INTERVAL_MS = 2500 // 2.5 seconds

export function AnalysisProgressClient({
  analysisId,
  pageName,
  pagePicture,
  initialStatus,
  errorMessage,
  publicToken,
}: AnalysisProgressClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState<AnalysisStatus>(initialStatus)
  const [error, setError] = useState<string | null>(errorMessage)
  const [progress, setProgress] = useState(STATUS_PROGRESS[initialStatus])

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/status`)
      const data = await response.json()

      if (response.ok) {
        setStatus(data.status)
        setProgress(data.progress ?? STATUS_PROGRESS[data.status as AnalysisStatus])

        if (data.status === 'COMPLETED') {
          // Redirect to report after a short delay
          setTimeout(() => {
            router.push(`/report/${publicToken}`)
          }, 1000)
        } else if (data.status === 'FAILED') {
          setError(data.errorMessage || 'Analýza selhala')
        }
      }
    } catch (err) {
      console.error('[AnalysisProgress]', err)
    }
  }, [analysisId, publicToken, router])

  useEffect(() => {
    if (status === 'COMPLETED' || status === 'FAILED') {
      return
    }

    const interval = setInterval(pollStatus, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [status, pollStatus])

  const isFailed = status === 'FAILED'
  const isCompleted = status === 'COMPLETED'

  return (
    <Card>
      <CardHeader className="text-center">
        {pagePicture && (
          <div className="mx-auto mb-4">
            <div className="bg-muted relative h-20 w-20 overflow-hidden rounded-full">
              <Image src={pagePicture} alt={pageName || 'Page'} fill className="object-cover" />
            </div>
          </div>
        )}
        <CardTitle>{pageName || 'Analýza stránky'}</CardTitle>
        <CardDescription>
          {isFailed ? 'Došlo k chybě při analýze' : STATUS_LABELS[status]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isFailed && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-muted-foreground text-center text-sm">{progress}%</p>
          </div>
        )}

        {isFailed && error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-4 text-center">
            <p>{error}</p>
          </div>
        )}

        {isCompleted && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Přesměrování na report...</p>
          </div>
        )}

        {isFailed && (
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push('/analyze')}>
              Zkusit jinou stránku
            </Button>
            <Button onClick={() => window.location.reload()}>Zkusit znovu</Button>
          </div>
        )}

        {!isFailed && !isCompleted && (
          <p className="text-muted-foreground text-center text-sm">
            Analýza může trvat až minutu v závislosti na množství dat na stránce.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
