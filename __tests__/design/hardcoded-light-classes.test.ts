import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Hardcoded light surfaces, text and borders — `bg-white`, `text-gray-900`,
 * `border-gray-200`, `text-deep-teal` — stay light in dark mode. Use their
 * themed replacements from `lib/design/tokens.ts` instead: `bg-surface`,
 * `text-ink-strong`, `border-line`, `text-ink-brand` and the rest render
 * identically in light and switch in dark.
 *
 * 506 of these were swept onto the themed names with no change in light mode
 * (docs/PLAN.md, 3f part 3). A class scoped to dark mode (`dark:bg-gray-800`)
 * is not counted.
 */
const ALLOWED: Record<string, { classes: string[]; why: string }> = {
  'components/staff/employment-type-selector.tsx': {
    classes: ['bg-gray-500'],
    why: 'a badge with white text, which needs a fixed mid-grey fill',
  },
  'components/appointments/month-view.tsx': {
    classes: ['bg-gray-400'],
    why: 'a status dot with a white ring, the same in both themes',
  },
};

const HARDCODED =
  /(?<![\w:/-])((?:[a-z0-9-]+:)*)(bg-white|bg-gray-\d+|text-gray-\d+|border-gray-\d+|divide-gray-\d+|(?:from|via|to)-gray-\d+|text-deep-teal|text-brand-deepTeal)(?![\w/-])/g;

function tsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsx(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const files = ['app', 'components'].flatMap(dir =>
  tsx(join(process.cwd(), dir))
);

describe('no hardcoded light colour classes', () => {
  it.each(files.map(path => [relative(process.cwd(), path), path]))(
    '%s',
    (name, path) => {
      const allowed = ALLOWED[name]?.classes ?? [];
      const offenders = [...readFileSync(path, 'utf8').matchAll(HARDCODED)]
        .filter(match => !match[1].split(':').includes('dark'))
        .map(match => match[2])
        .filter(cls => !allowed.includes(cls));
      expect(offenders).toEqual([]);
    }
  );
});
