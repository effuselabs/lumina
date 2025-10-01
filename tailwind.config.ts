import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
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
    // Preserve explicit accessibility colors
    'text-black',
    'text-white',
    'border-black',
    'border-white',
    'bg-black',
    'bg-white',
    'text-blue-700',
    'text-blue-800',
    'decoration-blue-700',
    'hover:bg-black',
    'hover:text-white',
    'hover:text-black',
    'hover:bg-white',
    'hover:text-blue-800',
    // Preserve important declarations
    '!text-black',
    '!text-white',
    '!border-black',
    '!border-white',
    '!text-blue-700',
    '!text-blue-800',
    '!decoration-blue-700',
    'hover:!bg-black',
    'hover:!text-white',
    'hover:!text-black',
    'hover:!bg-white',
    'hover:!text-blue-800',
    'dark:!text-white',
    'dark:!border-white',
    'dark:!text-[#FFD25A]',
    'dark:!decoration-[#FFD25A]',
    'dark:hover:!bg-white',
    'dark:hover:!text-black',
    // Maximum specificity classes
    '!border-[#000000]',
    '!text-[#000000]',
    '!border-solid',
    'hover:!bg-[#000000]',
    'hover:!text-[#ffffff]',
    'hover:!border-[#000000]',
    'dark:!border-[#ffffff]',
    'dark:!text-[#ffffff]',
    'dark:hover:!bg-[#ffffff]',
    'dark:hover:!text-[#000000]',
    'hover:!bg-[#00000019]',
    'dark:hover:!bg-[#ffffff19]',
    'dark:hover:!text-[#ffffff]',
    '!text-[#1d4ed8]',
    '!decoration-[#1d4ed8]',
    'hover:!text-[#1e40af]',
    'hover:!decoration-[#1e40af]',
    'dark:!text-[#FFD25A]',
    'dark:!decoration-[#FFD25A]',
    'dark:hover:!text-[#FFD25ACC]',
    'dark:hover:!decoration-[#FFD25ACC]',
    // Ultimate specificity: Multi-attribute selectors for bulletproof styling
    '[&[data-variant="outline"][data-testid="button"]]:!border-[#000000]',
    '[&[data-variant="outline"][data-testid="button"]]:!text-[#000000]',
    '[&[data-variant="outline"][data-testid="button"]]:hover:!bg-[#000000]',
    '[&[data-variant="outline"][data-testid="button"]]:hover:!text-[#ffffff]',
    '[&[data-variant="outline"][data-testid="button"]]:dark:!border-[#ffffff]',
    '[&[data-variant="outline"][data-testid="button"]]:dark:!text-[#ffffff]',
    '[&[data-variant="outline"][data-testid="button"]]:dark:hover:!bg-[#ffffff]',
    '[&[data-variant="outline"][data-testid="button"]]:dark:hover:!text-[#000000]',
    '[&[data-variant="ghost"][data-testid="button"]]:!text-[#000000]',
    '[&[data-variant="ghost"][data-testid="button"]]:hover:!bg-[#00000019]',
    '[&[data-variant="ghost"][data-testid="button"]]:hover:!text-[#000000]',
    '[&[data-variant="ghost"][data-testid="button"]]:dark:!text-[#ffffff]',
    '[&[data-variant="ghost"][data-testid="button"]]:dark:hover:!bg-[#ffffff19]',
    '[&[data-variant="ghost"][data-testid="button"]]:dark:hover:!text-[#ffffff]',
    '[&[data-variant="link"][data-testid="button"]]:!text-[#1d4ed8]',
    '[&[data-variant="link"][data-testid="button"]]:!decoration-[#1d4ed8]',
    '[&[data-variant="link"][data-testid="button"]]:hover:!text-[#1e40af]',
    '[&[data-variant="link"][data-testid="button"]]:hover:!decoration-[#1e40af]',
    '[&[data-variant="link"][data-testid="button"]]:dark:!text-[#FFD25A]',
    '[&[data-variant="link"][data-testid="button"]]:dark:!decoration-[#FFD25A]',
    '[&[data-variant="link"][data-testid="button"]]:dark:hover:!text-[#FFD25ACC]',
    '[&[data-variant="link"][data-testid="button"]]:dark:hover:!decoration-[#FFD25ACC]',
    // Fallback important classes for maximum compatibility
    '!border-black',
    '!text-black',
    'dark:!border-white',
    'dark:!text-white',
    'hover:!bg-black',
    'hover:!text-white',
    'dark:hover:!bg-white',
    'dark:hover:!text-black',
    'hover:!bg-black/10',
    'hover:!text-black',
    'dark:hover:!bg-white/10',
    'dark:hover:!text-white',
    '!text-blue-700',
    '!decoration-blue-700',
    'hover:!text-blue-800',
    'hover:!decoration-blue-800',
    // Preserve hex color fallbacks
    'border-[#000000]',
    'text-[#000000]',
    'bg-[#000000]',
    'text-[#ffffff]',
    'bg-[#ffffff]',
    'border-[#ffffff]',
    'text-[#1d4ed8]',
    'text-[#1e40af]',
    'decoration-[#1d4ed8]',
    'text-[#FFD25A]',
    'decoration-[#FFD25A]',
    'hover:bg-[#000000]',
    'hover:text-[#ffffff]',
    'hover:text-[#1e40af]',
    'hover:text-[#FFD25ACC]',
    'hover:bg-[#00000019]',
    'hover:bg-[#ffffff19]',
    'bg-[#0B2B33]',
    'hover:bg-[#0F3A44]',
    'dark:bg-[#1A4A56]',
    'dark:hover:bg-[#2A5A66]',
    // Preserve animation classes
    'animate-fade-in',
    'animate-slide-in',
    'animate-pulse-glow',
  ],
  theme: {
    extend: {
      // Lumina Brand Colors using CSS Custom Properties
      colors: {
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
          50: '#F0F9FA',
          100: '#D9F0F2',
          200: '#B3E1E5',
          300: '#8DD2D8',
          400: '#67C3CB',
          500: '#41B4BE',
          600: '#2E8A95',
          700: '#1B5F6C',
          800: 'var(--deep-teal)',
          900: '#081F26',
        },
        // Tertiary Colors using CSS Variables
        'clarity-blue': {
          DEFAULT: 'var(--clarity-blue)',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: 'var(--clarity-blue)',
          600: '#0284C7',
          700: '#0369A1',
        },
        'soft-peach': {
          DEFAULT: 'var(--lumina-peach)',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: 'var(--lumina-peach)',
          600: '#EA580C',
          700: '#C2410C',
        },
        // Complementary Colors using CSS Variables
        'sage-green': {
          DEFAULT: 'var(--sage-green)',
          50: '#F6F8F3',
          100: '#EDF1E7',
          200: '#DBE3CF',
          300: '#C9D5B7',
          400: '#B7C79F',
          500: 'var(--sage-green)', // #87A96B
          600: '#6C8755',
          700: '#516540',
          800: '#36432A',
          900: '#1B2115',
        },
        'warm-gray': {
          DEFAULT: 'var(--warm-gray)',
          50: '#F9F8F7',
          100: '#F3F1EF',
          200: '#E7E3DF',
          300: '#DBD5CF',
          400: '#CFC7BF',
          500: 'var(--warm-gray)', // #8B8680
          600: '#6F6B66',
          700: '#53504D',
          800: '#373533',
          900: '#1B1A1A',
        },
        'lavender-mist': {
          DEFAULT: 'var(--lavender-mist)',
          50: '#FAF8FB',
          100: '#F5F1F7',
          200: '#EBE3EF',
          300: '#E1D5E7',
          400: '#D7C7DF',
          500: 'var(--lavender-mist)', // #C8B5D1
          600: '#A091A7',
          700: '#786D7D',
          800: '#504853',
          900: '#282429',
        },
        cream: {
          DEFAULT: 'var(--cream)',
          50: '#FEFEFE',
          100: '#FDFDFC',
          200: 'var(--cream)', // #F7F5F0
          300: '#F1EDE6',
          400: '#EBE5DC',
          500: '#E5DDD2',
          600: '#B7B1A8',
          700: '#89857E',
          800: '#5B5854',
          900: '#2D2C2A',
        },
        // Enhanced Semantic Colors using CSS Variables
        success: {
          DEFAULT: 'var(--color-success)',
          50: 'var(--color-success-background)',
          100: 'var(--color-success-background)',
          500: 'var(--color-success)',
          600: 'var(--semantic-success)', // #16A085
          700: '#138B75',
          800: '#0F7B6C',
          foreground: 'var(--color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          50: 'var(--color-warning-background)',
          100: 'var(--color-warning-background)',
          500: 'var(--color-warning)',
          600: 'var(--semantic-warning)', // #E6A500
          700: '#CC9400',
          800: '#B38300',
          foreground: 'var(--color-warning-foreground)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          50: 'var(--color-error-background)',
          100: 'var(--color-error-background)',
          500: 'var(--color-error)',
          600: 'var(--semantic-error)', // #D63031
          700: '#C12B2C',
          800: '#AC2627',
          foreground: 'var(--color-error-foreground)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          50: 'var(--color-info-background)',
          100: 'var(--color-info-background)',
          500: 'var(--color-info)',
          600: 'var(--semantic-info)', // #5B9BD5
          700: '#4A8BC2',
          800: '#397BAF',
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
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'Courier New', 'monospace'],
        display: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
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
        'lumina-body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }], // 14px, Regular, 20px line height
        'lumina-caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }], // 12px, Medium, 16px line height
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
