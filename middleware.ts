import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Generate unique request ID for tracing.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function middleware(request: NextRequest) {
  // Generate or use existing request ID
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // Clone request with request ID
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Content Security Policy
  // Note: Facebook domains needed for OAuth login
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.facebook.com https://graph.facebook.com https://www.google-analytics.com",
    "frame-src 'self' https://www.facebook.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspHeader)

  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Referrer Policy - balance privacy and functionality
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy - restrict unnecessary features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Add request ID to response for tracing
  response.headers.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
