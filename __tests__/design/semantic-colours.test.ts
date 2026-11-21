import { readFileSync } from 'fs';
import { join } from 'path';
import postcss, { type Rule } from 'postcss';
import tailwindConfig from '../../tailwind.config';
import { palette, themed } from '@/lib/design/tokens';

/**
 * Stage 2 (#155) moved every themed colour onto the gold-on-ink palette.
 * Each name has one role, and these hold the role to its palette value in
 * both themes, so a later edit to one cannot drift from the palette.
 */
const ROLE = {
  canvas: 'canvas',
  surface: 'surface',
  'surface-muted': 'canvas',
  'surface-sunken': 'sunken',
  'surface-raised': 'raised',
  'surface-strong': 'line',
  'surface-dim': 'lineStrong',
  'ink-strong': 'inkStrong',
  'ink-deep': 'inkStrong',
  'ink-brand': 'inkStrong',
  'ink-gold': 'gold',
  ink: 'ink',
  'ink-soft': 'inkSoft',
  'ink-muted': 'inkMuted',
  'ink-faint': 'inkFaint',
  line: 'line',
  'line-strong': 'lineStrong',
} as const;

describe('themed colours', () => {
  it.each(Object.entries(ROLE))("%s is the palette's %s", (name, role) => {
    const value = themed[name as keyof typeof themed];
    expect(value.light).toBe(palette.light[role]);
    expect(value.dark).toBe(palette.dark[role]);
  });

  it('gives every themed name a role or a fill', () => {
    const fills = Object.keys(themed).filter(
      name => !(name in ROLE) && !name.startsWith('gold') && name !== 'focus'
    );
    // line-soft is the one quiet line: sunken in light, raised in dark.
    expect(fills).toEqual(['line-soft']);
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
