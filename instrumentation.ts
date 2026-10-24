import * as Sentry from '@sentry/nextjs';

/**
 * Error reporting for the server and edge runtimes (#100).
 *
 * Sentry 10 initialises only from here; the old `sentry.server.config.js` was
 * never loaded, so no error ever reached Sentry. Without `SENTRY_DSN` nothing
 * is initialised, which is how local development, CI and a self-hoster who
 * does not use Sentry run.
 *
 * Errors only: no performance tracing, and no personal data beyond what an
 * error itself carries.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    sendDefaultPii: false,
  });
}

/** Errors thrown while rendering, in route handlers and in server actions. */
export const onRequestError = Sentry.captureRequestError;
