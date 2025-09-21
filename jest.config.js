// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/playwright-tests/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Transform ignore patterns - allow transformation of ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js/faker)/)',
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'types/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/test-utils/**',
    '!**/factories/**',
    '!app/layout.tsx', // Layout files often have minimal logic
    '!app/loading.tsx',
    '!app/error.tsx',
    '!app/not-found.tsx',
    '!**/*.config.{js,ts}',
    '!**/middleware.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Stricter thresholds for critical components
    './lib/**/*.{js,jsx,ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './components/ui/**/*.{js,jsx,ts,tsx}': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Mock configuration
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: false,

  // Test timeout
  testTimeout: 10000,

  // Global setup and teardown
  globalSetup: '<rootDir>/test-utils/global-setup.js',
  globalTeardown: '<rootDir>/test-utils/global-teardown.js',

  // Environment variables for testing
  setupFiles: ['<rootDir>/test-utils/env-setup.js'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);