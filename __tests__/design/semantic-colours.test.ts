import { readFileSync } from 'fs';
import { join } from 'path';
import postcss, { type Rule } from 'postcss';
import tailwindConfig from '../../tailwind.config';
import { themed } from '@/lib/design/tokens';

/**
 * Tailwind 3's grays, which the themed names were measured against. Tailwind
 * 4 redrew its palette in OKLCH, so these are written out rather than read
 * from \`tailwindcss/colors\`.
 */
const GRAY_V3 = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

/**
 * The themed names replace hardcoded Tailwind grays one component at a time.
 * That is only safe if each light value is exactly the gray it replaces, so a
 * component moved onto `text-ink-strong` looks the same in light mode as it
 * did on `text-gray-900`.
 */
const REPLACES: Record<keyof typeof themed, string> = {
  surface: '#FFFFFF',
  'surface-muted': GRAY_V3[50],
  'surface-sunken': GRAY_V3[100],
  'surface-strong': GRAY_V3[200],
  'surface-dim': GRAY_V3[300],
  'ink-strong': GRAY_V3[900],
  'ink-deep': GRAY_V3[800],
  'ink-brand': '#0B2B33', // brand.deepTeal, what text-deep-teal rendered
  ink: GRAY_V3[700],
  'ink-soft': GRAY_V3[600],
  'ink-muted': GRAY_V3[500],
  'ink-faint': GRAY_V3[400],
  line: GRAY_V3[200],
  'line-strong': GRAY_V3[300],
  'line-soft': GRAY_V3[100],
};

describe('themed colours', () => {
  it.each(Object.entries(REPLACES))('%s is %s in light mode', (name, gray) => {
    expect(themed[name as keyof typeof themed].light.toLowerCase()).toBe(
      gray.toLowerCase()
    );
  });

  it('are Tailwind colours pointing at their --ui-* properties', () => {
    // Tailwind 4 has no resolveConfig; the themed colours are in extend.
    const resolved = tailwindConfig.theme?.extend?.colors as unknown as Record<
      string,
      Record<string, string>
    >;
    expect(resolved.surface.muted).toBe('var(--ui-surface-muted)');
    expect(resolved.ink.DEFAULT).toBe('var(--ui-ink)');
    expect(resolved.ink.strong).toBe('var(--ui-ink-strong)');
    expect(resolved.line.DEFAULT).toBe('var(--ui-line)');
  });

  it('switch in app/tokens.css: .dark after :root, outside any layer', () => {
    const css = readFileSync(join(process.cwd(), 'app/tokens.css'), 'utf8');
    const rules: Rule[] = [];
    postcss.parse(css).walkRules(rule => {
      if (rule.some(n => n.type === 'decl' && n.prop.startsWith('--ui-'))) {
        rules.push(rule);
      }
    });
    expect(rules.map(rule => rule.selector)).toEqual([':root', '.dark']);
    expect(rules.every(rule => rule.parent?.type === 'root')).toBe(true);
  });
});
