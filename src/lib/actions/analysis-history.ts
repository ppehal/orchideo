/**
 * Query functions for analysis history.
 * These are query functions (not mutations), so they can throw on error.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { AnalysisStatus } from '@/generated/prisma/enums'

// ============================================================================
// Types
// ============================================================================

export interface AnalysisHistoryFilters {
  status?: string
  pageId?: string
  sort?: string
}

export interface AnalysisHistoryItem {
  id: string
  public_token: string
  page_name: string | null
  page_picture: string | null
  overall_score: number | null
  status: AnalysisStatus
  created_at: Date
  completed_at: Date | null
  expires_at: Date | null
  error_message: string | null
  fb_page_id: string | null
}

export interface UserPage {
  id: string
  name: string
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all analyses for the current user with optional filters.
 * Query function - throws on error (called from Server Component).
 */
export async function getUserAnalyses(
  filters: AnalysisHistoryFilters = {}
): Promise<AnalysisHistoryItem[]> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const { status, pageId, sort = 'newest' } = filters

  // Build where clause
  const where: {
    userId: string
    status?: AnalysisStatus | { in: AnalysisStatus[] }
    fb_page_id?: string
  } = {
    userId: session.user.id,
  }

  // Status filter
  if (status && status !== 'ALL') {
    if (status === 'IN_PROGRESS') {
      where.status = { in: ['PENDING', 'COLLECTING_DATA', 'ANALYZING'] }
    } else if (['COMPLETED', 'FAILED'].includes(status)) {
      where.status = status as AnalysisStatus
    }
  }

  // Page filter
  if (pageId && pageId !== 'ALL') {
    where.fb_page_id = pageId
  }

  // Build orderBy - use array for secondary sort when sorting by score
  type OrderByItem =
    | { created_at: 'asc' | 'desc' }
    | { overall_score: { sort: 'asc' | 'desc'; nulls: 'last' } }
  let orderBy: OrderByItem | OrderByItem[] = { created_at: 'desc' }

  switch (sort) {
    case 'oldest':
      orderBy = { created_at: 'asc' }
      break
    case 'best':
      // Put nulls last when sorting by best score
      orderBy = [{ overall_score: { sort: 'desc', nulls: 'last' } }, { created_at: 'desc' }]
      break
    case 'worst':
      // Put nulls last when sorting by worst score
      orderBy = [{ overall_score: { sort: 'asc', nulls: 'last' } }, { created_at: 'desc' }]
      break
    default:
      orderBy = { created_at: 'desc' }
  }

  const analyses = await prisma.analysis.findMany({
    where,
    select: {
      id: true,
      public_token: true,
      page_name: true,
      page_picture: true,
      overall_score: true,
      status: true,
      created_at: true,
      completed_at: true,
      expires_at: true,
      error_message: true,
      fb_page_id: true,
    },
    orderBy,
  })

  return analyses
}

/**
 * Get all Facebook pages for the current user (for filter dropdown).
 * Query function - throws on error (called from Server Component).
 */
export async function getUserPages(): Promise<UserPage[]> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const pages = await prisma.facebookPage.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return pages
}
