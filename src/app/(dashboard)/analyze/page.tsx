import { redirect } from 'next/navigation'
import { auth, hasFacebookAccount } from '@/lib/auth'
import { AnalyzePageClient } from './client'

export const metadata = {
  title: 'Analyzovat stránku',
}

export default async function AnalyzePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const hasFbAccount = await hasFacebookAccount(session.user.id)

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analyzovat Facebook stránku</h1>
          <p className="text-muted-foreground mt-2">
            Vyberte stránku, kterou chcete analyzovat. Analýza zabere přibližně minutu.
          </p>
        </div>

        <AnalyzePageClient hasFacebookAccount={hasFbAccount} />
      </div>
    </div>
  )
}
