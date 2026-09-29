// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint runs as part of `next build`. It previously did not:
  // ignoreDuringBuilds was set to true, which meant lint failures could never
  // block anything. See the RATCHET note in .eslintrc.json for why several
  // rules are currently "warn" rather than "error".

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // External packages for server components.
  // isomorphic-dompurify pulls in jsdom, which reads asset files (e.g.
  // browser/default-stylesheet.css) relative to its own package at import
  // time. Bundling it rewrites those paths and the read fails during
  // `next build`, so it must stay external.
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'isomorphic-dompurify',
    'jsdom',
  ],

  // Performance optimizations
  compress: true,

  // SWC compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Enable SWC minification for better performance
    styledComponents: false, // We're not using styled-components
  },

  // NOTE: `output: 'standalone'` was removed deliberately.
  //
  // It exists to produce a self-contained bundle for a Docker image, and this
  // project no longer has a Dockerfile — Railway builds with Nixpacks and
  // starts the app with `npm start`. Standalone output is incompatible with
  // `next start`; Next.js says so at boot:
  //
  //   ⚠ "next start" does not work with "output: standalone" configuration.
  //     Use "node .next/standalone/server.js" instead.
  //
  // Keeping both meant every deploy ran a server Next.js had explicitly
  // warned was misconfigured. Restore this only alongside a start command
  // that runs the standalone server.

  // The image optimizer is off, by choice rather than by necessity. It was
  // turned off on 14.x for GHSA-2xp9-vwfh-vxw4, an unauthenticated RCE when it
  // optimizes an AVIF, and 15.5.24 fixes that. It stays off because the
  // trade is poor: it serves two small images (a testimonial avatar and the
  // business logo on the public booking page) through a public endpoint
  // (middleware excludes /_next/image) that fetches remote URLs on request
  // and writes the results to disk: four of the 23 advisories against 14.2.35.
  // And with it on, a logo hosted anywhere but an allowed domain renders as
  // a broken image, because the optimizer refuses the URL. Turn it on when a
  // page is heavy enough with images to measure the difference.
  images: {
    unoptimized: true,
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
