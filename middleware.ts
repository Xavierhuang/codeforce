import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireCSRF } from './lib/csrf'

export async function middleware(request: NextRequest) {
  // Note: Maintenance mode check removed from middleware because Prisma cannot run in Edge Runtime
  // Maintenance mode is checked at the API/route level instead via /api/v1/health endpoint
  // For immediate maintenance mode, set NEXT_PUBLIC_MAINTENANCE_MODE=true in environment variables
  const pathname = request.nextUrl.pathname
  const maintenanceModeEnv = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  const isAdminRoute = pathname.startsWith('/admin')
  const isApiRoute = pathname.startsWith('/api')
  const isAuthRoute = pathname.startsWith('/auth')
  const isMaintenancePage = pathname === '/maintenance'
  
  // Check environment variable-based maintenance mode (works in Edge Runtime)
  if (maintenanceModeEnv && !isAdminRoute && !isApiRoute && !isAuthRoute && !isMaintenancePage) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }
  
  // Skip CSRF check for NextAuth routes (NextAuth handles its own security)
  const isNextAuthRoute = pathname.startsWith('/api/auth/')
  
  // CSRF protection for state-changing operations (skip for NextAuth)
  if (!isNextAuthRoute) {
    const csrfCheck = await requireCSRF(request)
    if (!csrfCheck.valid && csrfCheck.response) {
      return csrfCheck.response
    }
  }
  
  const response = NextResponse.next()

  if (pathname.startsWith('/_next/')) {
    return response
  }

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Content Security Policy
  // Allow self, Stripe, Pusher, Google Maps, and common CDNs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://js.pusher.com https://maps.googleapis.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
    "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.pusher.com https://*.pusherapp.com wss://*.pusher.com wss://*.pusherapp.com https://maps.googleapis.com https://*.googleapis.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=*, interest-cohort=()'
  )

  return response
}

export const config = {
  matcher: '/:path*',
}

