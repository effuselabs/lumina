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

  // Transform configuration - use our Jest-specific Babel config
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './jest.babel.config.js' },
    ],
  },

  // Setup files
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-dom.ts'],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
    '^@/factories$': '<rootDir>/factories',
    '^@/factories/(.*)$': '<rootDir>/factories/$1',
    '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
    // CSS and static asset mocking
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-transform-stub',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],

  // Test categories for selective running
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup-dom.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
          'babel-jest',
          { configFile: './jest.babel.config.js' },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
        '^@/factories$': '<rootDir>/factories',
        '^@/factories/(.*)$': '<rootDir>/factories/$1',
        '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          'jest-transform-stub',
      },
      // `@faker-js/faker` ships ESM only, and node_modules is not transformed
      // by default — importing it from a test fails with "Cannot use import
      // statement outside a module". The seed factories depend on it, and the
      // seed is the thing this project most needs tests around.
      transformIgnorePatterns: ['/node_modules/(?!@faker-js/faker)'],
      testMatch: ['<rootDir>/**/__tests__/**/*.test.{js,jsx,ts,tsx}'],
      testPathIgnorePatterns: [
        '<rootDir>/__tests__/integration/',
        '<rootDir>/__tests__/performance/',
        '<rootDir>/__tests__/accessibility/',
      ],
    },
    {
      displayName: 'integration',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup-dom.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
          'babel-jest',
          { configFile: './jest.babel.config.js' },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
        '^@/factories$': '<rootDir>/factories',
        '^@/factories/(.*)$': '<rootDir>/factories/$1',
        '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          'jest-transform-stub',
      },
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'],
      testTimeout: 15000,
    },
    {
      displayName: 'performance',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup-dom.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
          'babel-jest',
          { configFile: './jest.babel.config.js' },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
        '^@/factories$': '<rootDir>/factories',
        '^@/factories/(.*)$': '<rootDir>/factories/$1',
        '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          'jest-transform-stub',
      },
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.{js,jsx,ts,tsx}'],
      testTimeout: 60000,
    },
    {
      displayName: 'accessibility',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup-dom.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
          'babel-jest',
          { configFile: './jest.babel.config.js' },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
        '^@/factories$': '<rootDir>/factories',
        '^@/factories/(.*)$': '<rootDir>/factories/$1',
        '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          'jest-transform-stub',
      },
      testMatch: [
        '<rootDir>/__tests__/accessibility/**/*.test.{js,jsx,ts,tsx}',
      ],
      testTimeout: 10000,
    },
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

  // Transform configuration - let Next.js handle transforms
  // Remove custom transform to use Next.js built-in SWC

  // Transform ignore patterns - allow transformation of ES modules
  transformIgnorePatterns: ['node_modules/(?!(@faker-js/faker)/)'],

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
    '!app/api/**/*', // Exclude API routes from coverage
    '!app/**/route.{js,ts}', // Exclude Next.js route handlers
    '!app/**/page.{js,jsx,ts,tsx}', // Exclude page components that are hard to test in isolation
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

  // Environment variables for testing (removed duplicate setupFiles)
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();

  // Force our module name mapping to override Next.js defaults
  return {
    ...nextJestConfig,
    moduleNameMapper: {
      // Our custom mappings first
      '^@/(.*)$': '<rootDir>/$1',
      '^@/components/(.*)$': '<rootDir>/components/$1',
      '^@/lib/(.*)$': '<rootDir>/lib/$1',
      '^@/app/(.*)$': '<rootDir>/app/$1',
      '^@/types/(.*)$': '<rootDir>/types/$1',
      '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
      '^@/factories$': '<rootDir>/factories',
      '^@/factories/(.*)$': '<rootDir>/factories/$1',
      '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
      // Then Next.js defaults
      ...nextJestConfig.moduleNameMapper,
    },
  };
};
