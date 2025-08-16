import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment Configuration
  environment: process.env.NODE_ENV || 'development',

  // Release Tracking
  release:
    process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA,

  // Error Filtering
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send errors from localhost
      if (event.request?.url?.includes('localhost')) {
        return null;
      }

      // Filter out common non-critical errors
      const error = hint.originalException;
      if (error && error.message) {
        const message = error.message.toLowerCase();
        if (
          message.includes('network error') ||
          message.includes('loading chunk') ||
          message.includes('script error')
        ) {
          return null;
        }
      }
    }

    return event;
  },

  // User Context
  initialScope: {
    tags: {
      component: 'client',
    },
  },

  // Integration Configuration
  integrations: [
    new Sentry.Replay({
      maskAllText: process.env.NODE_ENV === 'production',
      blockAllMedia: process.env.NODE_ENV === 'production',
    }),
  ],
});
