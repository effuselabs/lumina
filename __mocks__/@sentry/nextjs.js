// Mock Sentry for testing
module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withSentry: jest.fn((handler) => handler),
  withSentryConfig: jest.fn((config) => config),
};