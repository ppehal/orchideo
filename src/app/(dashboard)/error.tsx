'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="container py-12">
      <EmptyState
        icon={<AlertCircle className="h-12 w-12" />}
        title="Něco se pokazilo"
        description="Při načítání dat došlo k chybě."
        action={<Button onClick={reset}>Zkusit znovu</Button>}
      />
    </div>
  )
}
