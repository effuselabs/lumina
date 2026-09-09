import { isPublicRoute } from '@/lib/auth/public-routes';
import { readFileSync, readdirSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Every route that takes a businessId must prove the caller belongs to it.
 *
 * This is a structural test, and deliberately so. The behaviour of the guard
 * is covered by business-access.test.ts; what this catches is the failure that
 * actually happened — a route that never calls a guard at all. That is not
 * visible from any single route's tests, because the missing code has no tests.
 *
 * The rule was previously written down in CLAUDE.md and enforced by nothing,
 * and 26 routes drifted past it. If the same correction comes up twice, it
 * should be a lint rule or a test rather than a sentence.
 */

const API_ROOT = join(process.cwd(), 'app', 'api');

/** Every mechanism that establishes the caller belongs to the business. */
const GUARDS = [
  'authorizeBusinessAccess', // the one new routes should use
  'requireBusinessAccess',
  'requireBusinessOwner',
  'requireBusinessManager',
  'validateBusinessContext',
  'verifyBusinessAccess',
  'businessUser.findFirst',
  'businessUser.findUnique',
];

/**
 * Routes that take no businessId from the caller — they derive it from the
 * session, or they create the business. There is nothing to authorize against,
 * so a guard would be noise.
 */
const SCOPED_BY_SESSION: Record<string, string> = {
  '/api/user/businesses': 'lists the memberships of session.user.id',
  '/api/business': "POST creates a business; GET lists the caller's own",
};

/**
 * Routes that genuinely do not check, recorded so the gate can be green while
 * they are fixed in reviewable batches. Every entry is a real hole.
 *
 * The list only shrinks. A route that starts passing must be removed from it —
 * the test below fails if an entry is guarded, so this cannot quietly become a
 * list of things that were fixed years ago.
 */
const UNGUARDED_DEBT: Record<string, string> = {
  '/api/analytics/track-error': 'dead: analytics-provider.tsx has no importers',
  '/api/analytics/track-event': 'dead: analytics-provider.tsx has no importers',
  '/api/analytics/track-performance':
    'dead: analytics-provider.tsx has no importers',
  '/api/availability/business-hours': "reads and writes another salon's hours",
  '/api/availability/business-hours/validate': "reads another salon's hours",
  '/api/availability/conflicts': "reads another salon's appointments",
  '/api/availability/slots': "reads another salon's availability",
  '/api/availability/staff': "reads another salon's staff",
  '/api/availability/staff/[staffId]': "reads another salon's staff",
  '/api/availability/staff/[staffId]/override': "writes another salon's staff",
  '/api/availability/time-off': "reads and writes another salon's time off",
  '/api/availability/validate': "reads another salon's availability",
  '/api/booking/availability': 'duplicate of the public booking API; see PLAN',
  '/api/booking/create': 'duplicate of the public booking API; see PLAN',
  '/api/booking/services': 'duplicate of the public booking API; see PLAN',
  '/api/monitoring/availability': "reads another salon's metrics",
  '/api/monitoring/performance': "reads another salon's metrics",
  '/api/notifications/preferences': "reads and writes another salon's settings",
  '/api/staff/[staffId]': "reads and writes another salon's staff",
  '/api/transactions': "reads another salon's money",
};

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

/** `app/api/dashboard/clients/route.ts` -> `/api/dashboard/clients` */
function toPathname(file: string): string {
  const rel = relative(process.cwd(), file).split(sep).join('/');
  return '/' + rel.replace(/^app\//, '').replace(/\/route\.ts$/, '');
}

describe('tenant isolation', () => {
  const routes = routeFiles(API_ROOT).map(file => ({
    file: relative(process.cwd(), file).split(sep).join('/'),
    pathname: toPathname(file),
    source: readFileSync(file, 'utf8'),
  }));

  it('finds the API routes to check', () => {
    // Guards the walker itself: if the glob broke, every assertion below would
    // pass vacuously over an empty list.
    expect(routes.length).toBeGreaterThan(50);
  });

  const needsGuard = routes.filter(
    route =>
      !isPublicRoute(route.pathname) && route.source.includes('businessId')
  );

  it('has authenticated routes that take a businessId', () => {
    expect(needsGuard.length).toBeGreaterThan(0);
  });

  const mustBeGuarded = needsGuard.filter(
    route =>
      !(route.pathname in SCOPED_BY_SESSION) &&
      !(route.pathname in UNGUARDED_DEBT)
  );

  it.each(mustBeGuarded.map(r => [r.pathname, r] as const))(
    '%s verifies the caller belongs to the business',
    (_pathname, route) => {
      const guarded = GUARDS.some(guard => route.source.includes(guard));

      expect(guarded).toBe(true);
    }
  );

  describe('the debt list only shrinks', () => {
    const recorded = Object.keys(UNGUARDED_DEBT);
    const stillUnguarded = new Set(
      needsGuard
        .filter(route => !GUARDS.some(g => route.source.includes(g)))
        .map(route => route.pathname)
    );

    it.each(recorded)(
      '%s is still unguarded, or should leave the list',
      path => {
        // A route that has been fixed must be removed from UNGUARDED_DEBT.
        // Without this, the list rots into a record of things that were fixed
        // long ago, and stops meaning anything.
        expect(stillUnguarded.has(path)).toBe(true);
      }
    );

    it.each(recorded)('%s still exists', path => {
      // A deleted route must also leave the list.
      expect(routes.map(r => r.pathname)).toContain(path);
    });
  });

  it('records why each accepted route needs no guard', () => {
    for (const reason of Object.values({
      ...SCOPED_BY_SESSION,
      ...UNGUARDED_DEBT,
    })) {
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
