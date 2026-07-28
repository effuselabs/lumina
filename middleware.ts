import authConfig from '@/auth.config';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

// Build an Edge-safe NextAuth instance from the provider-free config.
// Importing `auth` from '@/auth' here would pull bcryptjs and Prisma into
// the Edge Runtime, which cannot run them.
const { auth } = NextAuth(authConfig);

/**
 * Routes matched in full. Only these exact paths are public.
 *
 * These MUST be compared with `===`. A previous version tested every entry
 * with `pathname.startsWith(route)` while '/' was in the list — and because
 * every path starts with '/', that made `isPublicRoute` unconditionally true
 * and the middleware a no-op for every request.
 */
const PUBLIC_EXACT_ROUTES = ['/', '/api/health'];

/**
 * Route trees that are public in their entirety. Each entry must end in '/'
 * so that a prefix test cannot match a sibling route by accident (e.g.
 * '/book/' must not match a future '/bookkeeping').
 */
const PUBLIC_ROUTE_PREFIXES = [
  '/auth/', // sign-in, sign-up, error, verify-request, staff-invite
  '/api/auth/', // NextAuth handlers
  '/api/public/', // unauthenticated public booking API
  '/book/', // public booking page for a business
  '/booking/', // booking confirmation / management by reference

  // The routes below are "public" only in the sense that they carry NO SESSION.
  // Each authenticates by its own means, and each MUST keep doing so — adding a
  // route here without its own check makes it genuinely unauthenticated.
  '/api/cron/', // Bearer CRON_SECRET, checked in the handler
  '/api/payments/webhook', // Stripe signature verification
  '/api/staff/invite/verify', // single-use invitation token
  '/api/staff/invite/accept', // single-use invitation token
];

export default auth(req => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublicRoute =
    PUBLIC_EXACT_ROUTES.includes(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow authenticated users to access protected routes
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
