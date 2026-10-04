'use client';

import { ErrorScreen } from '@/components/errors/error-screen';
import { useParams } from 'next/navigation';

/**
 * A dashboard page that fails to render.
 *
 * The pages used to catch every error and redirect to `/onboarding`, which
 * made an outage look like "you have no business". That was removed so
 * failures surface; this is where they now land (#57).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { businessSlug } = useParams<{ businessSlug: string }>();

  return (
    <ErrorScreen
      error={error}
      reset={reset}
      home={{ href: `/dashboard/${businessSlug}`, label: 'Back to dashboard' }}
    />
  );
}
