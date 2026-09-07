// Environment setup
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.DATABASE_URL =
  'postgresql://lumina_test:test_password@localhost:5432/lumina_test';

// eslint-disable-next-line no-console
console.log('Jest setup file loaded!');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return React.createElement('img', props);
  },
}));

// Mock Next.js link component
jest.mock('next/link', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, ...props }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return React.createElement('a', props, children);
  },
}));

// Mock NextAuth v5
jest.mock('next-auth', () => ({
  default: jest.fn(),
}));

// Mock Prisma client with comprehensive model coverage
const createMockPrismaModel = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    // Core models
    user: createMockPrismaModel(),
    account: createMockPrismaModel(),
    session: createMockPrismaModel(),
    verificationToken: createMockPrismaModel(),

    // Business models
    business: createMockPrismaModel(),
    businessUser: createMockPrismaModel(),

    // Staff models
    staff: createMockPrismaModel(),
    staffService: createMockPrismaModel(),
    staffInvitation: createMockPrismaModel(),
    staffAvailability: createMockPrismaModel(),
    staffAvailabilityOverride: createMockPrismaModel(),
    staffNotification: createMockPrismaModel(),

    // Service models
    service: createMockPrismaModel(),

    // Client models
    client: createMockPrismaModel(),

    // Appointment models
    appointment: createMockPrismaModel(),
    appointmentService: createMockPrismaModel(),
    appointmentStatusHistory: createMockPrismaModel(),
    appointmentPreferences: createMockPrismaModel(),

    // Transaction models
    transaction: createMockPrismaModel(),
    paymentCalculation: createMockPrismaModel(),

    // Product models
    product: createMockPrismaModel(),
    productSale: createMockPrismaModel(),

    // Gift card models
    giftCard: createMockPrismaModel(),
    giftCardRedemption: createMockPrismaModel(),

    // Promotion models
    promotion: createMockPrismaModel(),
    promotionUsage: createMockPrismaModel(),

    // Marketing models
    marketingCampaign: createMockPrismaModel(),
    campaignRecipient: createMockPrismaModel(),

    // Loyalty models
    loyaltyProgram: createMockPrismaModel(),
    loyaltyMembership: createMockPrismaModel(),
    loyaltyTransaction: createMockPrismaModel(),

    // Review models
    clientReview: createMockPrismaModel(),
    communicationHistory: createMockPrismaModel(),

    // Availability models
    businessHours: createMockPrismaModel(),
    businessHoliday: createMockPrismaModel(),
    timeOffRequest: createMockPrismaModel(),
    availabilityCache: createMockPrismaModel(),

    // Booking config models
    publicBookingConfig: createMockPrismaModel(),

    // Security models
    securityLog: createMockPrismaModel(),
    auditLog: createMockPrismaModel(),

    // Performance models
    performanceMetric: createMockPrismaModel(),
    systemAlert: createMockPrismaModel(),
    businessMetric: createMockPrismaModel(),

    // Booking analytics models
    bookingAnalyticsEvent: createMockPrismaModel(),
    bookingPerformanceEvent: createMockPrismaModel(),
    bookingError: createMockPrismaModel(),
    bookingAlertRule: createMockPrismaModel(),
    bookingAlert: createMockPrismaModel(),
    publicBookingAuditLog: createMockPrismaModel(),

    // Prisma client methods
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock performance API for component performance monitoring
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn(() => Date.now()),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
});

// Also add to window object for browser-like environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: global.performance,
  });
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Console error suppression for known issues
// eslint-disable-next-line no-console
const originalError = console.error;
// eslint-disable-next-line no-console
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: An invalid form control'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
