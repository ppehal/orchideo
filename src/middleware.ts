import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Middleware runs on Edge Runtime - performs request tracing and auth checks
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Generate or extract request ID for tracing
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // Public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/api/auth',
    '/api/health',
    '/api/report', // Public report viewer
    '/',
    '/privacy',
    '/terms',
    '/_next', // Next.js internals
    '/favicon.ico',
    '/images',
    '/fonts',
  ]

  const isPublicPath = publicPaths.some((p) => path.startsWith(p))

  // For protected paths, check authentication
  if (!isPublicPath) {
    const session = await auth()

    if (!session) {
      // Redirect to login for pages
      if (path.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Nepřihlášen', code: 'UNAUTHORIZED' },
          {
            status: 401,
            headers: {
              'x-request-id': requestId,
            },
          }
        )
      }

      // Redirect to login page for UI routes
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Add request ID to response headers for tracing
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  return response
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
