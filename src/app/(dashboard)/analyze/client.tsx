'use client'

import { useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { AnalyzeForm } from '@/components/analysis'

interface AnalyzePageClientProps {
  hasFacebookAccount: boolean
}

export function AnalyzePageClient({ hasFacebookAccount }: AnalyzePageClientProps) {
  const handleConnectFacebook = useCallback(() => {
    signIn('facebook', { callbackUrl: '/analyze' })
  }, [])

  return (
    <AnalyzeForm
      hasFacebookAccount={hasFacebookAccount}
      onConnectFacebook={handleConnectFacebook}
    />
  )
}
