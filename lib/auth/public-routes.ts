/**
 * The only routes that may be reached without a session.
 *
 * This lives apart from `middleware.ts` so that the tenant-isolation test can
 * ask the same question the middleware asks, from the same list. A test that
 * kept its own copy would pass while the two drifted, which is the failure it
 * exists to prevent.
 *
 * The middleware runs in the Edge runtime, so nothing here may import Prisma,
 * bcrypt, or anything else Node-only.
 */

/**
 * Routes matched in full. Only these exact paths are public.
 *
 * These MUST be compared with `===`. A previous version tested every entry
 * with `pathname.startsWith(route)` while '/' was in the list — and because
 * every path starts with '/', that made `isPublicRoute` unconditionally true
 * and the middleware a no-op for every request.
 */
export const PUBLIC_EXACT_ROUTES = ['/', '/api/health'] as const;

/**
 * Route trees that are public in their entirety. Each entry must end in '/'
 * so that a prefix test cannot match a sibling route by accident (e.g.
 * '/book/' must not match a future '/bookkeeping').
 */
export const PUBLIC_ROUTE_PREFIXES = [
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
] as const;

export function isPublicRoute(pathname: string): boolean {
  return (
    (PUBLIC_EXACT_ROUTES as readonly string[]).includes(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix))
  );
}
