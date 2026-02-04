import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GroupCard } from './group-card'

interface Page {
  id: string
  name: string
  picture_url: string | null
}

interface CompetitorGroup {
  id: string
  name: string
  description: string | null
  primaryPage: Page
  competitors: Page[]
  comparisonsCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Server Component for fetching and displaying competitor groups.
 * Can be wrapped in Suspense for progressive rendering.
 */
export async function GroupListServer() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  // Fetch groups with all related data
  const rawGroups = await prisma.competitorGroup.findMany({
    where: { userId: session.user.id },
    include: {
      primaryPage: {
        select: { id: true, name: true, picture_url: true },
      },
      competitorPages: {
        include: {
          facebookPage: {
            select: { id: true, name: true, picture_url: true },
          },
        },
      },
      _count: {
        select: { comparisons: true },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  // Transform to match client interface
  const groups: CompetitorGroup[] = rawGroups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    primaryPage: g.primaryPage,
    competitors: g.competitorPages.map((cp) => cp.facebookPage),
    comparisonsCount: g._count.comparisons,
    createdAt: g.created_at.toISOString(),
    updatedAt: g.updated_at.toISOString(),
  }))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}
