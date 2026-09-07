/**
 * Test configuration for integration and quality assurance tests
 * Centralizes test setup, timeouts, and environment configuration
 */

import { jest } from '@jest/globals';

// Test environment configuration
export const testConfig = {
  // Timeout configurations
  timeouts: {
    unit: 5000, // 5 seconds for unit tests
    integration: 15000, // 15 seconds for integration tests
    e2e: 30000, // 30 seconds for e2e tests
    performance: 60000, // 60 seconds for performance tests
    accessibility: 10000, // 10 seconds for accessibility tests
  },

  // Performance benchmarks
  performance: {
    pageLoad: 2000, // Page load should be under 2 seconds
    apiResponse: 500, // API responses should be under 500ms
    bookingCreation: 1000, // Booking creation should be under 1 second
    availabilityCheck: 300, // Availability check should be under 300ms
  },

  // Accessibility requirements
  accessibility: {
    wcagLevel: 'AA', // WCAG 2.1 AA compliance
    contrastRatio: 4.5, // Minimum contrast ratio
    touchTargetSize: 44, // Minimum touch target size in pixels
  },

  // Mobile testing viewports
  viewports: {
    mobile: { width: 375, height: 667 }, // iPhone SE
    tablet: { width: 768, height: 1024 }, // iPad
    desktop: { width: 1920, height: 1080 }, // Desktop
  },

  // Test data
  testBusiness: {
    id: 'test-business-123',
    name: 'Test Salon',
    timezone: 'America/New_York',
  },
};

// Global test setup
export const setupTestEnvironment = () => {
  // Set default timeout
  jest.setTimeout(testConfig.timeouts.integration);

  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console };

  beforeAll(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    Object.assign(console, originalConsole);
  });

  // Setup fake timers for consistent testing
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
};

// Performance testing utilities
export const performanceUtils = {
  measureExecutionTime: async <T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  expectPerformance: (
    duration: number,
    maxDuration: number,
    operation: string
  ) => {
    if (duration > maxDuration) {
      console.warn(
        `Performance warning: ${operation} took ${duration.toFixed(2)}ms (expected < ${maxDuration}ms)`
      );
    }
    expect(duration).toBeLessThan(maxDuration);
  },

  createLoadTest: (concurrency: number, operation: () => Promise<any>) => {
    return Promise.all(Array.from({ length: concurrency }, () => operation()));
  },
};

// Accessibility testing utilities
export const accessibilityUtils = {
  checkColorContrast: (foreground: string, background: string): number => {
    // Simplified contrast calculation for testing
    // In real implementation, would use proper color contrast algorithms
    const fgLuminance = getLuminance(foreground);
    const bgLuminance = getLuminance(background);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  },

  checkTouchTargetSize: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width >= testConfig.accessibility.touchTargetSize &&
      rect.height >= testConfig.accessibility.touchTargetSize
    );
  },

  simulateScreenReader: () => {
    const announcements: string[] = [];

    // Mock ARIA live regions
    const mockLiveRegion = {
      announce: (message: string) => {
        announcements.push(message);
      },
    };

    return { announcements, mockLiveRegion };
  },
};

// Helper function for luminance calculation
function getLuminance(color: string): number {
  // Simplified luminance calculation
  // Convert hex to RGB and calculate relative luminance
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Mobile testing utilities
export const mobileUtils = {
  simulateTouchEvent: (element: HTMLElement, eventType: string) => {
    const touchEvent = new TouchEvent(eventType, {
      bubbles: true,
      cancelable: true,
      touches: [
        new Touch({
          identifier: 1,
          target: element,
          clientX: 100,
          clientY: 100,
        }),
      ],
    });

    element.dispatchEvent(touchEvent);
  },

  simulateSwipeGesture: (
    element: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down'
  ) => {
    const startCoords = { x: 100, y: 100 };
    const endCoords = { ...startCoords };

    switch (direction) {
      case 'left':
        endCoords.x -= 100;
        break;
      case 'right':
        endCoords.x += 100;
        break;
      case 'up':
        endCoords.y -= 100;
        break;
      case 'down':
        endCoords.y += 100;
        break;
    }

    // Simulate touch start
    mobileUtils.simulateTouchEvent(element, 'touchstart');

    // Simulate touch move
    const moveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [
        new Touch({
          identifier: 1,
          target: element,
          clientX: endCoords.x,
          clientY: endCoords.y,
        }),
      ],
    });
    element.dispatchEvent(moveEvent);

    // Simulate touch end
    mobileUtils.simulateTouchEvent(element, 'touchend');
  },

  setViewport: (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  },
};

// Network simulation utilities
export const networkUtils = {
  simulateSlowConnection: (delay: number = 2000) => {
    return jest
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, delay))
      );
  },

  simulateNetworkError: () => {
    return jest.fn().mockRejectedValue(new Error('Network error'));
  },

  simulateIntermittentConnection: (failureRate: number = 0.3) => {
    return jest.fn().mockImplementation(() => {
      if (Math.random() < failureRate) {
        return Promise.reject(new Error('Connection failed'));
      }
      return Promise.resolve({ success: true });
    });
  },
};

// Test data generators
export const dataGenerators = {
  generateRandomClient: () => ({
    firstName: `TestUser${Math.floor(Math.random() * 1000)}`,
    lastName: 'TestLastName',
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    isNewClient: Math.random() > 0.5,
  }),

  generateTimeSlots: (count: number, startDate: Date = new Date()) => {
    const slots = [];
    const baseTime = new Date(startDate);

    for (let i = 0; i < count; i++) {
      const startTime = new Date(baseTime);
      startTime.setHours(9 + i, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      slots.push({
        startTime,
        endTime,
        staffId: `staff-${(i % 2) + 1}`,
        staffName: i % 2 === 0 ? 'John Doe' : 'Jane Smith',
        isAvailable: Math.random() > 0.2, // 80% availability
      });
    }

    return slots;
  },

  generateConcurrentUsers: (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `user-${index}`,
      ...dataGenerators.generateRandomClient(),
    }));
  },
};

// Test reporting utilities
export const reportingUtils = {
  logPerformanceMetrics: (
    testName: string,
    metrics: Record<string, number>
  ) => {
    console.log(`\n=== Performance Metrics: ${testName} ===`);
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`${key}: ${value.toFixed(2)}ms`);
    });
    console.log('=====================================\n');
  },

  logAccessibilityResults: (testName: string, violations: any[]) => {
    if (violations.length === 0) {
      console.log(`✅ ${testName}: No accessibility violations found`);
    } else {
      console.log(
        `❌ ${testName}: ${violations.length} accessibility violations found`
      );
      violations.forEach(violation => {
        console.log(`  - ${violation.id}: ${violation.description}`);
      });
    }
  },

  generateTestSummary: (results: {
    passed: number;
    failed: number;
    total: number;
  }) => {
    const passRate = (results.passed / results.total) * 100;

    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);
    console.log('===================\n');

    return passRate >= 95; // Require 95% pass rate
  },
};
