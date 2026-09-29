import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { buttonVariants } from '@/components/ui/button';
import { contrastRatio } from '@/lib/design/contrast';
import { base, brand, prohibitedPairs } from '@/lib/design/tokens';

/**
 * No white text on the radiant gradient.
 *
 * White on the gradient's coral end is 2.57:1 — below even the 3:1 large-text
 * threshold, and listed in `prohibitedPairs`. It shipped anyway, on every
 * primary button including "Confirm Booking": the Button variant said
 * `text-white`, a stylesheet the Button injected at runtime said
 * `color: #ffffff !important`, and four call sites set it again in their own
 * className. A rule written only in tokens.ts reached none of them, so the
 * rule is a test.
 */

const ROOTS = ['app', 'components'];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('text on the radiant gradient', () => {
  it('is legible at the coral end, where the gradient is weakest', () => {
    // The primary variant's text colour is --color-primary-foreground, deep teal.
    expect(contrastRatio(brand.deepTeal, brand.coral)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(prohibitedPairs).toContainEqual(
      expect.objectContaining({
        foreground: base.white,
        background: brand.coral,
      })
    );
  });

  it.each(['primary', 'premium-glow'] as const)(
    'the %s Button variant does not use white text',
    variant => {
      const classes = buttonVariants({ variant }).split(/\s+/);
      expect(classes).toContain('bg-lumina-radiant');
      expect(classes).not.toContain('text-white');
      expect(classes).toContain('text-primary-foreground');
    }
  );

  it('no component pairs the gradient with white text in one class list', () => {
    const offenders = ROOTS.flatMap(tsxFiles).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      // Every quoted class list that names the gradient.
      const lists =
        source.match(/(['"`])[^'"`\n]*lumina-radiant[^'"`\n]*\1/g) ?? [];
      return lists
        .filter(list => /(^|[\s'"`])text-white(?![\w/-])/.test(list))
        .map(list => `${file}: ${list}`);
    });

    expect(offenders).toEqual([]);
  });
});
