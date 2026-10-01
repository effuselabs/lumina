import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Hardcoded light surfaces, text and borders — `bg-white`, `text-gray-900`,
 * `border-gray-200` — stay light in dark mode. Their themed replacements in
 * `lib/design/tokens.ts` (`bg-surface`, `text-ink-strong`, `border-line`)
 * render identically in light and switch in dark.
 *
 * This is a ratchet. The sweep (docs/PLAN.md, 3f part 3) lowers CEILING to
 * zero; until then the count may only fall. A class already scoped to dark
 * mode (`dark:bg-gray-800`) is not counted.
 */
const CEILING = 508;

const HARDCODED =
  /(?<![\w:/-])((?:[a-z-]+:)*)(bg-white|bg-gray-\d+|text-gray-\d+|border-gray-\d+|divide-gray-\d+)(?![\w/-])/g;

function tsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsx(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const counts = ['app', 'components']
  .flatMap(dir => tsx(join(process.cwd(), dir)))
  .map(path => ({
    file: relative(process.cwd(), path),
    count: [...readFileSync(path, 'utf8').matchAll(HARDCODED)].filter(
      match => !match[1].split(':').includes('dark')
    ).length,
  }))
  .filter(({ count }) => count > 0);

describe('hardcoded light colour classes', () => {
  it(`number no more than ${CEILING}`, () => {
    const total = counts.reduce((sum, { count }) => sum + count, 0);
    if (total > CEILING) {
      const top = [...counts].sort((a, b) => b.count - a.count).slice(0, 10);
      throw new Error(
        `${total} hardcoded light classes, above the ceiling of ${CEILING}. ` +
          'Use the themed names (bg-surface, text-ink-strong, border-line, …) ' +
          'from lib/design/tokens.ts. Most in:\n' +
          top.map(({ file, count }) => `  ${count}  ${file}`).join('\n')
      );
    }
    expect(total).toBeLessThanOrEqual(CEILING);
  });
});
