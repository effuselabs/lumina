import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * The interface had controls that went nowhere: "Continue with Google" with no
 * Google provider, "Forgot your password?" linking to a page that never
 * existed, and navigation to five "Coming Soon" pages (#147). Every internal
 * link must reach a page that exists, and sign-in may only name a provider
 * that `auth.ts` configures.
 */
const root = process.cwd();

function walk(dir: string, keep: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' ? [] : walk(path, keep);
    }
    return keep(path) ? [path] : [];
  });
}

const sources = ['app', 'components'].flatMap(dir =>
  walk(join(root, dir), file => file.endsWith('.tsx'))
);

// Each page as a pattern: route groups vanish, dynamic segments match one segment.
const routes = walk(join(root, 'app'), file =>
  file.endsWith(`${sep}page.tsx`)
).map(file => {
  const segments = relative(join(root, 'app'), file)
    .split(sep)
    .slice(0, -1)
    .filter(segment => !/^\(.*\)$/.test(segment));
  const pattern = segments
    .map(segment => (/^\[.*\]$/.test(segment) ? '[^/]+' : segment))
    .join('/');
  return new RegExp(`^/${pattern}$`);
});

/** Internal paths in href="…", href={`…`}, and router.push/replace('…'). */
function linksIn(source: string): string[] {
  const found = [
    ...source.matchAll(/href=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g),
    ...source.matchAll(/router\.(?:push|replace)\(\s*[`'"]([^`'"]*)[`'"]/g),
  ].map(match => match.slice(1).find(Boolean) ?? '');
  return found
    .filter(link => link.startsWith('/'))
    .map(link => link.split(/[?#]/)[0])
    .map(link => link.replace(/\$\{[^}]+\}/g, 'x'))
    .map(link => (link.length > 1 ? link.replace(/\/$/, '') : link));
}

describe('internal links', () => {
  const dead = sources.flatMap(file => {
    const source = readFileSync(file, 'utf8');
    return linksIn(source)
      .filter(link => !link.startsWith('/api/'))
      .filter(link => !routes.some(route => route.test(link)))
      .map(link => `${relative(root, file)} → ${link}`);
  });

  it('all reach a page that exists', () => {
    expect(dead).toEqual([]);
  });

  it('are found by the scanner', () => {
    // Guards the scanner itself: if it stopped matching, the test above would pass vacuously.
    expect(linksIn('<a href="/auth/signin">')).toEqual(['/auth/signin']);
    expect(
      linksIn('<Link href={`/dashboard/${slug}/clients?action=add`}>')
    ).toEqual(['/dashboard/x/clients']);
    expect(routes.some(route => route.test('/dashboard/x/clients'))).toBe(true);
    expect(routes.some(route => route.test('/auth/forgot-password'))).toBe(
      false
    );
  });
});

describe('sign-in providers', () => {
  it('are only ones auth.ts configures', () => {
    const named = sources.flatMap(file =>
      [...readFileSync(file, 'utf8').matchAll(/signIn\(\s*'([^']+)'/g)].map(
        m => m[1]
      )
    );
    expect(named.length).toBeGreaterThan(0);
    expect([...new Set(named)]).toEqual(['credentials']);
  });
});
