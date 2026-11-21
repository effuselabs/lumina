import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@tailwindcss/node';
import postcss from 'postcss';
import tailwind3Order from '@/lib/design/postcss-tailwind-3-order';

/** Helpers for tests that check the app's CSS against its markup. */

export const root = process.cwd();

export function sourceFiles(patterns: string[]): string[] {
  // :(glob) makes ** match zero directories too; without it, app/**/*.tsx
  // skips app/page.tsx.
  return execSync(
    `git ls-files ${patterns.map(p => `':(glob)${p}'`).join(' ')}`,
    {
      cwd: root,
      encoding: 'utf8',
    }
  )
    .trim()
    .split('\n')
    .filter(Boolean);
}

export const read = (file: string) => readFileSync(join(root, file), 'utf8');

const APP_SOURCE = [
  'app/**/*.ts',
  'app/**/*.tsx',
  'components/**/*.ts',
  'components/**/*.tsx',
  'lib/**/*.ts',
  'lib/**/*.tsx',
  'hooks/**/*.ts',
  'hooks/**/*.tsx',
];

/** Every class-like token anywhere in the app's TypeScript. */
export function sourceTokens(): string[] {
  const tokens = sourceFiles(APP_SOURCE).flatMap(
    file => read(file).match(/[A-Za-z0-9_:./[\]()%#,-]+/g) ?? []
  );
  return [...new Set(tokens)];
}

const CLASS = /^!?[a-z][a-z0-9]*(?:[-:][a-z0-9!./[\]()%#,_-]*)+$/;

/**
 * Class names written in markup: the string literals inside className and
 * inside cn(), clsx() and cva(). Only hyphenated or prefixed names count;
 * a bare word may as well be a variant name or a comparison.
 */
export function markupClasses(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  const add = (cls: string, file: string) => {
    if (!CLASS.test(cls) || cls.endsWith('.') || cls.endsWith(':')) return;
    used.set(cls, [...(used.get(cls) ?? []), file]);
  };
  for (const file of sourceFiles(['app/**/*.tsx', 'components/**/*.tsx'])) {
    const text = read(file);
    for (const m of text.matchAll(/className=(?:\{\s*)?(["'`])([^"'`]*?)\1/g)) {
      if (!m[2].includes('${')) m[2].split(/\s+/).forEach(c => add(c, file));
    }
    for (const call of text.matchAll(
      /\b(?:cn|clsx|cva)\(([\s\S]*?)\)\s*[;,}\n]/g
    )) {
      for (const lit of call[1].matchAll(/(["'`])([^"'`$]*?)\1/g)) {
        // A literal compared against, returned, or used as an object key is
        // a variant name, not a class: variant === 'compact', 'no-show': …
        const before = call[1].slice(0, lit.index).trimEnd();
        const after = call[1].slice(lit.index! + lit[0].length).trimStart();
        if (
          /(===|!==|\bcase|\breturn)$/.test(before) ||
          after.startsWith(':')
        ) {
          continue;
        }
        lit[2].split(/\s+/).forEach(c => add(c, file));
      }
    }
  }
  return used;
}

/** The app's stylesheet, built as the app builds it, for `candidates`. */
export async function buildStylesheet(candidates: string[]): Promise<string> {
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
  return compiler.build(candidates);
}

export const selectorFor = (cls: string) =>
  `.${cls.replace(/([:/.[\]()%#,!])/g, '\\$1')}`;
