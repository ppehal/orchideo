import { GRAPH_API_BASE_URL, makeRequest } from './client'
import { createLogger } from '@/lib/logging'

const log = createLogger('facebook-introspection')

export interface PermissionStatus {
  permission: string
  status: 'granted' | 'declined' | 'expired'
}

export interface TokenDebugInfo {
  app_id: string
  type: 'USER' | 'PAGE'
  is_valid: boolean
  expires_at: number
  data_access_expires_at: number
  scopes: string[]
}

/**
 * Get list of permissions granted to a token
 * API: GET /me/permissions
 */
export async function getGrantedPermissions(
  accessToken: string
): Promise<PermissionStatus[]> {
  const url = `${GRAPH_API_BASE_URL}/me/permissions`

  try {
    const response = await makeRequest<{ data: PermissionStatus[] }>(
      url,
      accessToken,
      { timeoutMs: 10000 }
    )

    log.info(
      {
        granted: response.data.filter((p) => p.status === 'granted').length,
        declined: response.data.filter((p) => p.status === 'declined').length,
      },
      'Fetched token permissions'
    )

    return response.data
  } catch (error) {
    log.error({ error }, 'Failed to fetch token permissions')
    throw error
  }
}

/**
 * Debug token to get metadata
 * API: GET /debug_token
 * Requires app access token (generated as: {FACEBOOK_APP_ID}|{FACEBOOK_APP_SECRET})
 */
export async function debugToken(accessToken: string): Promise<TokenDebugInfo> {
  // Generate app access token: {app_id}|{app_secret}
  const appAccessToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`

  const url = `${GRAPH_API_BASE_URL}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`

  try {
    const response = await makeRequest<{ data: TokenDebugInfo }>(
      url,
      appAccessToken,
      { timeoutMs: 10000 }
    )

    return response.data
  } catch (error) {
    log.error({ error }, 'Failed to debug token')
    throw error
  }
}

/**
 * Check if token has specific permission
 */
export async function hasPermission(
  accessToken: string,
  permission: string
): Promise<boolean> {
  const permissions = await getGrantedPermissions(accessToken)
  const found = permissions.find((p) => p.permission === permission)
  return found?.status === 'granted'
}
