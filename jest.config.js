// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/*
 * One project, and every test in it runs.
 *
 * This used to declare four projects — unit, integration, performance,
 * accessibility — and CI ran a hand-picked list of twelve files inside one of
 * them, because the other 147 could not pass. A suite that is 73% red is not a
 * suite; it is a directory. The legacy tests are gone, so the config no longer
 * needs to route around them: `npm test` runs everything and everything is
 * expected to be green.
 */
const customJestConfig = {
  testEnvironment: 'jsdom',

  transform: {
    '^.+\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './jest.babel.config.js' },
    ],
  },

  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-dom.ts'],

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
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-transform-stub',
  },

  testMatch: ['<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}'],

  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],

  // `@faker-js/faker` ships ESM only, and node_modules is not transformed by
  // default — importing it from a test fails with "Cannot use import statement
  // outside a module". The seed factories depend on it, and the seed is the
  // thing this project most needs tests around.
  transformIgnorePatterns: ['/node_modules/(?!@faker-js/faker)'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  /*
   * Off by default. Coverage instrumentation roughly doubles the run, and the
   * number is only meaningful when someone is looking at it — `npm run
   * test:coverage` turns it on.
   */
  collectCoverage: false,
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
    '!**/*.config.{js,ts}',
    '!**/middleware.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',

  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,

  globalSetup: '<rootDir>/test-utils/global-setup.js',
  globalTeardown: '<rootDir>/test-utils/global-teardown.js',
};

module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();

  // Force our module name mapping to override Next.js defaults.
  return {
    ...nextJestConfig,
    /*
     * `next/jest` replaces this with its own list, which does not spare
     * `@faker-js/faker` — so it has to be reapplied after the spread or the
     * seed-factory tests fail on "Cannot use import statement outside a
     * module".
     */
    transformIgnorePatterns: customJestConfig.transformIgnorePatterns,
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
      ...nextJestConfig.moduleNameMapper,
    },
  };
};
