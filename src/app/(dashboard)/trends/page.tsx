import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { TrendsClient } from './client'

export const metadata = {
  title: 'Trendy',
}

export default async function TrendsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get user's pages that have at least one completed analysis
  const pages = await prisma.facebookPage.findMany({
    where: {
      userId: session.user.id,
      analyses: {
        some: {
          status: 'COMPLETED',
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Trendy</h1>
          <p className="text-muted-foreground mt-2">
            Sledujte vývoj klíčových metrik vašich stránek v čase.
          </p>
        </div>

        <TrendsClient pages={pages} />
      </div>
    </div>
  )
}
