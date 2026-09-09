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
  'businessUser.findMany',
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
/**
 * Routes that authorize correctly by a mechanism this file cannot recognise
 * from the source text. Substring detection has false negatives; these were
 * each read and confirmed, and the mechanism is named so the next reader does
 * not have to repeat the work.
 */
const GUARDED_BY_INSPECTION: Record<string, string> = {
  '/api/staff/[staffId]':
    'loads the staff row with business.users filtered to session.user.id, then 403s on an empty list',
  '/api/notifications/preferences':
    'an HMAC of businessId + email, like an unsubscribe link — a capability, not a session',
};

/**
 * Routes that genuinely do not check. Every entry is a real hole.
 *
 * The list only shrinks, in both directions: the test fails if an entry starts
 * passing, and fails if an entry stops existing, so it cannot decay into a
 * record of things fixed or deleted long ago.
 */
const UNGUARDED_DEBT: Record<string, string> = {};

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
      !(route.pathname in GUARDED_BY_INSPECTION) &&
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

    // Written as a loop rather than `it.each`, which rejects an empty list —
    // and empty is the goal state, reached in this commit.
    it('lists only routes that are still real, and still unguarded', () => {
      for (const path of recorded) {
        // A route that has been fixed must leave the list, or it rots into a
        // record of things repaired long ago.
        expect(stillUnguarded).toContain(path);
        // A route that has been deleted must leave the list too.
        expect(routes.map(route => route.pathname)).toContain(path);
      }
    });

    it('does not classify the same route twice', () => {
      const seen = [
        ...Object.keys(SCOPED_BY_SESSION),
        ...Object.keys(GUARDED_BY_INSPECTION),
        ...recorded,
      ];

      expect(new Set(seen).size).toBe(seen.length);
    });
  });

  it('records why each accepted route needs no guard', () => {
    for (const reason of Object.values({
      ...SCOPED_BY_SESSION,
      ...GUARDED_BY_INSPECTION,
      ...UNGUARDED_DEBT,
    })) {
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
