'use client';

import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * The theme follows the OS until someone picks one with the toggle in the
 * dashboard header; the choice is kept in localStorage under `lumina-theme`.
 *
 * This was light-only, deliberately, while components hardcoded light
 * colours: under "system" a dark-OS visitor got dark cards with deep-teal
 * headings on them (about 1.2:1). docs/PLAN.md 3f moved every component onto
 * theme-aware colours first, and `__tests__/design/` holds them there.
 */
export function Providers({ children }: ProvidersProps) {
  // The marketing home page is designed light-only — photographic and
  // gradient sections that do not change with the theme — so it stays light
  // until it gets a dark design of its own.
  const forcedTheme = usePathname() === '/' ? 'light' : undefined;
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="lumina-theme"
      forcedTheme={forcedTheme}
    >
      <SessionProvider
        basePath="/api/auth"
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={false} // Disable to prevent 404 errors during development
      >
        {children}
        <Toaster />
      </SessionProvider>
    </ThemeProvider>
  );
}
