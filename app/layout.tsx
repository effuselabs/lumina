import { Providers } from '@/components/providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent layout shifts
  variable: '--font-inter',
  preload: true,
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  // Enable font features for better rendering
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: 'Lumina - Intelligent Software for Small Business Growth',
    template: '%s | Lumina',
  },
  description:
    'AI-powered business management platform for salons and barbershops. Streamline booking, client management, and financials with intelligent insights.',
  keywords: [
    'salon management',
    'barbershop software',
    'booking system',
    'client management',
    'POS system',
    'business analytics',
    'AI insights',
  ],
  authors: [{ name: 'Effuse Labs' }],
  creator: 'Effuse Labs',
  publisher: 'Effuse Labs',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'Lumina - Intelligent Software for Small Business Growth',
    description:
      'AI-powered business management platform for salons and barbershops.',
    siteName: 'Lumina',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina - Intelligent Software for Small Business Growth',
    description:
      'AI-powered business management platform for salons and barbershops.',
    creator: '@effuselabs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="theme-color" content="#F7F5F0" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        <Providers>
          <div id="root" className="min-h-screen">
            <main id="main-content" className="component-container">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
