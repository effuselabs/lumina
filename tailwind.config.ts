import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Lumina Product Brand Colors (per LUMINA_PRODUCT_STYLEGUIDE.md)
      colors: {
        // Primary Lumina Colors - Radiant Gradient
        lumina: {
          gold: '#FFD25A', // Primary Accent & Gradient Start
          coral: '#FF7A5A', // Gradient End
          'gold-light': '#FFE066',
          'coral-light': '#FF8666',
          'gold-dark': '#E6BD51',
          'coral-dark': '#E66E51',
        },
        // Secondary Brand Color
        'deep-teal': {
          DEFAULT: '#0B2B33', // Secondary Accent per Lumina brand
          50: '#F0F9FA',
          100: '#D9F0F2',
          200: '#B3E1E5',
          300: '#8DD2D8',
          400: '#67C3CB',
          500: '#41B4BE',
          600: '#2E8A95',
          700: '#1B5F6C',
          800: '#0B2B33',
          900: '#081F26',
        },
        // Lumina Neutral/UI Colors (per style guide)
        neutral: {
          'off-black': '#1D2D35', // Text color per Lumina brand
          'medium-grey': '#808285', // Secondary text
          'light-grey': '#F1F3F5', // Backgrounds
          border: '#E4E6E7', // Borders & Dividers
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
        },
        // Semantic Color Mapping
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Lumina Functional UI Colors (per style guide)
        success: {
          DEFAULT: '#22C58B', // Success Green per Lumina brand
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#22C58B',
          600: '#16A085',
          700: '#0F7B6C',
        },
        warning: {
          DEFAULT: '#FFB800', // Warning Amber per Lumina brand
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#FFB800',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          DEFAULT: '#E5484D', // Error Red per Lumina brand
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#E5484D',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      // Lumina Radiant Gradient (per LUMINA_PRODUCT_STYLEGUIDE.md)
      backgroundImage: {
        'lumina-gradient': 'linear-gradient(135deg, #FFD25A 0%, #FF7A5A 100%)',
        'lumina-gradient-hover':
          'linear-gradient(135deg, #FFE066 0%, #FF8666 100%)',
        'lumina-radiant': 'linear-gradient(135deg, #FFD25A 0%, #FF7A5A 100%)',
        'lumina-radiant-hover':
          'linear-gradient(135deg, #FFE066 0%, #FF8666 100%)',
      },
      // Typography - Inter Font System
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'Monaco', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Typography Scale
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
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
      // Custom spacing for consistent design
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
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
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
      // Custom shadows
      boxShadow: {
        lumina: '0 4px 14px 0 rgba(255, 210, 90, 0.15)',
        'lumina-lg': '0 10px 25px 0 rgba(255, 210, 90, 0.2)',
      },
    },
  },
  plugins: [
    // Add Tailwind plugins as needed
    tailwindcssAnimate,
  ],
};

export default config;
