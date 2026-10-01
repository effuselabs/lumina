import { readFileSync } from 'fs';
import { join } from 'path';
import postcss, { type Rule } from 'postcss';
import colors from 'tailwindcss/colors';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config';
import { themed } from '@/lib/design/tokens';

/**
 * The themed names replace hardcoded Tailwind grays one component at a time.
 * That is only safe if each light value is exactly the gray it replaces, so a
 * component moved onto `text-ink-strong` looks the same in light mode as it
 * did on `text-gray-900`.
 */
const REPLACES: Record<keyof typeof themed, string> = {
  surface: '#FFFFFF', // colors.white is the shorthand #fff
  'surface-muted': colors.gray[50],
  'surface-sunken': colors.gray[100],
  'surface-strong': colors.gray[200],
  'ink-strong': colors.gray[900],
  ink: colors.gray[700],
  'ink-soft': colors.gray[600],
  'ink-muted': colors.gray[500],
  'ink-faint': colors.gray[400],
  line: colors.gray[200],
  'line-strong': colors.gray[300],
  'line-soft': colors.gray[100],
};

describe('themed colours', () => {
  it.each(Object.entries(REPLACES))('%s is %s in light mode', (name, gray) => {
    expect(themed[name as keyof typeof themed].light.toLowerCase()).toBe(
      gray.toLowerCase()
    );
  });

  it('are Tailwind colours pointing at their --ui-* properties', () => {
    const resolved = resolveConfig(tailwindConfig).theme
      .colors as unknown as Record<string, Record<string, string>>;
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
