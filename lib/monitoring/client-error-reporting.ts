/**
 * Error reporting in the browser (#100).
 *
 * The DSN is inlined at build from `SENTRY_DSN` (`next.config.js`), so the
 * browser reports to the same project as the server. Without it this does
 * nothing, and Sentry's SDK is never downloaded: it is imported only once a
 * DSN exists, so a visitor to a build without Sentry pays nothing for it.
 */
type SentryModule = typeof import('@sentry/nextjs');

let sentry: Promise<SentryModule> | undefined;

function loadSentry(): Promise<SentryModule> | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return undefined;

  sentry ??= import('@sentry/nextjs').then(Sentry => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      sendDefaultPii: false,
    });
    return Sentry;
  });
  return sentry;
}

/** Starts reporting uncaught errors and unhandled rejections. */
export function startClientErrorReporting(): void {
  void loadSentry();
}

/**
 * An error that an error boundary caught, and so that nothing else reports.
 *
 * An error with a digest happened on the server, which reported it with its
 * full stack; the browser only has the redacted copy, so it is not sent again.
 */
export function reportCaughtError(error: Error & { digest?: string }): void {
  if (error.digest) return;
  void loadSentry()?.then(Sentry => Sentry.captureException(error));
}
