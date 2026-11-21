'use client';

import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { ReactNode, useSyncExternalStore } from 'react';
import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/theme/initial-theme';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * The theme a page opens in is lib/theme/initial-theme.ts: dark by default
 * (P3), the person's own pick remembered per device under `lumina-theme`,
 * /book following the client's phone, and the home page light. The inline
 * script in app/layout.tsx applies it before the first paint; this keeps it.
 */
const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** The device's own light or dark setting, live. */
function useSystemTheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    () => (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'),
    () => 'light'
  );
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();
  const systemTheme = useSystemTheme();
  // The home page has no dark design yet; /book is the salon's page on its
  // client's phone, so it follows the phone, not this device's pick.
  const forcedTheme =
    pathname === '/'
      ? 'light'
      : pathname === '/book' || pathname?.startsWith('/book/')
        ? systemTheme
        : undefined;
  return (
    <ThemeProvider
      defaultTheme={DEFAULT_THEME}
      storageKey={THEME_STORAGE_KEY}
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
