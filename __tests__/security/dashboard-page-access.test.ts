import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Every /dashboard/[businessSlug] page proves the viewer belongs to the
 * business through requireBusinessAccess, and nothing else.
 *
 * All 13 pages used to hand-write the check — findUnique with a `users`
 * include, then a redirect — while the helper CLAUDE.md names for the job had
 * no callers at all, and pointed non-members at a /unauthorized page that did
 * not exist. Two pages wrapped the check in a try whose catch redirected to
 * /onboarding, which swallowed the redirects inside it: staff opening
 * analytics were sent to onboarding, not back to the dashboard.
 *
 * The behaviour of the helper is covered by require-business-access.test.ts.
 * This catches the failure that happened on the API side — a page that simply
 * does its own thing, or none.
 */

const DASHBOARD = join(process.cwd(), 'app', 'dashboard', '[businessSlug]');

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

const GUARD = /\brequireBusiness(Access|Owner|Manager)\(/;

const all = pages(DASHBOARD);

describe('dashboard pages authorize through requireBusinessAccess', () => {
  it('finds the dashboard pages (so the rest cannot pass vacuously)', () => {
    expect(all.length).toBeGreaterThanOrEqual(13);
  });

  describe.each(all.map(path => [relative(process.cwd(), path), path]))(
    '%s',
    (_name, path) => {
      const source = readFileSync(path, 'utf8');

      it('calls the guard', () => {
        expect(source).toMatch(GUARD);
      });

      it('does not hand-roll a session check', () => {
        expect(source).not.toMatch(/\bauth\(\)/);
      });

      it('does not call the guard inside a try, where a catch swallows its redirect', () => {
        const guardAt = source.search(GUARD);
        expect(source.slice(0, guardAt)).not.toMatch(/\btry\s*\{/);
      });
    }
  );
});
