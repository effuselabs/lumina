import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
// Single source of truth for design values. New tokens are added there and
// consumed here — never restated. The remainder of this file still carries
// legacy values inherited from four competing sources; they migrate onto
// `tokens` in the design-system phase, once an end-to-end test exists to
// catch regressions.
import { accent, brand, scales, status } from './lib/design/tokens';

const config: Config = {
  // `dark:` follows the `.dark` class ThemeProvider sets on <html>, not the
  // visitor's OS. The default is `media`, and the app is light-only on purpose
  // (see components/providers.tsx) — so under `media` a visitor whose OS was in
  // dark mode got every `dark:` utility applied on top of the light theme: on
  // the public booking page the search box turned black. Measured before this
  // line, the same page differed by 76,570 px between light and dark OS
  // settings; after it, by none.
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  // Optimize CSS bundle size by purging unused classes
  safelist: [
    // Preserve dynamic classes that might be generated at runtime
    'bg-lumina-gradient',
    'bg-lumina-gradient-hover',
    'bg-lumina-gold',
    'bg-lumina-coral',
    'bg-lumina-peach',
    'bg-lumina-radiant',
    'bg-deep-teal',
    'bg-clarity-blue',
    'bg-soft-peach',
    'bg-sage-green',
    'bg-warm-gray',
    'bg-lavender-mist',
    'bg-cream',
    // Text colors for Lumina design system
    'text-lumina-gold',
    'text-lumina-coral',
    'text-clarity-blue',
    'text-sage-green',
    'text-lavender-mist',
    // Basic semantic colors
    'text-foreground',
    'text-muted-foreground',
    'text-card-foreground',
    'bg-card',
    'bg-background',
    'border-background',
    'border-border',
    'bg-success',
    'bg-warning',
    'bg-error',
    'bg-info',
    'bg-success-600',
    'bg-warning-600',
    'bg-error-600',
    'bg-info-600',
    // Badge variants
    'bg-success-subtle',
    'bg-warning-subtle',
    'bg-info-subtle',
    'bg-error-subtle',
    'bg-primary-subtle',
    // Card variants
    'card-glass',
    'card-gradient-border',
    'card-floating',
    'card-premium',
    'card-hover-lift',
    'card-hover-glow',
    'card-hover-scale',
    'card-animated',
    // Testimonial card classes
    'testimonial-card',
    'testimonial-card-compact',
    'testimonial-card-default',
    'testimonial-card-large',
    'testimonial-card-content',
    'testimonial-quote-icon',
    'testimonial-quote',
    'testimonial-rating',
    'testimonial-author',
    'testimonial-avatar',
    'testimonial-author-details',
    'testimonial-author-name',
    'testimonial-author-meta',
    'text-lumina-h1',
    'text-lumina-h2',
    'text-lumina-h3',
    'text-lumina-body-lg',
    'text-lumina-body-sm',
    'text-lumina-caption',
    // Preserve theme-related classes
    'dark',
    'light',
    // Preserve animation classes
    'animate-fade-in',
    'animate-slide-in',
    'animate-pulse-glow',
  ],
  theme: {
    extend: {
      // Lumina Brand Colors using CSS Custom Properties
      colors: {
        // Canonical brand values, imported from lib/design/tokens.ts.
        // Use these (`bg-brand-gold`, `text-brand-deepTeal`) in new work.
        brand: {
          gold: brand.gold,
          coral: brand.coral,
          peach: brand.peach,
          deepTeal: brand.deepTeal,
          cream: brand.cream,
          clarityBlue: accent.clarityBlue,
          sageGreen: accent.sageGreen,
          lavenderMist: accent.lavenderMist,
          warmGray: accent.warmGray,
          success: status.success,
          warning: status.warning,
          error: status.error,
          info: status.info,
        },
        // Primary Lumina Colors - Using CSS Variables
        lumina: {
          gold: 'var(--lumina-gold)',
          coral: 'var(--lumina-coral)',
          orange: 'var(--lumina-coral)', // Alias for coral
          peach: 'var(--lumina-peach)',
          dark: 'var(--neutral-900)',
          gray: 'var(--neutral-600)',
        },
        // Direct color mappings for easier usage
        'lumina-gold': 'var(--lumina-gold)',
        'lumina-coral': 'var(--lumina-coral)',
        'lumina-peach': 'var(--lumina-peach)',
        'lumina-radiant': 'var(--lumina-radiant-gradient)',
        // Secondary Brand Color using CSS Variables
        'deep-teal': {
          DEFAULT: 'var(--deep-teal)',
          50: scales.deepTeal[50],
          100: scales.deepTeal[100],
          200: scales.deepTeal[200],
          300: scales.deepTeal[300],
          400: scales.deepTeal[400],
          500: scales.deepTeal[500],
          600: scales.deepTeal[600],
          700: scales.deepTeal[700],
          800: 'var(--deep-teal)',
          900: scales.deepTeal[900],
        },
        // Tertiary Colors using CSS Variables
        'clarity-blue': {
          DEFAULT: 'var(--clarity-blue)',
          50: scales.clarityBlue[50],
          100: scales.clarityBlue[100],
          200: scales.clarityBlue[200],
          300: scales.clarityBlue[300],
          400: scales.clarityBlue[400],
          500: 'var(--clarity-blue)',
          600: scales.clarityBlue[600],
          700: scales.clarityBlue[700],
        },
        'soft-peach': {
          DEFAULT: 'var(--lumina-peach)',
          50: scales.softPeach[50],
          100: scales.softPeach[100],
          200: scales.softPeach[200],
          300: scales.softPeach[300],
          400: scales.softPeach[400],
          500: 'var(--lumina-peach)',
          600: scales.softPeach[600],
          700: scales.softPeach[700],
        },
        // Complementary Colors using CSS Variables
        'sage-green': {
          DEFAULT: 'var(--sage-green)',
          50: scales.sageGreen[50],
          100: scales.sageGreen[100],
          200: scales.sageGreen[200],
          300: scales.sageGreen[300],
          400: scales.sageGreen[400],
          500: 'var(--sage-green)',
          600: scales.sageGreen[600],
          700: scales.sageGreen[700],
          800: scales.sageGreen[800],
          900: scales.sageGreen[900],
        },
        'warm-gray': {
          DEFAULT: 'var(--warm-gray)',
          50: scales.warmGray[50],
          100: scales.warmGray[100],
          200: scales.warmGray[200],
          300: scales.warmGray[300],
          400: scales.warmGray[400],
          500: 'var(--warm-gray)',
          600: scales.warmGray[600],
          700: scales.warmGray[700],
          800: scales.warmGray[800],
          900: scales.warmGray[900],
        },
        'lavender-mist': {
          DEFAULT: 'var(--lavender-mist)',
          50: scales.lavenderMist[50],
          100: scales.lavenderMist[100],
          200: scales.lavenderMist[200],
          300: scales.lavenderMist[300],
          400: scales.lavenderMist[400],
          500: 'var(--lavender-mist)',
          600: scales.lavenderMist[600],
          700: scales.lavenderMist[700],
          800: scales.lavenderMist[800],
          900: scales.lavenderMist[900],
        },
        cream: {
          DEFAULT: 'var(--cream)',
          50: scales.cream[50],
          100: scales.cream[100],
          200: 'var(--cream)',
          300: scales.cream[300],
          400: scales.cream[400],
          500: scales.cream[500],
          600: scales.cream[600],
          700: scales.cream[700],
          800: scales.cream[800],
          900: scales.cream[900],
        },
        // Enhanced Semantic Colors using CSS Variables
        success: {
          DEFAULT: 'var(--color-success)',
          50: 'var(--color-success-background)',
          100: 'var(--color-success-background)',
          500: 'var(--color-success)',
          600: 'var(--semantic-success)',
          700: scales.success[700],
          800: scales.success[800],
          foreground: 'var(--color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          50: 'var(--color-warning-background)',
          100: 'var(--color-warning-background)',
          500: 'var(--color-warning)',
          600: 'var(--semantic-warning)',
          700: scales.warning[700],
          800: scales.warning[800],
          foreground: 'var(--color-warning-foreground)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          50: 'var(--color-error-background)',
          100: 'var(--color-error-background)',
          500: 'var(--color-error)',
          600: 'var(--semantic-error)',
          700: scales.error[700],
          800: scales.error[800],
          foreground: 'var(--color-error-foreground)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          50: 'var(--color-info-background)',
          100: 'var(--color-info-background)',
          500: 'var(--color-info)',
          600: 'var(--semantic-info)',
          700: scales.info[700],
          800: scales.info[800],
          foreground: 'var(--color-info-foreground)',
        },
        // Neutral Colors using CSS Variables
        neutral: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
        // Semantic Color Mapping using CSS Variables
        border: 'var(--color-border)',
        input: 'var(--color-border)',
        ring: 'var(--color-interactive-focus)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--color-error)',
          foreground: 'var(--color-error-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-background-muted)',
          foreground: 'var(--color-foreground-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        popover: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-foreground)',
        },
        card: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-foreground)',
        },
        // Text color variants for proper inheritance
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-disabled': 'var(--color-text-disabled)',
        'text-inverse': 'var(--color-text-inverse)',
      },
      // Lumina Radiant Gradient using CSS Variables
      backgroundImage: {
        'lumina-gradient': 'var(--lumina-radiant-gradient)',
        'lumina-gradient-hover': 'var(--lumina-radiant-gradient-reverse)',
        'lumina-radiant': 'var(--lumina-radiant-gradient)',
        'lumina-radiant-hover': 'var(--lumina-radiant-gradient-reverse)',
      },
      // Typography - Inter Font System with CSS Variables
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'Roboto Mono',
          'Consolas',
          'Courier New',
          'monospace',
        ],
        display: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        inter: [
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      // Typography Scale (per Lumina Design System v2.0)
      fontSize: {
        // Standard Tailwind sizes - updated to match Lumina specs
        xs: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }], // 12px - Caption (Medium)
        sm: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }], // 14px - Body Small (Regular)
        base: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }], // 16px - Body Large (Regular)
        lg: ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 20px - Heading 3 (SemiBold)
        '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }], // 24px - Heading 2 (SemiBold)
        '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 30px
        '4xl': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }], // 32px - Heading 1 (Bold)
        '5xl': ['3rem', { lineHeight: '1', fontWeight: '700' }],
        '6xl': ['3.75rem', { lineHeight: '1', fontWeight: '700' }],
        '7xl': ['4.5rem', { lineHeight: '1', fontWeight: '700' }],
        '8xl': ['6rem', { lineHeight: '1', fontWeight: '700' }],
        '9xl': ['8rem', { lineHeight: '1', fontWeight: '700' }],
        // Lumina Design System Typography Scale - Exact Specifications
        'lumina-h1': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }], // 32px, Bold, 40px line height
        'lumina-h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }], // 24px, SemiBold, 32px line height
        'lumina-h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 20px, SemiBold, 28px line height
        'lumina-body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }], // 16px, Regular, 24px line height
        'lumina-body-sm': [
          '0.875rem',
          { lineHeight: '1.25rem', fontWeight: '400' },
        ], // 14px, Regular, 20px line height
        'lumina-caption': [
          '0.75rem',
          { lineHeight: '1rem', fontWeight: '500' },
        ], // 12px, Medium, 16px line height
      },
      // Font Weights
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      // Lumina Spacing Scale - 8px base unit
      spacing: {
        // Additional spacing values following 8px base unit
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
        '26': '6.5rem', // 104px
        '30': '7.5rem', // 120px
        '34': '8.5rem', // 136px
        '38': '9.5rem', // 152px
        '42': '10.5rem', // 168px
        '46': '11.5rem', // 184px
        '50': '12.5rem', // 200px
        '54': '13.5rem', // 216px
        '58': '14.5rem', // 232px
        '62': '15.5rem', // 248px
        '66': '16.5rem', // 264px
        '70': '17.5rem', // 280px - Dashboard sidebar width
        '74': '18.5rem', // 296px
        '78': '19.5rem', // 312px
        '82': '20.5rem', // 328px
        '86': '21.5rem', // 344px
        '88': '22rem', // 352px
        '92': '23rem', // 368px
        '128': '32rem', // 512px
        '144': '36rem', // 576px
      },
      // Custom border radius
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Animation extensions
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(0)',
          },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(255, 210, 90, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(255, 210, 90, 0)',
          },
        },
        'lumina-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'lumina-spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'lumina-pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'lumina-typing': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s infinite',
        'lumina-spin': 'lumina-spin 1s linear infinite',
        'lumina-spin-slow': 'lumina-spin-slow 2s linear infinite',
        'lumina-pulse-subtle': 'lumina-pulse-subtle 2s ease-in-out infinite',
        'lumina-typing': 'lumina-typing 1.4s ease-in-out infinite',
      },
      // Custom shadows
      boxShadow: {
        lumina: '0 4px 14px 0 rgba(255, 210, 90, 0.15)',
        'lumina-lg': '0 10px 25px 0 rgba(255, 210, 90, 0.2)',
      },
      // Animation delays for staggered effects
      animationDelay: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
    },
  },
  plugins: [
    // Add Tailwind plugins as needed
    tailwindcssAnimate,
  ],
};

export default config;
