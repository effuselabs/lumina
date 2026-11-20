/**
 * Make Tailwind 4 print the utilities written in app/globals.css in the order
 * they are written, as Tailwind 3 did (#154).
 *
 * Tailwind 3 printed hand-written utilities after its own and in source order,
 * so where two of them set the same property on one element, the later one
 * won: a badge class beat the colour helper declared above it. Tailwind 4 sorts
 * every utility by the properties it sets, then by how many declarations it
 * has (most first), then by name. Each hand-written utility already starts
 * with `--tw-sort: forced-color-adjust`, which sorts it after Tailwind's own;
 * this plugin then pads each with further `--tw-sort` declarations, which
 * Tailwind counts but never prints, so that every utility has more
 * declarations than the one written after it. Ties then break in source order.
 *
 * It touches only utilities that carry that first declaration, and goes when
 * the hand-written utilities do. __tests__/design/tailwind-3-compat.test.ts
 * pins the Tailwind behaviour it depends on.
 */
const MARKER = 'forced-color-adjust';

const isLegacyUtility = node =>
  node.type === 'atrule' &&
  node.name === 'utility' &&
  node.first?.type === 'decl' &&
  node.first.prop === '--tw-sort' &&
  node.first.value === MARKER;

/** Tailwind counts every declaration with a value, nested ones included. */
const declarationCount = node => {
  let count = 0;
  node.walkDecls(() => {
    count += 1;
  });
  return count;
};

const plugin = () => ({
  postcssPlugin: 'tailwind-3-order',
  Once(root, { Declaration }) {
    const utilities = root.nodes.filter(isLegacyUtility);
    let following = 0;
    for (let i = utilities.length - 1; i >= 0; i -= 1) {
      const utility = utilities[i];
      const count = declarationCount(utility);
      const target = Math.max(count, following + 1);
      for (let k = count; k < target; k += 1) {
        utility.append(new Declaration({ prop: '--tw-sort', value: MARKER }));
      }
      following = target;
    }
  },
});
plugin.postcss = true;

module.exports = plugin;
