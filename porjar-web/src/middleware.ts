import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicPatterns = [
  '/',
  '/login',
  '/register',
  '/games',
  '/tournaments',
  '/matches',
  '/schedule',
  '/embed',
  '/teams',
  '/join',
  '/players',
  '/achievements',
  '/gallery',
]

// Role-based route rules
const protectedRoutes: { prefix: string; roles: string[] }[] = [
  { prefix: '/admin', roles: ['admin', 'superadmin'] },
  { prefix: '/coach', roles: ['coach'] },
  { prefix: '/dashboard', roles: ['player', 'admin', 'superadmin', 'coach'] },
]

// Role-based home pages for redirecting unauthorized users
const roleHomePage: Record<string, string> = {
  admin: '/admin',
  superadmin: '/admin',
  coach: '/coach',
  player: '/dashboard',
}

function isPublicRoute(pathname: string): boolean {
  // Exact match for root
  if (pathname === '/') return true

  // Check if pathname starts with any public pattern
  return publicPatterns.some((pattern) => {
    if (pattern === '/') return false
    return pathname === pattern || pathname.startsWith(pattern + '/')
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.includes('.') // static files like favicon.ico, etc.
  ) {
    return NextResponse.next()
  }

  // Public routes: allow through
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Read auth cookies set by the client
  const accessToken = request.cookies.get('access_token')?.value
  const userRole = request.cookies.get('user_role')?.value

  // Check if this is a protected route
  const matchedRoute = protectedRoutes.find(
    (route) => pathname === route.prefix || pathname.startsWith(route.prefix + '/')
  )

  // Not a protected route and not public -- allow through
  // (handles any routes we haven't explicitly listed)
  if (!matchedRoute) {
    return NextResponse.next()
  }

  // No token: redirect to login with return URL
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Has token but no role cookie (edge case): allow through,
  // client-side will handle the actual role check with fresh data
  if (!userRole) {
    return NextResponse.next()
  }

  // Role check: if user's role is not allowed for this route, redirect
  if (!matchedRoute.roles.includes(userRole)) {
    // Redirect to their appropriate home page
    const homePage = roleHomePage[userRole] || '/'
    return NextResponse.redirect(new URL(homePage, request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except static files and API routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
