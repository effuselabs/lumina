import { readFileSync, readdirSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Every `<Input>` has a real label.
 *
 * `Input` used to fall back to its placeholder as an `aria-label`. That hid
 * inputs that had no label at all — 17 of them, search boxes mostly — and
 * overrode the visible `<label>` on the ones that did, so screen readers read
 * the placeholder instead of the field's name (#63). The fallback is gone, so
 * an input without a label now has no accessible name, and this test is what
 * stops one being added.
 *
 * Structural, like the tenant-isolation gate: it reads the source. An input
 * counts as labelled when it
 *   - has its own `aria-label` or `aria-labelledby`,
 *   - has an `id` (for a `<label htmlFor>`),
 *   - sits inside `<FormControl>` (react-hook-form's `FormItem` wires its
 *     `FormLabel` to it) or the `FormField` from `components/ui/form-field`
 *     (which does the same), or
 *   - sits inside a `<label>`.
 */

const ROOTS = ['app', 'components'];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

/** Whether the nearest unclosed `<tag` before `index` is still open. */
function insideOpen(source: string, index: number, tag: string): boolean {
  const before = source.slice(0, index);
  return before.lastIndexOf(`<${tag}`) > before.lastIndexOf(`</${tag}>`);
}

function unlabelledInputs(): string[] {
  const found: string[] = [];
  for (const file of ROOTS.flatMap(root =>
    tsxFiles(join(process.cwd(), root))
  )) {
    const path = relative(process.cwd(), file).split(sep).join('/');
    if (path === 'components/ui/input.tsx') continue;
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/<Input\b([\s\S]*?)\/>/g)) {
      const attributes = match[1];
      const index = match.index ?? 0;
      const labelled =
        /\baria-label(ledby)?=/.test(attributes) ||
        /\bid=/.test(attributes) ||
        insideOpen(source, index, 'FormControl') ||
        insideOpen(source, index, 'FormField') ||
        insideOpen(source, index, 'label');
      if (!labelled) {
        found.push(`${path}:${source.slice(0, index).split('\n').length}`);
      }
    }
  }
  return found;
}

describe('input labels', () => {
  it('finds inputs to check', () => {
    // Guards the scan itself, so an empty result is not a vacuous pass.
    const total = ROOTS.flatMap(root => tsxFiles(join(process.cwd(), root)))
      .map(file => (readFileSync(file, 'utf8').match(/<Input\b/g) ?? []).length)
      .reduce((sum, count) => sum + count, 0);
    expect(total).toBeGreaterThan(50);
  });

  it('gives every <Input> a real label, not just a placeholder', () => {
    expect(unlabelledInputs()).toEqual([]);
  });
});
