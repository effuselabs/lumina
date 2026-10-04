'use client';

import { ErrorScreen } from '@/components/errors/error-screen';

/**
 * Any page outside the dashboard that fails to render. Without this a server
 * error showed Next's default screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      home={{ href: '/', label: 'Go to the home page' }}
    />
  );
}
