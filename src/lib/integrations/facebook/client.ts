import crypto from 'crypto'
import type { ZodType } from 'zod'
import { createLogger } from '@/lib/logging'
import { FB_API_TIMEOUT_MS } from '@/lib/config/timeouts'
import { isFacebookError } from '@/lib/validators/facebook'
import type {
  FacebookBusiness,
  FacebookErrorResponse,
  FacebookPaging,
  FacebookPageMetadataResponse,
  NormalizedFacebookPage,
  PageListItem,
} from './types'

const log = createLogger('facebook-api')

// ============================================================================
// App Secret Proof - Required by Facebook for secure API calls
// ============================================================================

function getAppSecretProof(accessToken: string): string {
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appSecret) {
    throw new Error('FACEBOOK_APP_SECRET is not configured')
  }
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
}

export const GRAPH_API_VERSION = 'v19.0'
export const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

const DEFAULT_TIMEOUT_MS = FB_API_TIMEOUT_MS
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

export class FacebookApiError extends Error {
  public readonly code: number
  public readonly type: string
  public readonly subcode?: number
  public readonly fbtrace_id?: string

  constructor(message: string, code: number, type: string, subcode?: number, fbtrace_id?: string) {
    super(message)
    this.name = 'FacebookApiError'
    this.code = code
    this.type = type
    this.subcode = subcode
    this.fbtrace_id = fbtrace_id
  }

  static fromResponse(error: FacebookErrorResponse['error']): FacebookApiError {
    return new FacebookApiError(
      error.message,
      error.code,
      error.type,
      error.error_subcode,
      error.fbtrace_id
    )
  }

  isRateLimited(): boolean {
    return this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613
  }

  isTokenExpired(): boolean {
    return this.code === 190
  }

  isPermissionDenied(): boolean {
    return this.code === 10 || this.code === 200 || this.code === 230
  }

  isRetryable(): boolean {
    // Rate limited or temporary server errors
    return this.isRateLimited() || this.code === 1 || this.code === 2
  }
}

export interface RequestOptions<T = unknown> {
  timeoutMs?: number
  maxRetries?: number
  retryDelayMs?: number
  /** Optional Zod schema for response validation */
  schema?: ZodType<T>
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function makeRequest<T>(
  url: string,
  accessToken: string,
  options: RequestOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRetries = options.maxRetries ?? MAX_RETRIES
  const initialRetryDelay = options.retryDelayMs ?? INITIAL_RETRY_DELAY_MS

  // Add appsecret_proof to URL for secure API calls
  const urlWithProof = new URL(url)
  urlWithProof.searchParams.set('appsecret_proof', getAppSecretProof(accessToken))
  const secureUrl = urlWithProof.toString()

  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      log.debug(
        { url: url.split('?')[0], timeoutMs, attempt: attempt + 1 },
        'Making Facebook API request'
      )

      const response = await fetch(secureUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check for Facebook API error format
        if (isFacebookError(data)) {
          const fbError = FacebookApiError.fromResponse(data.error)

          log.warn(
            {
              code: fbError.code,
              type: fbError.type,
              message: fbError.message,
              attempt: attempt + 1,
            },
            'Facebook API error'
          )

          // Check if error is retryable
          if (fbError.isRetryable() && attempt < maxRetries) {
            lastError = fbError
            const delay = initialRetryDelay * Math.pow(2, attempt)
            log.info({ delay, attempt: attempt + 1 }, 'Retrying after delay')
            await sleep(delay)
            attempt++
            continue
          }

          throw fbError
        }
        throw new Error(`Facebook API error: ${response.status} ${response.statusText}`)
      }

      // Validate response with Zod schema if provided
      if (options.schema) {
        const result = options.schema.safeParse(data)
        if (!result.success) {
          log.warn(
            { url: url.split('?')[0], errors: result.error.issues },
            'Facebook API response validation failed'
          )
          // Return data anyway but log the validation error
          // This prevents breaking changes while adding observability
        }
      }

      return data as T
    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof FacebookApiError) {
        throw error
      }

      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      const isNetworkError = error instanceof TypeError

