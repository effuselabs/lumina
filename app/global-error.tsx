'use client';

import { ErrorScreen } from '@/components/errors/error-screen';
import './globals.css';

/**
 * The root layout itself failed, so nothing it provides — fonts, theme,
 * providers — is available, and this must render its own document.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen
          error={error}
          reset={reset}
          home={{ href: '/', label: 'Go to the home page' }}
        />
      </body>
    </html>
  );
}
