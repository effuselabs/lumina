import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import postcss, { type AtRule, type Node, type Rule } from 'postcss';

/**
 * Dark mode never applied, and this is why.
 *
 * Tailwind 3's `@layer base` is not a CSS cascade layer: Tailwind moves its
 * rules up to wherever `@tailwind base` sits, the top of globals.css. The
 * `.dark` variables lived in `@layer base`, so in the built stylesheet they
 * came before the plain `:root` block that sets the same properties. `.dark`
 * and `:root` have the same specificity, so the later `:root` won, and
 * `<html class="dark">` changed nothing. ThemeProvider papered over four of
 * the properties with inline styles, which hid the bug.
 */

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
const root = postcss.parse(css);

const customProps = (rule: Rule) =>
  rule.nodes.flatMap(node =>
    node.type === 'decl' && node.prop.startsWith('--') ? [node.prop] : []
  );

function inLayer(rule: Rule): boolean {
  let parent: Node | undefined = rule.parent;
  for (; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && (parent as AtRule).name === 'layer') {
      return true;
    }
  }
  return false;
}

const offset = (rule: Rule) => rule.source?.start?.offset ?? 0;

const rules: Rule[] = [];
root.walkRules(rule => {
  rules.push(rule);
});

const darkRules = rules.filter(
  rule => rule.selector === '.dark' && customProps(rule).length > 0
);

describe('dark theme variables', () => {
  it('are defined', () => {
    expect(darkRules.length).toBeGreaterThan(0);
  });

  it('are not inside @layer, where Tailwind hoists them above :root', () => {
    expect(darkRules.filter(inLayer).map(rule => rule.selector)).toEqual([]);
  });

  it('come after every :root rule that sets the same property', () => {
    const lateRoots = darkRules.flatMap(dark => {
      const props = new Set(customProps(dark));
      return rules
        .filter(rule => rule.selector === ':root')
        .filter(rule => offset(rule) > offset(dark))
        .flatMap(rule => customProps(rule).filter(prop => props.has(prop)));
    });
    expect(lateRoots).toEqual([]);
  });

  it('come from the stylesheet, not inline styles set by ThemeProvider', () => {
    const provider = readFileSync(
      join(process.cwd(), 'components/theme-provider.tsx'),
      'utf8'
    );
    expect(provider).not.toMatch(/setProperty\(\s*['"]--/);
  });
});

/**
 * The dashboard once wrapped itself in a second ThemeProvider, with
 * `defaultTheme="system"` and its own storage key. Both wrote the class on
 * <html>, the inner one won, and the dashboard followed the OS whatever the
 * app's setting said.
 */
describe('theme provider', () => {
  function tsx(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return tsx(path);
      return entry.name.endsWith('.tsx') ? [path] : [];
    });
  }

  it('is rendered once, in components/providers.tsx', () => {
    const renderers = ['app', 'components']
      .flatMap(dir => tsx(join(process.cwd(), dir)))
      .filter(path => /<ThemeProvider\b/.test(readFileSync(path, 'utf8')))
      .map(path => relative(process.cwd(), path));
    expect(renderers).toEqual(['components/providers.tsx']);
  });
});
