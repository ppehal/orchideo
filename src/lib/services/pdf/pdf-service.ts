import { createHash } from 'crypto'
import { mkdir, writeFile, readFile, stat, unlink } from 'fs/promises'
import { join, dirname } from 'path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import {
  PDF_VERSION,
  PDF_STORAGE_DIR,
  PDF_SETTINGS,
  PDF_CONCURRENCY,
  PDF_CACHE_TTL_DAYS,
} from '@/lib/constants/pdf'
import { getPdfSemaphore } from '@/lib/utils/semaphore'

const log = createLogger('pdf-service')

export interface PdfGenerationParams {
  token: string
  includeBranding?: boolean
  companyName?: string
}

export interface PdfResult {
  buffer: Buffer
  cached: boolean
  filePath: string
}

/**
 * Compute a hash of the PDF generation parameters for cache key.
 */
export function computeParamsHash(params: PdfGenerationParams): string {
  const normalized = {
    token: params.token,
    includeBranding: params.includeBranding ?? true,
    companyName: params.companyName ?? '',
    pdfVersion: PDF_VERSION,
  }

  const json = JSON.stringify(normalized)
  return createHash('sha256').update(json).digest('hex').slice(0, 16)
}

/**
 * Get or generate a PDF report for an analysis.
 * Uses caching to avoid regenerating the same PDF.
 */
export async function getOrGeneratePdf(
  analysisId: string,
  params: PdfGenerationParams,
  baseUrl: string
): Promise<PdfResult> {
  const paramsHash = computeParamsHash(params)

  // Check for cached artifact
  const cached = await prisma.reportArtifact.findUnique({
    where: {
      analysisId_params_hash: {
        analysisId,
        params_hash: paramsHash,
      },
    },
  })

  if (cached) {
    try {
      const buffer = await readFile(cached.file_path)
      log.info({ analysisId, paramsHash }, 'PDF cache hit')
      return { buffer, cached: true, filePath: cached.file_path }
    } catch {
      // File missing, regenerate
      log.warn({ analysisId, filePath: cached.file_path }, 'Cached PDF file missing, regenerating')
      await prisma.reportArtifact.delete({ where: { id: cached.id } })
    }
  }

  // Generate new PDF with concurrency control
  const semaphore = getPdfSemaphore(PDF_CONCURRENCY.MAX_CONCURRENT)
  const release = await semaphore.acquire(PDF_CONCURRENCY.ACQUIRE_TIMEOUT_MS)

  try {
    log.info({ analysisId, paramsHash }, 'Generating PDF')
    const result = await generatePdf(analysisId, params, paramsHash, baseUrl)
    log.info({ analysisId, filePath: result.filePath }, 'PDF generated')
    return result
  } finally {
    release()
  }
}

/**
 * Generate a PDF from the report page using Puppeteer.
 */
async function generatePdf(
  analysisId: string,
  params: PdfGenerationParams,
  paramsHash: string,
  baseUrl: string
): Promise<PdfResult> {
  // Build the report URL with print mode
  const url = new URL(`/report/${params.token}`, baseUrl)
  url.searchParams.set('print', 'true')
  if (!params.includeBranding) {
    url.searchParams.set('hideBranding', 'true')
  }
  if (params.companyName) {
    url.searchParams.set('company', params.companyName)
  }

  // Launch Puppeteer with Chromium
  // Use system Chromium if available (Docker/production), fallback to @sparticuz/chromium
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (await chromium.executablePath())

  const browser = await puppeteer.launch({
    args: process.env.PUPPETEER_EXECUTABLE_PATH
      ? [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ]
      : chromium.args,
    defaultViewport: {
      width: PDF_SETTINGS.WIDTH,
      height: PDF_SETTINGS.HEIGHT,
    },
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()

    // Navigate to the report page
    await page.goto(url.toString(), {
      waitUntil: PDF_SETTINGS.WAIT_UNTIL,
      timeout: PDF_SETTINGS.NAVIGATION_TIMEOUT_MS,
    })

    // Wait for the page to signal it's ready for PDF
    await page.waitForSelector('[data-pdf-ready="true"]', {
      timeout: PDF_SETTINGS.NAVIGATION_TIMEOUT_MS,
    })

    // Additional render delay for any final animations
    await new Promise((resolve) => setTimeout(resolve, PDF_SETTINGS.RENDER_DELAY_MS))

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: PDF_SETTINGS.MARGIN,
      displayHeaderFooter: false,
    })

    // Save to file system
    const fileName = `${params.token}-${paramsHash}.pdf`
    const filePath = join(process.cwd(), PDF_STORAGE_DIR, fileName)

    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, pdfBuffer)

    const stats = await stat(filePath)

    // Create artifact record - if this fails, clean up the file
    try {
      await prisma.reportArtifact.create({
        data: {
          analysisId,
          params_hash: paramsHash,
          file_path: filePath,
          file_size: stats.size,
          mime_type: 'application/pdf',
          pdf_version: PDF_VERSION,
        },
      })
    } catch (dbError) {
      // Clean up orphan file on database error
      try {
        await unlink(filePath)
      } catch {
        log.warn({ filePath }, 'Failed to clean up orphan PDF file after database error')
      }
      throw dbError
    }

    return {
      buffer: Buffer.from(pdfBuffer),
      cached: false,
      filePath,
    }
  } finally {
    await browser.close()
  }
}

/**
 * Clean up old cached PDF artifacts.
 * Should be run periodically (e.g., daily cron job).
 */
export async function cleanupOldArtifacts(): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - PDF_CACHE_TTL_DAYS)

  const oldArtifacts = await prisma.reportArtifact.findMany({
    where: {
      created_at: { lt: cutoffDate },
    },
    select: {
      id: true,
      file_path: true,
    },
  })

  let deleted = 0

  for (const artifact of oldArtifacts) {
    try {
      await unlink(artifact.file_path)
    } catch {
      // File may already be deleted
    }

    await prisma.reportArtifact.delete({ where: { id: artifact.id } })
    deleted++
  }

  if (deleted > 0) {
    log.info({ deleted }, 'Cleaned up old PDF artifacts')
  }

  return deleted
}
