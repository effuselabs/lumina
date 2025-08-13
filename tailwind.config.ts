import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Lumina Brand Colors
      colors: {
        // Primary Lumina Colors
        lumina: {
          gold: '#FFD25A',
          coral: '#FF7A5A',
        },
        // Effuse Colors
        effuse: {
          teal: '#22C5C3',
          slate: '#2E3440',
        },
        // Deep Teal for Secondary Actions
        'deep-teal': '#0B2B33',
        // Neutral Palette
        neutral: {
          'off-black': '#1D1D21',
          'medium-grey': '#808285',
          'light-grey': '#F1F3F5',
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
      },
      // Lumina Gradient
      backgroundImage: {
        'lumina-gradient': 'linear-gradient(135deg, #FFD25A 0%, #FF7A5A 100%)',
        'lumina-gradient-hover': 'linear-gradient(135deg, #FFE066 0%, #FF8666 100%)',
      },
      // Typography - Inter Font System
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      // Custom spacing for consistent design
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
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
        'lumina': '0 4px 14px 0 rgba(255, 210, 90, 0.15)',
        'lumina-lg': '0 10px 25px 0 rgba(255, 210, 90, 0.2)',
      },
    },
  },
  plugins: [
    // Add Tailwind plugins as needed
    require('tailwindcss-animate'),
  ],
};

export default config;