      if ((isTimeout || isNetworkError) && attempt < maxRetries) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const delay = initialRetryDelay * Math.pow(2, attempt)
        log.warn(
          { error: lastError.message, delay, attempt: attempt + 1 },
          'Request failed, retrying'
        )
        await sleep(delay)
        attempt++
        continue
      }

      throw error
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

// ============================================================================
// Pagination Helper
// ============================================================================

interface PaginatedResponse<T> {
  data: T[]
  paging?: FacebookPaging
}

async function fetchAllPaginated<T>(
  initialUrl: string,
  accessToken: string,
  maxPages: number = 10
): Promise<T[]> {
  const allData: T[] = []
  let nextUrl: string | null = initialUrl
  let pagesProcessed = 0

  while (nextUrl && pagesProcessed < maxPages) {
    const response: PaginatedResponse<T> = await makeRequest<PaginatedResponse<T>>(
      nextUrl,
      accessToken
    )
    if (response.data) {
      allData.push(...response.data)
    }
    nextUrl = response.paging?.next ?? null
    pagesProcessed++
  }

  if (pagesProcessed >= maxPages) {
    log.warn({ pagesProcessed, maxPages }, 'Reached max pagination limit')
  }

  return allData
}

// ============================================================================
// Business Portfolio Functions
// ============================================================================

async function getBusinesses(accessToken: string): Promise<FacebookBusiness[]> {
  const url = `${GRAPH_API_BASE_URL}/me/businesses?fields=id,name`
  try {
    return await fetchAllPaginated<FacebookBusiness>(url, accessToken)
  } catch (error) {
    // Graceful degradation - business_management permission might not be granted
    if (error instanceof FacebookApiError && error.isPermissionDenied()) {
      log.info('business_management permission not granted, skipping Business Portfolio pages')
      return []
    }
    log.warn({ error }, 'Could not fetch businesses')
    return []
  }
}

async function getBusinessOwnedPages(
  businessId: string,
  accessToken: string,
  includeToken: boolean = false
): Promise<Array<PageListItem & { access_token?: string }>> {
  const fields = includeToken
    ? 'id,name,category,picture.type(large),tasks,access_token,username'
    : 'id,name,category,picture.type(large),tasks,username'
  const url = `${GRAPH_API_BASE_URL}/${businessId}/owned_pages?fields=${fields}`

  try {
    const pages = await fetchAllPaginated<{
      id: string
      name: string
      category?: string
      picture?: { data: { url: string } }
      tasks?: string[]
      access_token?: string
      username?: string
    }>(url, accessToken)

    return pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category ?? null,
      picture_url: page.picture?.data?.url ?? null,
      tasks: page.tasks ?? [],
      username: page.username ?? null,
      ...(includeToken && page.access_token ? { access_token: page.access_token } : {}),
    }))
  } catch (error) {
    log.warn({ businessId, error }, 'Could not fetch business owned pages')
    return []
  }
}

function deduplicatePages<T extends { id: string }>(pages: T[]): T[] {
  const seen = new Set<string>()
  return pages.filter((page) => {
    if (seen.has(page.id)) return false
    seen.add(page.id)
    return true
  })
}

// ============================================================================
// Personal Pages Functions (internal)
// ============================================================================

async function getPersonalPages(accessToken: string): Promise<PageListItem[]> {
  const url = `${GRAPH_API_BASE_URL}/me/accounts?fields=id,name,category,picture.type(large),tasks,username`
  const pages = await fetchAllPaginated<{
    id: string
    name: string
    category?: string
    picture?: { data: { url: string } }
    tasks?: string[]
    username?: string
  }>(url, accessToken)

  return pages.map((page) => ({
    id: page.id,
    name: page.name,
    category: page.category ?? null,
    picture_url: page.picture?.data?.url ?? null,
    tasks: page.tasks ?? [],
    username: page.username ?? null,
  }))
}

