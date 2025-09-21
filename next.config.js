// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during build (temporary)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // External packages for server components
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },

  // Performance optimizations
  swcMinify: true,
  compress: true,

  // Optimize CSS and bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Enable standalone output for Docker
  output: 'standalone',

  // Image optimization configuration
  images: {
    domains: ['localhost', 'lumina-staging.up.railway.app', 'uselumina.app'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirects for SEO and user experience
  async redirects() {
    return [
      // Remove the dashboard redirect since the page exists at /dashboard
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Production optimizations
    if (!dev) {
      // Enable tree shaking for CSS
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };

      // Optimize CSS extraction
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          styles: {
            name: 'styles',
            type: 'css/mini-extract',
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',

  // Upload source maps during build
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements
  hideSourceMaps: true,

  // Disable source map upload in development
  disableLogger: process.env.NODE_ENV === 'development',
};

// Export the configuration with Sentry
module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
