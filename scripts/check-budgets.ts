/**
 * Size budgets (#152): fail the build when what we ship grows.
 *
 * First-load JavaScript is everything a first visit downloads: the shared
 * runtime, the root layout, every layout above the page, and the page. Next's
 * build table leaves the layouts out, so these numbers read higher than it.
 *
 * Run after `next build`. Each budget starts at what the app shipped when it
 * was set and may only fall: when a change makes something smaller, lower
 * its number in `budgets.json` in the same pull request, and the room it
 * frees cannot be spent by accident later.
 *
 *   npx tsx scripts/check-budgets.ts
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const NEXT = join(process.cwd(), '.next');

interface Budgets {
  $comment?: string;
  /** Gzipped kilobytes of JavaScript a first visit loads, per route. */
  firstLoadJs: Record<string, number>;
  /** Gzipped kilobytes of all CSS. */
  css: number;
  /** Bytes; no data: URI inlined into CSS or JavaScript may be longer. */
  dataUri: number;
}

const budgets = JSON.parse(
  readFileSync(join(process.cwd(), 'budgets.json'), 'utf8')
) as Budgets;

const gzipKb = (file: string) =>
  gzipSync(readFileSync(join(NEXT, file))).length / 1024;

const json = <T>(file: string): T =>
  JSON.parse(readFileSync(join(NEXT, file), 'utf8')) as T;

/** The JavaScript a first visit to an app-router page loads. */
function firstLoadFiles(page: string): string[] {
  const { rootMainFiles } = json<{ rootMainFiles: string[] }>(
    'build-manifest.json'
  );
  const { pages } = json<{ pages: Record<string, string[]> }>(
    'app-build-manifest.json'
  );
  // The page, the root layout, and the layout of every segment above it.
  const segments = page
    .replace(/\/page$/, '')
    .split('/')
    .filter(Boolean);
  const entries = ['/layout', page];
  for (let i = 1; i <= segments.length; i += 1) {
    entries.push(`/${segments.slice(0, i).join('/')}/layout`);
  }
  const missing = entries.filter(entry => entry === page && !(entry in pages));
  if (missing.length) throw new Error(`No build output for ${page}`);
  const files = new Set(rootMainFiles);
  for (const entry of entries) {
    for (const file of pages[entry] ?? []) files.add(file);
  }
  return [...files].filter(file => file.endsWith('.js'));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const failures: string[] = [];
const notes: string[] = [];

function check(name: string, actual: number, budget: number, unit: string) {
  const line = `${name}: ${actual.toFixed(1)} ${unit} (budget ${budget} ${unit})`;
  console.log(line);
  if (actual > budget) failures.push(line);
  else if (budget - actual >= 1) {
    notes.push(
      `${name} is ${(budget - actual).toFixed(1)} ${unit} under budget: lower it to ${Math.ceil(actual)}.`
    );
  }
}

for (const [page, budget] of Object.entries(budgets.firstLoadJs)) {
  const kb = firstLoadFiles(page).reduce((sum, file) => sum + gzipKb(file), 0);
  check(`First-load JavaScript, ${page}`, kb, budget, 'KB');
}

const staticFiles = walk(join(NEXT, 'static'));
const css = staticFiles
  .filter(file => file.endsWith('.css'))
  .reduce((sum, file) => sum + gzipSync(readFileSync(file)).length / 1024, 0);
check('CSS, all of it', css, budgets.css, 'KB');

for (const file of staticFiles.filter(f => /\.(css|js)$/.test(f))) {
  for (const [uri] of readFileSync(file, 'utf8').matchAll(
    /data:[a-z]+\/[a-z0-9.+-]+[;,][^"')\s]*/gi
  )) {
    if (uri.length > budgets.dataUri) {
      failures.push(
        `A ${uri.length}-byte data: URI in ${file.slice(NEXT.length + 1)} (budget ${budgets.dataUri})`
      );
    }
  }
}

for (const note of notes) console.log(`note: ${note}`);
if (failures.length) {
  console.error(`\nOver budget:\n${failures.map(f => `  ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\nWithin budget.');
