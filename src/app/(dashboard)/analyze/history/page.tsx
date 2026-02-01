import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getUserAnalyses, getUserPages } from '@/lib/actions/analysis-history'
import { AnalysisHistoryClient } from './client'

export const metadata = {
  title: 'Historie analýz',
}

interface SearchParams {
  status?: string
  page?: string
  sort?: string
}

export default async function AnalysisHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const params = await searchParams

  const [analyses, pages] = await Promise.all([
    getUserAnalyses({
      status: params.status,
      pageId: params.page,
      sort: params.sort,
    }),
    getUserPages(),
  ])

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Historie analýz</h1>
          <p className="text-muted-foreground mt-2">
            Přehled všech provedených analýz vašich Facebook stránek.
          </p>
        </div>

        <AnalysisHistoryClient
          initialAnalyses={analyses}
          pages={pages}
          initialFilters={{
            status: params.status ?? 'ALL',
            pageId: params.page ?? 'ALL',
            sort: params.sort ?? 'newest',
          }}
        />
      </div>
    </div>
  )
}
