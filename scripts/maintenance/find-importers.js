/*
 * Which modules are imported, resolved properly.
 *
 * Usage:  node scripts/maintenance/find-importers.js < candidates.txt
 *
 * Reads one repo-relative path per line and prints any that are imported from
 * outside the set. Silence means the set is closed and safe to delete
 * together. Pair it with knip, which proposes candidates but does not resolve
 * them — and never skip the five gates afterwards, which is what caught the
 * case this script's predecessor missed.
 *
 * Grep on basenames gave two wrong answers in three batches: it matched
 * `lib/services/availability-calculator` against `lib/availability/
 * availability-calculator`, and it missed `../lib/theme-validation` imported
 * from one directory up. This resolves every specifier to a real file instead.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIRS = [
  'app',
  'components',
  'lib',
  'hooks',
  'e2e',
  '__tests__',
  'prisma',
  'scripts',
  'types',
  'test-utils',
  'factories',
];
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walk(full, out);
    } else if (EXTS.includes(path.extname(e.name))) out.push(full);
  }
  return out;
}

// static imports, re-exports, dynamic import(), and require()
const SPEC = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

function resolve(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('.'))
    base = path.resolve(path.dirname(fromFile), spec);
  else return null; // package
  for (const ext of ['', ...EXTS, ...EXTS.map(e => path.join('index') + e)]) {
    const candidate = ext.startsWith('index')
      ? path.join(base, ext)
      : base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(ROOT, candidate).split(path.sep).join('/');
    }
  }
  return null;
}

const files = DIRS.flatMap(d => walk(path.join(ROOT, d)));
const importedBy = new Map();
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(SPEC)) {
    const target = resolve(m[1], file);
    if (!target) continue;
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel === target) continue;
    if (!importedBy.has(target)) importedBy.set(target, new Set());
    importedBy.get(target).add(rel);
  }
}

// candidates on stdin (one path per line); report any with importers outside the set
const candidates = fs
  .readFileSync(0, 'utf8')
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean);
const set = new Set(candidates);
let blocked = 0;
for (const c of candidates) {
  const imps = [...(importedBy.get(c) || [])].filter(i => !set.has(i));
  if (imps.length) {
    console.log(`LIVE  ${c}  <-  ${imps.join(' ')}`);
    blocked++;
  }
}
console.log(
  `--- ${candidates.length} candidates, ${blocked} with importers outside the set`
);
