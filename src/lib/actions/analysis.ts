'use server'

import { prisma } from '@/lib/prisma'
import { getFacebookAccessToken } from '@/lib/auth'
import {
  getPageMetadata,
  getManagedPagesWithTokens,
  FacebookApiError,
} from '@/lib/integrations/facebook'
import { encrypt } from '@/lib/utils/encryption'
import { generateSecureToken } from '@/lib/utils/tokens'
import { createLogger } from '@/lib/logging'
import { startAnalysisInBackground } from '@/lib/services/analysis/runner'
import { type AnalysisStatus } from '../../generated/prisma/enums'
import { withAuth, success, failure, type ActionResult } from './action-wrapper'

const log = createLogger('action-analysis')

const REPORT_EXPIRATION_DAYS = parseInt(process.env.REPORT_EXPIRATION_DAYS || '30', 10)

export interface CreateAnalysisResult {
  analysisId: string
  publicToken: string
}

/**
 * Create a new analysis for a Facebook page.
 *
 * Uses withAuth wrapper for session handling, but has specialized
 * Facebook API error handling for user-friendly messages.
 */
export async function createAnalysis(
  pageId: string,
  industryCode: string = 'DEFAULT'
): Promise<ActionResult<CreateAnalysisResult>> {
  return withAuth(
    async (session) => {
      const userId = session.user!.id

      log.info({ user_id: userId, fb_page_id: pageId }, 'Creating analysis')

      try {
        // Get user's Facebook access token
        const userAccessToken = await getFacebookAccessToken(userId)

        if (!userAccessToken) {
          return failure('Facebook účet není propojen', 'FACEBOOK_NOT_CONNECTED')
        }

        // Get the page access token for this specific page
        const pages = await getManagedPagesWithTokens(userAccessToken)
        const page = pages.find((p) => p.id === pageId)

        if (!page) {
          return failure('Nemáte přístup k této stránce', 'PAGE_NOT_FOUND')
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
            public_token: generateSecureToken(),
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

        return success({
          analysisId: analysis.id,
          publicToken: analysis.public_token,
        })
      } catch (error) {
        // Handle Facebook API specific errors with user-friendly messages
        if (error instanceof FacebookApiError) {
          log.error(
            { user_id: userId, fb_page_id: pageId, error_code: error.code },
            'Facebook API error while creating analysis'
          )

          if (error.isTokenExpired()) {
            return failure('Facebook token vypršel, prosím přihlaste se znovu', 'TOKEN_EXPIRED')
          }

          if (error.isPermissionDenied()) {
            return failure('Nemáte oprávnění pro přístup k této stránce', 'PERMISSION_DENIED')
          }

          return failure('Chyba při komunikaci s Facebook API', 'FACEBOOK_API_ERROR')
        }

        // Re-throw other errors to be caught by withAuth wrapper
        throw error
      }
    },
    'Nepodařilo se vytvořit analýzu',
    { pageId, industryCode }
  )
}
