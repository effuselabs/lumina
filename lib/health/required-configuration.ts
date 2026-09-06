/**
 * The configuration a deployed instance cannot serve this product without.
 *
 * Staging was promoted "healthy" while missing NEXTAUTH_SECRET and
 * NEXTAUTH_URL. Its database was reachable, so /api/health returned 200 and
 * Railway routed to the release — but nobody could sign in (NextAuth answered
 * error=Configuration and redirected to a bogus localhost host) and every
 * booking died on a 500 from the CSRF token route, which refuses to fall back
 * to a public constant in production.
 *
 * These variables were listed in docs/environments.md the whole time. A
 * document is not a gate; the health check is, because Railway will not
 * promote a release whose health check fails.
 */

/**
 * Required in production. Each one, if absent, breaks a path a customer walks:
 *
 *   DATABASE_URL         nothing works
 *   NEXTAUTH_SECRET      no sign-in, and no public booking (CSRF throws)
 *   NEXTAUTH_URL         auth redirects to the wrong host
 *   NEXT_PUBLIC_APP_URL  confirmation and cancellation links point nowhere
 */
export const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
] as const;

export type RequiredVariable = (typeof REQUIRED_IN_PRODUCTION)[number];

/**
 * Names of the required variables that are absent or blank.
 *
 * Returns names only, never values — the health response is public. A variable
 * set to whitespace counts as missing, because a blank secret would otherwise
 * pass the gate and fail at the first booking.
 */
export function findMissingConfiguration(
  env: NodeJS.ProcessEnv = process.env
): RequiredVariable[] {
  return REQUIRED_IN_PRODUCTION.filter(name => !env[name]?.trim());
}
