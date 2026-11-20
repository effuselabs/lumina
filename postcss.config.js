module.exports = {
  plugins: {
    // Before Tailwind: orders the hand-written utilities as Tailwind 3 did.
    './lib/design/postcss-tailwind-3-order.js': {},
    '@tailwindcss/postcss': {},
  },
};
