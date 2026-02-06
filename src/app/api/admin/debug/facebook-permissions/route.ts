import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGrantedPermissions } from '@/lib/integrations/facebook/introspection'
import { FB_PERMISSIONS } from '@/lib/constants/fb-permissions'
import { env } from '@/lib/config/env'

// Admin emails for permission debugging - configured via env var
// Format: comma-separated list of emails (parsed in env.ts)
// Example: ADMIN_EMAILS="admin@example.com,support@example.com"
const ADMIN_EMAILS = env.ADMIN_EMAILS

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin check: Allow user to check own permissions OR be in admin list
  const { searchParams } = new URL(request.url)
  const userIdToCheck = searchParams.get('userId')

  const isCheckingSelf = !userIdToCheck || userIdToCheck === session.user.id
  const isAdmin = session.user.email && ADMIN_EMAILS.includes(session.user.email)

  if (!isCheckingSelf && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required to check other users' },
      { status: 403 }
    )
  }

  const targetUserId = userIdToCheck || session.user.id

  // Get user's Facebook account
  const account = await prisma.account.findFirst({
    where: {
      userId: targetUserId,
      provider: 'facebook',
    },
    select: {
      providerAccountId: true,
      access_token: true,
      scope: true,
      expires_at: true,
      created_at: true,
      updated_at: true,
    },
  })

  if (!account) {
    return NextResponse.json(
      {
        error: 'No Facebook account found',
        userId: targetUserId,
      },
      { status: 404 }
    )
  }

  // Introspect token via Facebook API
  let grantedPermissions: Array<{ permission: string; status: string }> = []
  let introspectionError: string | null = null

  if (account.access_token) {
    try {
      grantedPermissions = await getGrantedPermissions(account.access_token)
    } catch (error) {
      introspectionError = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Compare with required permissions
  const requiredPermissions = FB_PERMISSIONS.filter((p) => p.required).map((p) => p.id)
  const grantedPermissionIds = grantedPermissions
    .filter((p) => p.status === 'granted')
    .map((p) => p.permission)

  const missingPermissions = requiredPermissions.filter((id) => !grantedPermissionIds.includes(id))

  const diagnosis = {
    hasValidToken: account.access_token !== null,
    hasAllRequiredPermissions: introspectionError === null && missingPermissions.length === 0,
    missingPermissions,
    tokenExpired: account.expires_at ? account.expires_at * 1000 < Date.now() : false,
    introspectionFailed: introspectionError !== null,
    recommendations: [] as string[],
  }

  if (!diagnosis.hasValidToken) {
    diagnosis.recommendations.push('User needs to connect Facebook account')
  } else if (introspectionError) {
    diagnosis.recommendations.push(
      `Failed to introspect token via Facebook API: ${introspectionError}. Cannot verify permissions. This may be a temporary API issue.`
    )
  } else if (diagnosis.tokenExpired) {
    diagnosis.recommendations.push('Token has expired, user must re-login')
  } else if (!diagnosis.hasAllRequiredPermissions) {
    diagnosis.recommendations.push(
      `Missing permissions: ${missingPermissions.join(', ')}. ` +
        'Check Facebook App config_id includes these permissions, then have user re-login.'
    )
  }

  return NextResponse.json({
    userId: targetUserId,
    facebookAccount: {
      providerAccountId: account.providerAccountId,
      scopeStored: account.scope,
      expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    },
    apiIntrospection: {
      error: introspectionError,
      grantedPermissions,
    },
    requiredPermissions: FB_PERMISSIONS.filter((p) => p.required).map((p) => ({
      id: p.id,
      title: p.title,
      status: grantedPermissionIds.includes(p.id) ? 'granted' : 'missing',
    })),
    diagnosis,
  })
}
