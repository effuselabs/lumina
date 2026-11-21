/**
 * @jest-environment node
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@tailwindcss/node';
import postcss from 'postcss';
import { tailwind3Palette } from '@/lib/design/tokens';
import tailwind3Order from '@/lib/design/postcss-tailwind-3-order';

/**
 * The upgrade to Tailwind 4 was made to change nothing anyone can see (#154).
 * Four things keep it that way until the screens are rebuilt on tokens, and
 * each can fail silently, so each is pinned here:
 *
 * - space-x and space-y keep Tailwind 3's selector (tailwind-3-compat.css);
 * - Tailwind's default palette keeps its Tailwind 3 colours (tailwind3Palette);
 * - hand-written utilities sort after Tailwind's and in source order
 *   (postcss-tailwind-3-order.js), which rests on how Tailwind 4 sorts;
 * - no hand-written utility shares a name with one of Tailwind's, because
 *   the two then sort unpredictably against each other.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** Every class-like token in the application's TypeScript. */
function sourceTokens(): string[] {
  const files = execSync(
    "git ls-files ':(glob)app/**/*.ts' ':(glob)app/**/*.tsx' ':(glob)components/**/*.ts' ':(glob)components/**/*.tsx' ':(glob)lib/**/*.ts' ':(glob)lib/**/*.tsx' ':(glob)hooks/**/*.ts' ':(glob)hooks/**/*.tsx'",
    { cwd: root, encoding: 'utf8' }
  )
    .trim()
    .split('\n');
  return files.flatMap(file => read(file).match(/[A-Za-z0-9_:./-]+/g) ?? []);
}

const tokens = sourceTokens();

describe('space-x and space-y', () => {
  const globals = read('app/globals.css');
  const compat = read('app/tailwind-3-compat.css');
  const excluded = (
    globals.match(/@source not inline\("([^"]+)"\)/)?.[1] ?? ''
  ).split(' ');

  it('are each defined the Tailwind 3 way, and kept from Tailwind 4', () => {
    const used = [
      ...new Set(
        tokens.filter(token => /^([a-z]+:)?space-[xy]-[0-9.]+$/.test(token))
      ),
    ].sort();

    expect(used.filter(cls => !excluded.includes(cls))).toEqual([]);
    for (const cls of excluded) {
      const selector = `.${cls.replace(/([:.])/g, '\\$1')} > :not([hidden]) ~ :not([hidden])`;
      expect(compat).toContain(selector);
    }
  });
});

describe("Tailwind 3's default palette", () => {
  const families =
    'slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
  const shade = new RegExp(`(?:^|[a-z]-)(${families})-(\\d{2,3})(?:/\\d+)?$`);

  const pinned = Object.entries(tailwind3Palette).flatMap(([family, shades]) =>
    Object.keys(shades).map(step => `${family}-${step}`)
  );

  it('pins exactly the shades in use, so the list only shrinks', () => {
    const used = new Set(
      tokens.flatMap(token => {
        const match = token.match(shade);
        return match ? [`${match[1]}-${match[2]}`] : [];
      })
    );
    // gray-200 is also the default border colour (globals.css). emerald-25
    // has never existed in any palette: the class does nothing in either
    // version.
    used.add('gray-200');
    used.delete('emerald-25');

    expect([...used].sort()).toEqual([...pinned].sort());
  });
});

/** Compile `css` as the app does: our ordering plugin first, then Tailwind. */
async function build(css: string, candidates: string[]): Promise<string> {
  const ordered = (
    await postcss([tailwind3Order()]).process(css, {
      from: undefined,
    })
  ).css;
  const compiler = await compile(ordered, {
    base: root,
    onDependency: () => {},
  });
  return compiler.build(candidates);
}

describe('hand-written utilities', () => {
  it('sort after Tailwind’s own and in source order, before variants', async () => {
    const css = await build(
      `@import 'tailwindcss';
       @utility legacy-first {
         --tw-sort: forced-color-adjust;
         color: red;
       }
       @utility legacy-second {
         --tw-sort: forced-color-adjust;
         color: green;
         font-weight: 600;
         padding: 1rem;
       }`,
      ['hover:text-black', 'legacy-second', 'p-4', 'legacy-first', 'text-white']
    );
    const at = (selector: string) => css.indexOf(selector);

    // Tailwind's own utilities first,
    expect(at('.text-white')).toBeLessThan(at('.legacy-first'));
    expect(at('.p-4')).toBeLessThan(at('.legacy-first'));
    // then the hand-written ones as written, although the second has more
    // declarations and Tailwind 4 alone would print it first,
    expect(at('.legacy-first')).toBeLessThan(at('.legacy-second'));
    // then variants.
    expect(at('.legacy-second')).toBeLessThan(at('.hover\\:text-black'));
    // The sorting declarations never reach the browser.
    expect(css).not.toContain('--tw-sort');
  });

  it('do not share a name with one of Tailwind’s, beyond the harmless few', async () => {
    const globals = read('app/globals.css');
    const names = [...globals.matchAll(/^@utility ([^ {]+)/gm)].map(
      match => match[1]
    );
    const core = await compile("@import 'tailwindcss/utilities.css';", {
      base: root,
      onDependency: () => {},
    });
    const shared = names.filter(name => {
      const selector = `.${name.replace(/([/.:])/g, '\\$1')}`;
      const out = core.build([name]);
      return out.includes(`${selector} {`) || out.includes(`${selector}{`);
    });

    // These were Tailwind's in version 3 as well, with the same effect, or
    // (delay-*) set a different property from Tailwind's.
    expect(shared.sort()).toEqual(
      [
        'aspect-square',
        'delay-100',
        'delay-1000',
        'delay-150',
        'delay-200',
        'delay-300',
        'delay-500',
        'delay-700',
        'delay-75',
        'sr-only',
      ].sort()
    );
  });
});
