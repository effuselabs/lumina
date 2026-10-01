import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Brand gold is a fill and accent colour, never light-mode text.
 *
 * Gold on white is 1.44:1 against the 4.5:1 that body text needs. Measured
 * in the browser before this rule, 115 text elements across 21 pages were
 * gold on a light surface — 113 of them through `.text-lumina-primary` —
 * and none was on a dark one. Text is deep teal; gold is for fills and
 * accents, and for text in dark mode, where it reaches 9.3:1 on deep teal.
 * Decided by Jeremy on 2026-10-01 (docs/PLAN.md, 3c′).
 */

const ROOTS = ['app', 'components'];

/** Gold used as a colour on icons that decorate rather than inform. */
const DECORATIVE: Record<string, string> = {
  'components/ui/testimonial-card.tsx': 'star rating fills and the quote mark',
  'app/design-system/theme-test/page.tsx':
    'a swatch labelled "Lumina gold text", which shows the colour itself',
};

function tsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsx(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/** A gold text utility that is not scoped to dark mode. */
const GOLD_TEXT =
  /(?<![\w:-])((?:[a-z-]+:|\[[^\]]+\]:)*)text-(?:lumina-gold|brand-gold)\b/g;

describe('no gold text in light mode', () => {
  const files = ROOTS.flatMap(root => tsx(join(process.cwd(), root)));

  it.each(files.map(f => [relative(process.cwd(), f), f]))(
    '%s',
    (name, path) => {
      if (DECORATIVE[name]) return;
      const offenders = [...readFileSync(path, 'utf8').matchAll(GOLD_TEXT)]
        .filter(match => !match[1].split(':').includes('dark'))
        .map(match => match[0]);
      expect(offenders).toEqual([]);
    }
  );

  it('keeps .text-lumina-primary off gold', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    // The light rule, not `.dark .text-lumina-primary`, which is gold.
    const rule = css.match(/(?<!\.dark\s+)\.text-lumina-primary\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/deep-teal/);
  });
});
