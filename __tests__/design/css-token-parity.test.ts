import { readFileSync } from 'fs';
import { join } from 'path';
import { status } from '@/lib/design/tokens';

/**
 * The CSS that renders a colour must hold the value tokens.ts declares.
 *
 * `text-success` resolves to var(--color-success) → var(--semantic-success),
 * written by hand in app/globals.css; tokens.ts is never consulted. The two
 * had drifted: tokens.ts said info was #0284C7 while every `text-info` on the
 * page was #2563EB, and the design-system page, rendering from tokens.ts,
 * showed a colour users never saw. Generating the CSS from tokens.ts would end
 * this outright; until then this test makes drift a CI failure.
 */

/** The first definition of each custom property in the first :root block. */
function rootCustomProperties(css: string): Record<string, string> {
  const root = css.match(/:root\s*\{([\s\S]*?)\n\s*\}/);
  if (!root) throw new Error('No :root block in app/globals.css');

  const properties: Record<string, string> = {};
  for (const [, name, value] of root[1].matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g
  )) {
    properties[name] ??= value.trim();
  }
  return properties;
}

describe('app/globals.css matches lib/design/tokens.ts', () => {
  const properties = rootCustomProperties(
    readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
  );

  it.each(Object.entries(status))(
    '--semantic-%s is %s, as in tokens.status',
    (name, value) => {
      expect(properties[`--semantic-${name}`]?.toUpperCase()).toBe(
        value.toUpperCase()
      );
    }
  );
});
