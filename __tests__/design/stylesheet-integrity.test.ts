/**
 * @jest-environment node
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@tailwindcss/node';
import postcss from 'postcss';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageHeader } from '@/components/ui/page-header';
import tailwind3Order from '@/lib/design/postcss-tailwind-3-order';

/**
 * Three faults the screen audit found (#153) had one shape: CSS that names
 * something that does not exist, which a browser ignores without a word.
 *
 * - Every rounded-sm, -md and -lg corner rendered square, because the radii
 *   were `var(--radius)` and --radius was never defined.
 * - Page headings used `lumina-heading-2` and friends, which no stylesheet
 *   defined, so titles rendered as body text (#117).
 * - Hover colours such as `hover:bg-secondary/90` compiled to nothing under
 *   Tailwind 3, which dropped opacity on CSS-variable colours.
 *
 * This builds the app's stylesheet as the app does, for every class-like
 * token in the source, and checks each kind of silence.
 */

const root = process.cwd();

function sourceTokens(): string[] {
  const files = execSync(
    "git ls-files ':(glob)app/**/*.ts' ':(glob)app/**/*.tsx' ':(glob)components/**/*.ts' ':(glob)components/**/*.tsx' ':(glob)lib/**/*.ts' ':(glob)lib/**/*.tsx' ':(glob)hooks/**/*.ts' ':(glob)hooks/**/*.tsx'",
    { cwd: root, encoding: 'utf8' }
  )
    .trim()
    .split('\n');
  const tokens = files.flatMap(
    file =>
      readFileSync(join(root, file), 'utf8').match(
        /[A-Za-z0-9_:./[\]()%#,-]+/g
      ) ?? []
  );
  return [...new Set(tokens)];
}

const tokens = sourceTokens();
let css = '';

beforeAll(async () => {
  const path = join(root, 'app/globals.css');
  const ordered = (
    await postcss([tailwind3Order()]).process(readFileSync(path, 'utf8'), {
      from: path,
    })
  ).css;
  const compiler = await compile(ordered, {
    base: join(root, 'app'),
    onDependency: () => {},
  });
  css = compiler.build(tokens);
}, 60_000);

/**
 * Defined outside the stylesheet: Radix sets its two on the element at
 * runtime, and next/font defines --font-inter in the class it puts on
 * <html> (app/layout.tsx).
 */
const RUNTIME = new Set([
  '--font-inter',
  '--radix-select-trigger-height',
  '--radix-select-trigger-width',
]);

const escape = (cls: string) => cls.replace(/([:/.[\]()%#,])/g, '\\$1');

describe('the built stylesheet', () => {
  it('reads no custom property that nothing defines', () => {
    const ast = postcss.parse(css);
    const defined = new Set<string>();
    ast.walkDecls(/^--/, decl => {
      defined.add(decl.prop);
    });
    ast.walkAtRules('property', rule => {
      defined.add(rule.params.trim());
    });

    const missing = new Set<string>();
    ast.walkDecls(decl => {
      // A var() with a fallback is safe by construction.
      for (const [, name] of decl.value.matchAll(/var\((--[\w-]+)\s*\)/g)) {
        if (!defined.has(name) && !RUNTIME.has(name)) missing.add(name);
      }
    });

    expect([...missing].sort()).toEqual([]);
  });

  it('defines every lumina- class the app uses', () => {
    const used = tokens.filter(token => /^lumina-[a-z0-9-]+$/.test(token));
    // Not classes: a cookie name, the CSRF header names, the theme's
    // storage key.
    const notClasses = new Set([
      'lumina-development-csrf',
      'lumina-development-public-booking-csrf',
      'lumina-theme',
    ]);
    const undefinedClasses = used.filter(
      cls => !notClasses.has(cls) && !css.includes(`.${escape(cls)}`)
    );

    expect(undefinedClasses.sort()).toEqual([]);
  });

  it('styles the page title every dashboard page shares', () => {
    // PageHeader's own classes were never defined, so the title on Staff,
    // Clients, Services, Payments and Analytics rendered as body text.
    const markup = renderToStaticMarkup(
      createElement(
        PageHeader,
        {
          title: 'Staff',
          subtitle: 'Team',
          description: 'Everyone who works here.',
          breadcrumbs: [
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Staff' },
          ],
          actions: [{ label: 'Invite', onClick: () => {}, primary: true }],
        },
        'More'
      )
    );
    const classes = [
      ...new Set(
        [...markup.matchAll(/class="([^"]+)"/g)].flatMap(([, list]) =>
          list.split(/\s+/)
        )
      ),
    ];
    expect(classes).toContain('text-2xl');

    // lucide-react tags its icons with these; they are hooks, not styles.
    const missing = classes.filter(
      cls => !cls.startsWith('lucide') && !css.includes(`.${escape(cls)}`)
    );
    expect(missing).toEqual([]);
  });

  it('compiles every colour class with an opacity, hovers included', () => {
    const withOpacity = tokens.filter(token =>
      /^([a-z-]+:)*(bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|divide)-[a-z][\w-]*\/\d{1,3}$/.test(
        token
      )
    );
    expect(withOpacity.length).toBeGreaterThan(0);

    const silent = withOpacity.filter(cls => !css.includes(`.${escape(cls)}`));
    expect(silent.sort()).toEqual([]);
  });
});
