'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Light only, deliberately.
 *
 * The theme tokens do flip for dark mode — `.dark` redefines --color-surface
 * to #171717 and --color-foreground to #fafafa — but the components do not.
 * Headings are hardcoded Deep Teal (#0B2B33) and panels are hardcoded
 * bg-white, so under `defaultTheme="system"` a visitor whose OS is in dark
 * mode got a #171717 card with a #0B2B33 heading on it (about 1.2:1) and
 * white-on-white panels. The public booking page was unreadable for exactly
 * the visitors whose settings we do not control.
 *
 * There is also no theme toggle in the UI, so "system" was never a choice
 * anyone made — it was inherited from the OS and could not be escaped.
 *
 * Restore "system" in Phase 5, once colours come from lib/design/tokens.ts
 * instead of raw hex literals in .tsx, and a contrast gate covers the rendered
 * page in both schemes rather than only the token pairs.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="lumina-theme">
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
