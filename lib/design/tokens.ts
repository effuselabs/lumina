/**
 * Lumina design tokens — the single source of truth.
 *
 * Every colour, spacing step, radius, shadow and font in the product is
 * declared here and nowhere else. `tailwind.config.ts` imports this file
 * rather than restating values, and the CSS custom properties consumed by the
 * runtime theme switcher are generated from `cssVariables` below.
 *
 * WHY THIS FILE EXISTS
 * Values were previously duplicated across four places: app/globals.css
 * (4,224 lines, 751 custom classes), app/design-tokens/*.css (475 custom
 * properties), tailwind.config.ts (575 lines plus a hand-maintained safelist),
 * and per-component variants. They had drifted: `--neutral-100` was defined
 * twice with different values (#f5f5f5 and #f8fafc), and brand hexes appeared
 * in both upper and lower case (#FFD25A vs #ffd25a). There was no single place
 * a design fix could land, which is why design fixes kept being redone.
 *
 * RULES
 * - No raw hex in .tsx files. Import from here, or use a Tailwind class.
 * - Adding a colour means adding it here first.
 * - The brand guide in docs/brand/ is generated from this file, so it cannot
 *   drift from the application.
 */

/**
 * Brand palette. These five are the identity — do not alter them without an
 * explicit brand decision.
 */
export const brand = {
  /** Primary. Start of the Lumina Radiant gradient. */
  gold: '#FFD25A',
  /** Primary. End of the Lumina Radiant gradient. */
  coral: '#FF7A5A',
  /** Warm tint used for soft fills and highlights. */
  peach: '#FFE5B4',
  /** Secondary. Deep, grounding background and heading colour. */
  deepTeal: '#0B2B33',
  /** Neutral warm base used for large calm surfaces. */
  cream: '#F7F5F0',
} as const;

/** Supporting accents. Used for categorisation and status, not identity. */
export const accent = {
  clarityBlue: '#89CFF0',
  sageGreen: '#87A96B',
  lavenderMist: '#C8B5D1',
  warmGray: '#8B8680',
} as const;

/**
 * Neutral ramp. Canonical values — this ramp previously existed twice with
 * conflicting definitions.
 */
export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
} as const;

/** Semantic status colours. */
export const status = {
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',
} as const;

/** Gradients. The radiant gradient is the single strongest brand signal. */
export const gradients = {
  radiant: `linear-gradient(135deg, ${brand.gold} 0%, ${brand.coral} 100%)`,
  radiantReverse: `linear-gradient(135deg, ${brand.coral} 0%, ${brand.gold} 100%)`,
} as const;

/** Typography. Inter for everything; IBM Plex Mono for numerals and code. */
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/** Spacing scale, in rem. Keyed by the Tailwind step name. */
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const radii = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(11 43 51 / 0.05)',
  md: '0 4px 6px -1px rgb(11 43 51 / 0.10), 0 2px 4px -2px rgb(11 43 51 / 0.10)',
  lg: '0 10px 15px -3px rgb(11 43 51 / 0.10), 0 4px 6px -4px rgb(11 43 51 / 0.10)',
  xl: '0 20px 25px -5px rgb(11 43 51 / 0.10), 0 8px 10px -6px rgb(11 43 51 / 0.10)',
} as const;

/**
 * Foreground/background pairs that must meet WCAG AA (4.5:1 for body text).
 * A contrast test asserts every entry, so a regression fails CI rather than
 * becoming a future accessibility audit.
 */
export const contrastPairs: ReadonlyArray<{
  name: string;
  foreground: string;
  background: string;
  /** Large text (>=18.66px bold or >=24px) only needs 3:1. */
  largeText?: boolean;
}> = [
  { name: 'body on white', foreground: neutral[900], background: '#FFFFFF' },
  { name: 'body on cream', foreground: neutral[900], background: brand.cream },
  { name: 'muted on white', foreground: neutral[600], background: '#FFFFFF' },
  {
    name: 'white on deep teal',
    foreground: '#FFFFFF',
    background: brand.deepTeal,
  },
  {
    name: 'gold on deep teal',
    foreground: brand.gold,
    background: brand.deepTeal,
  },
  {
    name: 'deep teal on gold',
    foreground: brand.deepTeal,
    background: brand.gold,
  },
  {
    name: 'deep teal on peach',
    foreground: brand.deepTeal,
    background: brand.peach,
  },
  {
    name: 'deep teal on coral',
    foreground: brand.deepTeal,
    background: brand.coral,
  },
  {
    name: 'deep teal on cream',
    foreground: brand.deepTeal,
    background: brand.cream,
  },
];

/**
 * Combinations that are visually tempting but fail WCAG AA. Listed so the
 * constraint is discoverable at the source of truth rather than rediscovered
 * in a future accessibility audit.
 *
 * - White on coral (#FF7A5A) is 2.57:1 — below even the 3:1 large-text
 *   threshold. Coral is a surface for DARK text: deep teal reaches 5.81:1 and
 *   neutral-900 reaches 6.99:1. Never place white text on coral.
 * - The same applies to the radiant gradient, whose coral end cannot carry
 *   white text. Use deep teal on gradient fills, or place white text only on
 *   deep teal (14.92:1).
 */
export const prohibitedPairs = [
  { foreground: '#FFFFFF', background: brand.coral, ratio: 2.57 },
] as const;

/**
 * CSS custom properties emitted into `:root`. This is the bridge to any
 * styling that cannot import TypeScript, and to the runtime theme switcher.
 */
export const cssVariables: Record<string, string> = {
  '--lumina-gold': brand.gold,
  '--lumina-coral': brand.coral,
  '--lumina-peach': brand.peach,
  '--deep-teal': brand.deepTeal,
  '--cream': brand.cream,
  '--clarity-blue': accent.clarityBlue,
  '--sage-green': accent.sageGreen,
  '--lavender-mist': accent.lavenderMist,
  '--warm-gray': accent.warmGray,
  '--lumina-radiant-gradient': gradients.radiant,
  '--lumina-radiant-gradient-reverse': gradients.radiantReverse,
  ...Object.fromEntries(
    Object.entries(neutral).map(([step, value]) => [`--neutral-${step}`, value])
  ),
  ...Object.fromEntries(
    Object.entries(status).map(([name, value]) => [`--${name}`, value])
  ),
};

/** Serialise `cssVariables` into a `:root { ... }` block. */
export function cssVariablesBlock(selector = ':root'): string {
  const body = Object.entries(cssVariables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

export const tokens = {
  brand,
  accent,
  neutral,
  status,
  gradients,
  typography,
  spacing,
  radii,
  shadows,
  contrastPairs,
  cssVariables,
} as const;

export default tokens;
