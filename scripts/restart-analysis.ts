/**
 * Script to restart analysis for a specific user and Facebook page
 *
 * Usage: npx tsx tmp/restart-analysis.ts <user-email> <fb-page-id> [industry-code]
 */

import { PrismaClient } from '../src/generated/prisma/client.js'
import { createLogger } from '../src/lib/logging/index.js'
import { getPageMetadata, getManagedPagesWithTokens } from '../src/lib/integrations/facebook/index.js'
import { encrypt } from '../src/lib/utils/encryption.js'
import { generateSecureToken } from '../src/lib/utils/tokens.js'
import { startAnalysisInBackground } from '../src/lib/services/analysis/runner.js'
import { INDUSTRIES } from '../src/lib/constants/fb-category-map.js'
import type { AnalysisStatus, IndustryCode } from '../src/generated/prisma/enums.js'

const prisma = new PrismaClient()
const log = createLogger('restart-analysis-script')

const REPORT_EXPIRATION_DAYS = parseInt(process.env.REPORT_EXPIRATION_DAYS || '30', 10)

async function restartAnalysis(userEmail: string, fbPageId: string, industryCode: string = 'DEFAULT') {
  try {
    console.log(`\n🔍 Hledám uživatele: ${userEmail}`)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        accounts: {
          where: { provider: 'facebook' }
        }
      }
    })

    if (!user) {
      console.error(`❌ Uživatel s emailem ${userEmail} nebyl nalezen`)
      process.exit(1)
    }

    console.log(`✅ Uživatel nalezen: ${user.name} (ID: ${user.id})`)

    const fbAccount = user.accounts[0]
    if (!fbAccount || !fbAccount.access_token) {
      console.error('❌ Uživatel nemá připojený Facebook účet')
      process.exit(1)
    }

    console.log('\n🔍 Hledám Facebook stránku...')

    // Get managed pages
    const pages = await getManagedPagesWithTokens(fbAccount.access_token)
    const page = pages.find((p) => p.id === fbPageId)

    if (!page) {
      console.error(`❌ Stránka s ID ${fbPageId} nebyla nalezena nebo uživatel k ní nemá přístup`)
      console.log('\nDostupné stránky:')
      pages.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`))
      process.exit(1)
    }

    console.log(`✅ Stránka nalezena: ${page.name}`)

    console.log('\n📊 Získávám metadata stránky...')

    // Get page metadata
    const pageMetadata = await getPageMetadata(fbPageId, page.access_token)
    console.log(`✅ Metadata získána (${pageMetadata.fan_count} fanoušků)`)

    console.log('\n💾 Aktualizuji záznam stránky v databázi...')

    // Encrypt token
    const encryptedToken = encrypt(page.access_token)

    // Upsert FacebookPage
    const facebookPage = await prisma.facebookPage.upsert({
      where: { fb_page_id: fbPageId },
      update: {
        name: pageMetadata.name,
        category: pageMetadata.category,
        fan_count: pageMetadata.fan_count,
        picture_url: pageMetadata.picture_url,
        cover_url: pageMetadata.cover_url,
        page_access_token: encryptedToken,
      },
      create: {
        fb_page_id: fbPageId,
        name: pageMetadata.name,
        category: pageMetadata.category,
        fan_count: pageMetadata.fan_count,
        picture_url: pageMetadata.picture_url,
        cover_url: pageMetadata.cover_url,
        page_access_token: encryptedToken,
        userId: user.id,
      },
    })

    console.log('✅ Stránka aktualizována')

    console.log('\n🆕 Vytvářím novou analýzu...')

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REPORT_EXPIRATION_DAYS)

    // Create analysis
    const analysis = await prisma.analysis.create({
      data: {
        public_token: generateSecureToken(),
        status: 'PENDING' as AnalysisStatus,
        page_name: pageMetadata.name,
        page_picture: pageMetadata.picture_url,
        page_fan_count: pageMetadata.fan_count,
        fb_page_category: pageMetadata.category,
        industry_code: industryCode,
        expires_at: expiresAt,
        userId: user.id,
        fb_page_id: facebookPage.id,
      },
    })

    console.log(`✅ Analýza vytvořena (ID: ${analysis.id})`)

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'analysis_started',
        analysisId: analysis.id,
        metadata: {
          fb_page_id: fbPageId,
          page_name: pageMetadata.name,
          fan_count: pageMetadata.fan_count,
          industry_code: industryCode,
          source: 'restart-script'
        },
      },
    })

    console.log('\n🚀 Spouštím analýzu na pozadí...')

    // Start analysis
    startAnalysisInBackground(analysis.id)

    console.log('\n✅ Hotovo!')
    console.log(`\n📊 Report bude dostupný na: https://orchideo.ppsys.eu/report/${analysis.public_token}`)
    console.log(`📅 Report vyprší: ${expiresAt.toLocaleDateString('cs-CZ')}`)
    console.log(`\n💡 Průběh analýzy můžete sledovat na: https://orchideo.ppsys.eu/analyze/history`)

  } catch (error) {
    console.error('\n❌ Chyba při vytváření analýzy:', error)
    log.error({ error }, 'Failed to restart analysis')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse arguments
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: npx tsx tmp/restart-analysis.ts <user-email> <fb-page-id> [industry-code]')
  console.error('\nExample: npx tsx tmp/restart-analysis.ts ondrej.macku@gmail.com 609340509095436 DEFAULT')
  process.exit(1)
}

const [userEmail, fbPageId, rawIndustryCode] = args

// Validate industry code
const industryCode: IndustryCode = rawIndustryCode && (rawIndustryCode in INDUSTRIES)
  ? (rawIndustryCode as IndustryCode)
  : 'DEFAULT'

if (rawIndustryCode && rawIndustryCode !== industryCode) {
  console.warn(`⚠️  Invalid industry code "${rawIndustryCode}", using DEFAULT`)
}

console.log('🔄 Restart analýzy')
console.log('==================')

restartAnalysis(userEmail, fbPageId, industryCode)
