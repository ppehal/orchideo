import { Suspense } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { GroupListServer } from '@/components/competitors/group-list-server'
import { GroupListSkeleton } from '@/components/competitors/group-list-skeleton'
import { CreateGroupButton } from '@/components/competitors/create-group-button'

export const metadata = {
  title: 'Porovnání konkurentů',
}

// Fast: Get user's pages (lightweight query)
async function getPages(userId: string) {
  return prisma.facebookPage.findMany({
    where: {
      userId,
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
}

export default async function CompetitorsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Fast query - just get pages list for form
  const pages = await getPages(session.user.id)

  // Empty state if no pages
  if (pages.length === 0) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-6xl">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Žádné stránky"
            description="Pro vytvoření skupin konkurentů nejdříve analyzujte alespoň jednu Facebook stránku."
            action={
              <Button asChild>
                <Link href="/analyze">Analyzovat stránku</Link>
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        {/* Fast: Header + Create button render immediately */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Porovnání konkurentů</h1>
            <p className="text-muted-foreground mt-2">
              Porovnejte výkon vaší stránky s konkurencí.
            </p>
          </div>
          <CreateGroupButton pages={pages} />
        </div>

        {/* Slow: Groups list - progressive rendering with Suspense */}
        <Suspense fallback={<GroupListSkeleton />}>
          <GroupListServer />
        </Suspense>
      </div>
    </div>
  )
}
