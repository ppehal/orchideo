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
 * Proxy function combines security headers, request tracing, and auth checks
 */
export async function proxy(request: NextRequest) {
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

  // Continue with response
  const response = NextResponse.next()

  // Add request ID for tracing
  response.headers.set('x-request-id', requestId)

  // Security headers (no HSTS - doesn't restrict localhost)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // CSP only in PRODUCTION (in dev it blocks hot reload)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://graph.facebook.com"
    )
  }

  return response
}

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
