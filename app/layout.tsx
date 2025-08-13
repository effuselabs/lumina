import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}