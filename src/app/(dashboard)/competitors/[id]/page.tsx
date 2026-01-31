import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { ComparisonView } from '@/components/competitors'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params

  const group = await prisma.competitorGroup.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: group ? `${group.name} - Porovnání` : 'Porovnání',
  }
}

export default async function CompetitorDetailPage({ params }: Props) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params

  // Verify ownership
  const group = await prisma.competitorGroup.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: { id: true },
  })

  if (!group) {
    notFound()
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        <ComparisonView groupId={id} />
      </div>
    </div>
  )
}
