import { createLogger } from '@/lib/logging'
import type {
  FacebookErrorResponse,
  FacebookMeAccountsResponse,
  FacebookPageMetadataResponse,
  NormalizedFacebookPage,
  PageListItem,
} from './types'

const log = createLogger('facebook-api')

export const GRAPH_API_VERSION = 'v19.0'
export const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

const DEFAULT_TIMEOUT_MS = parseInt(process.env.FEED_TIMEOUT_MS || '10000', 10)
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

export interface RequestOptions {
  timeoutMs?: number
  maxRetries?: number
  retryDelayMs?: number
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

  const urlWithToken = `${url}${url.includes('?') ? '&' : '?'}access_token=${accessToken}`

  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      log.debug(
        { url: url.split('?')[0], timeoutMs, attempt: attempt + 1 },
        'Making Facebook API request'
      )

      const response = await fetch(urlWithToken, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorResponse = data as FacebookErrorResponse
        if (errorResponse.error) {
          const fbError = FacebookApiError.fromResponse(errorResponse.error)

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

export async function getManagedPages(accessToken: string): Promise<PageListItem[]> {
  const url = `${GRAPH_API_BASE_URL}/me/accounts?fields=id,name,category,picture,tasks`

  const response = await makeRequest<FacebookMeAccountsResponse>(url, accessToken)

  return response.data.map((page) => ({
    id: page.id,
    name: page.name,
    category: page.category ?? null,
    picture_url: null,
    tasks: page.tasks ?? [],
  }))
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
  const url = `${GRAPH_API_BASE_URL}/me/accounts?fields=id,name,category,picture.type(large),tasks,access_token`

  const response = await makeRequest<{
    data: Array<{
      id: string
      name: string
      category?: string
      picture?: { data: { url: string } }
      tasks?: string[]
      access_token: string
    }>
  }>(url, userAccessToken)

  return response.data.map((page) => ({
    id: page.id,
    name: page.name,
    category: page.category ?? null,
    picture_url: page.picture?.data?.url ?? null,
    tasks: page.tasks ?? [],
    access_token: page.access_token,
  }))
}
