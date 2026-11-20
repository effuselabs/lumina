import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { isPublicRoute } from '@/lib/auth/public-routes';

/**
 * The booking page registered an offline worker scoped to the whole site,
 * which kept a copy of every page it loaded, signed-in pages included (#150).
 * Nothing may register a worker again, and /sw.js may only ever be the
 * replacement that removes the old one.
 */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|js)$/.test(name) ? [path] : [];
  });
}

describe('service workers', () => {
  it('are never registered by the application', () => {
    const registering = ['app', 'components', 'lib', 'hooks']
      .flatMap(dir => sources(join(process.cwd(), dir)))
      .filter(file =>
        /serviceWorker\s*\.\s*register\s*\(/.test(readFileSync(file, 'utf8'))
      );

    expect(registering).toEqual([]);
  });

  it('/sw.js only removes itself and its caches', () => {
    const worker = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');

    expect(worker).toMatch(/registration\.unregister\(\)/);
    expect(worker).toMatch(/caches\.delete\(/);
    expect(worker).not.toMatch(/addEventListener\(\s*['"]fetch['"]/);
    expect(worker).not.toMatch(/\.put\(|\.addAll\(/);
  });

  it('/sw.js is reachable without a session, so a signed-out device can update', () => {
    expect(isPublicRoute('/sw.js')).toBe(true);
  });
});
