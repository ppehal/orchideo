import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnalysisProgressClient } from './client'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: { page_name: true },
  })

  return {
    title: analysis?.page_name ? `Analýza: ${analysis.page_name}` : 'Analýza',
  }
}

export default async function AnalysisProgressPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      public_token: true,
      page_name: true,
      page_picture: true,
      error_message: true,
    },
  })

  if (!analysis) {
    notFound()
  }

  // If already completed, redirect to report
  if (analysis.status === 'COMPLETED') {
    redirect(`/report/${analysis.public_token}`)
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-xl">
        <AnalysisProgressClient
          analysisId={analysis.id}
          pageName={analysis.page_name}
          pagePicture={analysis.page_picture}
          initialStatus={analysis.status}
          errorMessage={analysis.error_message}
          publicToken={analysis.public_token}
        />
      </div>
    </div>
  )
}
