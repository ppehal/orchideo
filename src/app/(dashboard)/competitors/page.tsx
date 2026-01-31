import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GroupList } from '@/components/competitors'

export const metadata = {
  title: 'Porovnání konkurentů',
}

export default async function CompetitorsPage() {
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
      picture_url: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Porovnání konkurentů</h1>
          <p className="text-muted-foreground mt-2">Porovnejte výkon vaší stránky s konkurencí.</p>
        </div>

        <GroupList pages={pages} />
      </div>
    </div>
  )
}
