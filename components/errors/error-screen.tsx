'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ErrorScreenProps {
  /** From Next's error boundary. `digest` is set for server errors. */
  error: Error & { digest?: string };
  /** Re-renders the segment that failed. */
  reset: () => void;
  /** Where to go instead of retrying. */
  home: { href: string; label: string };
}

/**
 * What a page shows when it fails to load.
 *
 * The digest is the same identifier Next writes beside the error in the
 * server log, so a reported reference finds the log line. The message itself
 * is never shown: a server error's message is replaced in production, and a
 * client error's can carry details a visitor should not see.
 */
export function ErrorScreen({ error, reset, home }: ErrorScreenProps) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div role="alert" className="max-w-md text-center">
        <AlertTriangle
          className="mx-auto mb-4 h-10 w-10 text-ink-muted"
          aria-hidden="true"
        />
        <h1 className="mb-2 text-xl font-semibold text-ink-strong">
          Something went wrong
        </h1>
        <p className="mb-6 text-ink-soft">
          This page could not be loaded. Try again, and if it keeps happening,
          quote the reference below when you ask for help.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href={home.href}>{home.label}</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="mt-6 text-sm text-ink-muted">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
