'use server'

import { prisma } from '@/lib/prisma'
import { auth, getFacebookAccessToken } from '@/lib/auth'
import {
  getPageMetadata,
  getManagedPagesWithTokens,
  FacebookApiError,
} from '@/lib/integrations/facebook'
import { encrypt } from '@/lib/utils/encryption'
import { createLogger } from '@/lib/logging'
import { startAnalysisInBackground } from '@/lib/services/analysis/runner'
import { type AnalysisStatus } from '../../generated/prisma/enums'

const log = createLogger('action-analysis')

const REPORT_EXPIRATION_DAYS = parseInt(process.env.REPORT_EXPIRATION_DAYS || '30', 10)

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface CreateAnalysisResult {
  analysisId: string
  publicToken: string
}

export async function createAnalysis(
  pageId: string,
  industryCode: string = 'DEFAULT'
): Promise<ActionResult<CreateAnalysisResult>> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' }
  }

  const userId = session.user.id

  log.info({ user_id: userId, fb_page_id: pageId }, 'Creating analysis')

  try {
    // Get user's Facebook access token
    const userAccessToken = await getFacebookAccessToken(userId)

    if (!userAccessToken) {
      return {
        success: false,
        error: 'Facebook účet není propojen',
        code: 'FACEBOOK_NOT_CONNECTED',
      }
    }

    // Get the page access token for this specific page
    const pages = await getManagedPagesWithTokens(userAccessToken)
    const page = pages.find((p) => p.id === pageId)

    if (!page) {
      return {
        success: false,
        error: 'Nemáte přístup k této stránce',
        code: 'PAGE_NOT_FOUND',
      }
    }

    // Get full page metadata
    const pageMetadata = await getPageMetadata(pageId, page.access_token)

    // Encrypt the page access token
    const encryptedToken = encrypt(page.access_token)

    // Upsert the FacebookPage
    const facebookPage = await prisma.facebookPage.upsert({
      where: { fb_page_id: pageId },
      update: {
        name: pageMetadata.name,
        category: pageMetadata.category,
        fan_count: pageMetadata.fan_count,
        picture_url: pageMetadata.picture_url,
        cover_url: pageMetadata.cover_url,
        page_access_token: encryptedToken,
        // Don't update userId - keep the original creator
      },
      create: {
        fb_page_id: pageId,
        name: pageMetadata.name,
        category: pageMetadata.category,
        fan_count: pageMetadata.fan_count,
        picture_url: pageMetadata.picture_url,
        cover_url: pageMetadata.cover_url,
        page_access_token: encryptedToken,
        userId,
      },
    })

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REPORT_EXPIRATION_DAYS)

    // Create the Analysis record
    const analysis = await prisma.analysis.create({
      data: {
        status: 'PENDING' as AnalysisStatus,
        page_name: pageMetadata.name,
        page_picture: pageMetadata.picture_url,
        page_fan_count: pageMetadata.fan_count,
        industry_code: industryCode,
        expires_at: expiresAt,
        userId,
        fb_page_id: facebookPage.id,
      },
    })

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'analysis_started',
        analysisId: analysis.id,
        metadata: {
          fb_page_id: pageId,
          page_name: pageMetadata.name,
          fan_count: pageMetadata.fan_count,
          industry_code: industryCode,
        },
      },
    })

    log.info(
      { user_id: userId, analysis_id: analysis.id, fb_page_id: pageId },
      'Analysis created successfully'
    )

    // Start the analysis in the background
    startAnalysisInBackground(analysis.id)

    return {
      success: true,
      data: {
        analysisId: analysis.id,
        publicToken: analysis.public_token,
      },
    }
  } catch (error) {
    if (error instanceof FacebookApiError) {
      log.error(
        { user_id: userId, fb_page_id: pageId, error_code: error.code },
        'Facebook API error while creating analysis'
      )

      if (error.isTokenExpired()) {
        return {
          success: false,
          error: 'Facebook token vypršel, prosím přihlaste se znovu',
          code: 'TOKEN_EXPIRED',
        }
      }

      if (error.isPermissionDenied()) {
        return {
          success: false,
          error: 'Nemáte oprávnění pro přístup k této stránce',
          code: 'PERMISSION_DENIED',
        }
      }

      return {
        success: false,
        error: 'Chyba při komunikaci s Facebook API',
        code: 'FACEBOOK_API_ERROR',
      }
    }

    log.error({ user_id: userId, fb_page_id: pageId, error }, 'Unexpected error creating analysis')

    return {
      success: false,
      error: 'Neočekávaná chyba při vytváření analýzy',
      code: 'INTERNAL_ERROR',
    }
  }
}

export async function getAnalysisStatus(
  analysisId: string
): Promise<ActionResult<{ status: AnalysisStatus; progress?: number }>> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' }
  }

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      userId: session.user.id,
    },
    select: {
      status: true,
    },
  })

  if (!analysis) {
    return { success: false, error: 'Analýza nenalezena', code: 'NOT_FOUND' }
  }

  // Calculate progress based on status
  const progressMap: Record<AnalysisStatus, number> = {
    PENDING: 0,
    COLLECTING_DATA: 30,
    ANALYZING: 70,
    COMPLETED: 100,
    FAILED: 100,
  }

  return {
    success: true,
    data: {
      status: analysis.status,
      progress: progressMap[analysis.status],
    },
  }
}
