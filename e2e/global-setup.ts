// Global setup for E2E tests

async function globalSetup() {
  // eslint-disable-next-line no-console
  console.log('🚀 Setting up E2E test environment...');

  // Set test environment variables
  // process.env.NODE_ENV = 'test'; // NODE_ENV is read-only
  process.env.NEXTAUTH_SECRET = 'e2e-test-secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';

  try {
    // In a real setup, you might:
    // 1. Start test database
    // 2. Run migrations
    // 3. Seed test data
    // 4. Set up authentication state

    // eslint-disable-next-line no-console
    console.log('✅ E2E test environment setup completed');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}

export default globalSetup;
