/**
 * Backfill script to create snapshots for existing completed analyses.
 *
 * Usage:
 *   npx tsx scripts/backfill-snapshots.ts
 *
 * Options:
 *   --dry-run    Show what would be created without making changes
 *   --limit=N    Process only N analyses (default: all)
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'

// Inline constants to avoid import issues
const SCORING_VERSION = '1.0'
const BENCHMARK_VERSION = '1.0'

// Inline types to avoid import issues
interface NormalizedPost {
  reactions_count: number
  comments_count: number
  shares_count: number
  total_engagement: number
}

interface AnalysisRawData {
  pageData: {
    fan_count: number | null
  }
  posts90d: NormalizedPost[]
  collectionMetadata: {
    daysOfData: number
  }
}

const prisma = new PrismaClient()

interface SnapshotData {
  analysisId: string
  fb_page_id: string
  overall_score: number
  engagement_rate: number | null
  avg_reactions: number | null
  avg_comments: number | null
  avg_shares: number | null
  posts_per_week: number | null
  fan_count: number | null
  scoring_version: string
  benchmark_version: string
}

function calculatePostsPerWeek(posts: NormalizedPost[], daysOfData: number): number | null {
  if (posts.length === 0 || daysOfData <= 0) {
    return null
  }
  const weeks = daysOfData / 7
  return posts.length / weeks
}

function extractMetrics(rawData: AnalysisRawData): {
  engagementRate: number | null
  avgReactions: number | null
  avgComments: number | null
  avgShares: number | null
  postsPerWeek: number | null
} {
  const posts = rawData.posts90d

  if (posts.length === 0) {
    return {
      engagementRate: null,
      avgReactions: null,
      avgComments: null,
      avgShares: null,
      postsPerWeek: null,
    }
  }

  const totalReactions = posts.reduce((sum, p) => sum + p.reactions_count, 0)
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0)
  const totalShares = posts.reduce((sum, p) => sum + p.shares_count, 0)
  const totalEngagement = posts.reduce((sum, p) => sum + p.total_engagement, 0)

  const avgReactions = totalReactions / posts.length
  const avgComments = totalComments / posts.length
  const avgShares = totalShares / posts.length

  const fanCount = rawData.pageData.fan_count
  const engagementRate = fanCount && fanCount > 0 ? totalEngagement / posts.length / fanCount : null

  const postsPerWeek = calculatePostsPerWeek(posts, rawData.collectionMetadata.daysOfData)

  return {
    engagementRate,
    avgReactions,
    avgComments,
    avgShares,
    postsPerWeek,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limitValue = limitArg?.split('=')[1]
  const limit = limitValue ? parseInt(limitValue, 10) : undefined

  console.log('=== Snapshot Backfill Script ===')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (limit) console.log(`Limit: ${limit}`)
  console.log('')

  // Get all completed analyses without snapshots
  const analyses = await prisma.analysis.findMany({
    where: {
      status: 'COMPLETED',
      overall_score: { not: null },
      fb_page_id: { not: null },
      snapshot: null, // No existing snapshot
    },
    include: {
      facebookPage: {
        select: {
          id: true,
          fan_count: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  })

  console.log(`Found ${analyses.length} analyses without snapshots`)
  console.log('')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const analysis of analyses) {
    try {
      if (!analysis.facebookPage) {
        console.log(`[SKIP] ${analysis.id}: No Facebook page`)
        skipped++
        continue
      }

      const rawData = analysis.rawData as AnalysisRawData | null

      if (!rawData) {
        console.log(`[SKIP] ${analysis.id}: No raw data`)
        skipped++
        continue
      }

      const metrics = extractMetrics(rawData)

      const snapshotData: SnapshotData = {
        analysisId: analysis.id,
        fb_page_id: analysis.facebookPage.id,
        overall_score: analysis.overall_score!,
        engagement_rate: metrics.engagementRate,
        avg_reactions: metrics.avgReactions,
        avg_comments: metrics.avgComments,
        avg_shares: metrics.avgShares,
        posts_per_week: metrics.postsPerWeek,
        fan_count: analysis.page_fan_count ?? analysis.facebookPage.fan_count,
        scoring_version: SCORING_VERSION,
        benchmark_version: BENCHMARK_VERSION,
      }

      if (dryRun) {
        console.log(
          `[DRY] ${analysis.id}: Would create snapshot (score: ${snapshotData.overall_score})`
        )
      } else {
        await prisma.analysisSnapshot.create({ data: snapshotData })
        console.log(`[OK]  ${analysis.id}: Created snapshot (score: ${snapshotData.overall_score})`)
      }

      created++
    } catch (error) {
      console.error(
        `[ERR] ${analysis.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      errors++
    }
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors:  ${errors}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
