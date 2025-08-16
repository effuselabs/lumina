import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment Configuration
  environment: process.env.NODE_ENV || 'development',

  // Release Tracking
  release:
    process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA,

  // Server-specific Configuration
  debug: process.env.NODE_ENV === 'development',

  // Error Filtering
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (process.env.NODE_ENV === 'production') {
      // Filter out database connection errors during startup
      const error = hint.originalException;
      if (error && error.message) {
        const message = error.message.toLowerCase();
        if (
          message.includes('econnrefused') ||
          message.includes('connection refused') ||
          message.includes('timeout')
        ) {
          // Only log these as warnings, not errors
          // eslint-disable-next-line no-console
          console.warn('Database connection issue:', message);
          return null;
        }
      }
    }

    return event;
  },

  // User Context
  initialScope: {
    tags: {
      component: 'server',
    },
  },

  // Capture unhandled rejections
  captureUnhandledRejections: true,

  // Capture uncaught exceptions
  captureUncaughtException: true,
});
