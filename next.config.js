/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router (default in Next.js 13+)
  experimental: {
    // Enable server actions for form handling
    serverActions: true,
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Image optimization configuration
  images: {
    domains: [
      'localhost',
      'lumina-staging.up.railway.app',
      'uselumina.app',
    ],
  },
  
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
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
        ],
      },
    ];
  },
  
  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;