// Environment setup for tests
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DATABASE_URL =
  'postgresql://lumina_test:test_password@localhost:5432/lumina_test';

// Stripe test keys
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_webhook_secret_for_testing';

// Google OAuth test credentials
process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id-for-testing';
process.env.GOOGLE_CLIENT_SECRET = 'fake-google-client-secret-for-testing';

// Sentry (disabled in tests)
process.env.SENTRY_DSN = '';

// App configuration
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
