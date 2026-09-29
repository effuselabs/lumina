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

/**
 * Semantic status colours. Each is used as text on white as well as a fill,
 * so each meets AA (4.5:1) against white both ways round — `contrastPairs`
 * below holds them to it.
 *
 * success and warning were #16A34A (3.30:1) and #D97706 (3.19:1), which
 * failed as text. info was #0284C7 (4.10:1, also failing) here while the CSS
 * rendered #2563EB (5.17:1): the two had drifted, and this file was the one
 * nobody saw. It now holds what renders. `app/globals.css` repeats these as
 * `--semantic-*`; __tests__/design/css-token-parity.test.ts fails if the two
 * disagree again.
 */
export const status = {
  success: '#15803D',
  warning: '#B45309',
  error: '#DC2626',
  info: '#2563EB',
} as const;

/** Pure white and black, for the places a named neutral would be a lie. */
export const base = {
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * The second palette, as components use it today.
 *
 * The deleted `app/design-tokens/colors.css` defined its own neutral ramp
 * and semantic colours. Nothing ever loaded that file, but components had
 * copied its values in directly: `#808285` for muted text in a dozen places,
 * `#22C58B` for positive trends where `status` says otherwise. They are recorded here at their exact values so that moving
 * every hex into this file changes nothing anyone can see. Reconciling them
 * with `neutral` and `status` does change what people see, so it is a design
 * decision with its own screenshots, tracked in docs/PLAN.md — not something
 * to fold in silently.
 */
export const legacy = {
  /** Secondary text and chart axes. Was colors.css `--neutral-600`. */
  textMuted: '#808285',
  /** Body text on light surfaces. Was colors.css `--neutral-900`. */
  textStrong: '#1D2D35',
  /** Chart gridlines. Was colors.css `--neutral-300`. */
  gridline: '#E4E6E7',
  /** Positive trends and revenue. Was colors.css `--semantic-success`. */
  positive: '#22C58B',
  positiveSurface: '#ECFDF5',
  positiveBorder: '#A7F3D0',
  /** Negative trends. Was colors.css `--semantic-error`. */
  negative: '#E5484D',
  /** The pressed radiant gradient on the analytics page. */
  radiantPressedFrom: '#FFCD47',
  radiantPressedTo: '#FF6B47',
} as const;

/** Chart series beyond the brand colours. */
export const chart = {
  blue: '#3B82F6',
  amber: '#F59E0B',
  violet: '#8B5CF6',
  slate: '#6B7280',
  cyan: '#06B6D4',
} as const;

/** Surfaces the runtime theme switcher writes onto `:root`. */
export const themeSurface = {
  darkBackground: '#0A0A0A',
  darkBorder: '#27272A',
  lightBorder: '#E5E7EB',
} as const;

/**
 * Stripe Elements appearance. Stripe renders card fields in its own iframe and
 * accepts only literal colours, so these cannot be CSS variables.
 */
export const stripeAppearance = {
  text: '#424770',
  placeholder: '#AAB7C4',
  invalid: '#9E2146',
  textDark: '#1F2937',
  danger: '#EF4444',
} as const;

/**
 * Email templates. Mail clients ignore CSS variables and most stylesheets, so
 * templates inline literal colours — taken from here, so they still have one
 * source.
 */
export const email = {
  canvas: '#F6F9FC',
  divider: '#E6EBF1',
  text: '#111827',
  textMuted: '#6B7280',
  /**
   * The HTML-string templates in lib/email/templates/*.ts, which carry their
   * own greys and callout tints. Recorded at their exact values so moving them
   * here changed no email; aligning them with the React template above is a
   * design change, not a refactor.
   */
  html: {
    page: '#F5F5F5',
    body: '#333333',
    bodyMuted: '#666666',
    panel: '#F9F9F9',
    rule: '#E0E0E0',
    reminderSurface: '#FFF8E1',
    cancellationSurface: '#FFF3F3',
    cancellationAccent: '#D32F2F',
    bookingSurface: '#F0F8FF',
  },
} as const;

/**
 * Tint and shade steps behind Tailwind's `deep-teal-50`, `sage-green-700` and
 * the like. Each palette's base step is a CSS variable in tailwind.config.ts;
 * these are the rest, moved here unchanged. The status steps 700 and 800 are
 * shades of the status colours as they were before #29 changed them, so they
 * no longer step from `status` — reconciling that is a visible change.
 */
export const scales = {
  deepTeal: {
    50: '#F0F9FA',
    100: '#D9F0F2',
    200: '#B3E1E5',
    300: '#8DD2D8',
    400: '#67C3CB',
    500: '#41B4BE',
    600: '#2E8A95',
    700: '#1B5F6C',
    900: '#081F26',
  },
  clarityBlue: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    600: '#0284C7',
    700: '#0369A1',
  },
  softPeach: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    600: '#EA580C',
    700: '#C2410C',
  },
  sageGreen: {
    50: '#F6F8F3',
    100: '#EDF1E7',
    200: '#DBE3CF',
    300: '#C9D5B7',
    400: '#B7C79F',
    600: '#6C8755',
    700: '#516540',
    800: '#36432A',
    900: '#1B2115',
  },
  warmGray: {
    50: '#F9F8F7',
    100: '#F3F1EF',
    200: '#E7E3DF',
    300: '#DBD5CF',
    400: '#CFC7BF',
    600: '#6F6B66',
    700: '#53504D',
    800: '#373533',
    900: '#1B1A1A',
  },
  lavenderMist: {
    50: '#FAF8FB',
    100: '#F5F1F7',
    200: '#EBE3EF',
    300: '#E1D5E7',
    400: '#D7C7DF',
    600: '#A091A7',
    700: '#786D7D',
    800: '#504853',
    900: '#282429',
  },
  cream: {
    50: '#FEFEFE',
    100: '#FDFDFC',
    300: '#F1EDE6',
    400: '#EBE5DC',
    500: '#E5DDD2',
    600: '#B7B1A8',
    700: '#89857E',
    800: '#5B5854',
    900: '#2D2C2A',
  },
  success: {
    700: '#138B75',
    800: '#0F7B6C',
  },
  warning: {
    700: '#CC9400',
    800: '#B38300',
  },
  error: {
    700: '#C12B2C',
    800: '#AC2627',
  },
  info: {
    700: '#4A8BC2',
    800: '#397BAF',
  },
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
  // Status colours are text as often as they are fills: "Active", "+12%",
  // "Payment failed". Both directions are checked, since badges put white
  // text on the same colours.
  ...(Object.entries(status) as Array<[string, string]>).flatMap(
    ([name, value]) => [
      {
        name: `${name} text on white`,
        foreground: value,
        background: '#FFFFFF',
      },
      {
        name: `white on ${name} fill`,
        foreground: '#FFFFFF',
        background: value,
      },
    ]
  ),
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
  base,
  legacy,
  chart,
  themeSurface,
  stripeAppearance,
  email,
  scales,
  gradients,
  typography,
  spacing,
  radii,
  shadows,
  contrastPairs,
  cssVariables,
} as const;

export default tokens;