async function getPersonalPagesWithTokens(
  accessToken: string
): Promise<Array<PageListItem & { access_token: string }>> {
  const url = `${GRAPH_API_BASE_URL}/me/accounts?fields=id,name,category,picture.type(large),tasks,access_token,username`
  const pages = await fetchAllPaginated<{
    id: string
    name: string
    category?: string
    picture?: { data: { url: string } }
    tasks?: string[]
    access_token: string
    username?: string
  }>(url, accessToken)

  return pages.map((page) => ({
    id: page.id,
    name: page.name,
    category: page.category ?? null,
    picture_url: page.picture?.data?.url ?? null,
    tasks: page.tasks ?? [],
    username: page.username ?? null,
    access_token: page.access_token,
  }))
}

// ============================================================================
// Public API - Aggregated Managed Pages
// ============================================================================

export async function getManagedPages(accessToken: string): Promise<PageListItem[]> {
  // 1. Get personal pages
  const personalPages = await getPersonalPages(accessToken)

  // 2. Get Business Portfolios
  const businesses = await getBusinesses(accessToken)

  // 3. For each Business, get pages (parallel for performance)
  const businessPagesArrays = await Promise.all(
    businesses.map((b) => getBusinessOwnedPages(b.id, accessToken, false))
  )
  const businessPages = businessPagesArrays.flat()

  // 4. Aggregate and deduplicate (personal pages have priority)
  const allPages = [...personalPages, ...businessPages]
  const uniquePages = deduplicatePages(allPages)

  log.info(
    {
      personalPages: personalPages.length,
      businesses: businesses.length,
      businessPages: businessPages.length,
      totalUnique: uniquePages.length,
    },
    'Aggregated managed pages'
  )

  return uniquePages
}

export async function getPageMetadata(
  pageId: string,
  accessToken: string
): Promise<NormalizedFacebookPage> {
  const fields = [
    'id',
    'name',
    'category',
    'fan_count',
    'picture.type(large)',
    'cover',
    'about',
    'website',
    'link',
    'username',
  ].join(',')

  const url = `${GRAPH_API_BASE_URL}/${pageId}?fields=${fields}`

  const response = await makeRequest<FacebookPageMetadataResponse>(url, accessToken)

  return {
    fb_page_id: response.id,
    name: response.name,
    category: response.category ?? null,
    fan_count: response.fan_count ?? null,
    picture_url: response.picture?.data?.url ?? null,
    cover_url: response.cover?.source ?? null,
    page_access_token: accessToken,
    username: response.username ?? null,
  }
}

export async function getPageAccessToken(
  pageId: string,
  userAccessToken: string
): Promise<string | null> {
  const url = `${GRAPH_API_BASE_URL}/${pageId}?fields=access_token`

  try {
    const response = await makeRequest<{ id: string; access_token: string }>(url, userAccessToken)
    return response.access_token
  } catch (error) {
    if (error instanceof FacebookApiError && error.isPermissionDenied()) {
      log.warn({ pageId }, 'No permission to get page access token')
      return null
    }
    throw error
  }
}

export async function getManagedPagesWithTokens(
  userAccessToken: string
): Promise<Array<PageListItem & { access_token: string }>> {
  // 1. Get personal pages with tokens
  const personalPages = await getPersonalPagesWithTokens(userAccessToken)

  // 2. Get Business Portfolios
  const businesses = await getBusinesses(userAccessToken)

  // 3. For each Business, get pages with tokens (parallel)
  const businessPagesArrays = await Promise.all(
    businesses.map((b) => getBusinessOwnedPages(b.id, userAccessToken, true))
  )
  const businessPages = businessPagesArrays
    .flat()
    .filter((p): p is PageListItem & { access_token: string } => !!p.access_token)

  // 4. Aggregate and deduplicate
  const allPages = [...personalPages, ...businessPages]
  const uniquePages = deduplicatePages(allPages)

  log.info(
    {
      personalPages: personalPages.length,
      businesses: businesses.length,
      businessPages: businessPages.length,
      totalUnique: uniquePages.length,
    },
    'Aggregated managed pages with tokens'
  )

  return uniquePages
}
