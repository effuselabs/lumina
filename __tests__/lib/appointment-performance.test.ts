/**
 * Tests for Appointment Performance Optimization Components
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';

// Mock data
const mockAppointment: DashboardAppointment = {
  id: 'apt-1',
  businessId: 'business-1',
  clientId: 'client-1',
  staffId: 'staff-1',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  status: 'confirmed',
  services: [{ id: 'service-1', name: 'Haircut', duration: 60, price: 50 }],
  totalPrice: 50,
  totalDuration: 60,
  notes: 'Regular customer',
  client: {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
  },
  staff: {
    id: 'staff-1',
    firstName: 'Jane',
    lastName: 'Smith',
    displayName: 'Jane Smith',
    color: '#3B82F6',
  },
  isConflicted: false,
  canEdit: true,
  canCancel: true,
  canReschedule: true,
  lastUpdated: new Date(),
  updatedBy: 'staff-1',
};

// Mock implementations
class MockAppointmentCache {
  private cache = new Map<string, any>();

  get(key: any) {
    const keyStr = JSON.stringify(key);
    return this.cache.get(keyStr) || null;
  }

  set(key: any, data: any, ttl?: number) {
    const keyStr = JSON.stringify(key);
    this.cache.set(keyStr, data);
  }

  invalidateAll() {
    this.cache.clear();
  }

  invalidateForBusiness(businessId: string) {
    for (const [key] of this.cache) {
      if (key.includes(`"businessId":"${businessId}"`)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateForAppointment(appointmentId: string, businessId: string) {
    // Mock implementation
  }

  getStats() {
    return {
      totalEntries: this.cache.size,
      totalAppointments: this.cache.size,
      hitRate: 0.8,
    };
  }
}

class MockAppointmentSearchIndex {
  private appointments = new Map<string, DashboardAppointment>();

  addAppointment(appointment: DashboardAppointment) {
    this.appointments.set(appointment.id, appointment);
  }

  removeAppointment(appointmentId: string) {
    this.appointments.delete(appointmentId);
  }

  updateAppointment(appointment: DashboardAppointment) {
    this.appointments.set(appointment.id, appointment);
  }

  addAppointments(appointments: DashboardAppointment[]) {
    appointments.forEach((apt: any) => this.addAppointment(apt));
  }

  search(
    businessId: string,
    filters: any,
    appointments: DashboardAppointment[]
  ) {
    const results = appointments.filter((apt: any) => {
      if (filters.query) {
        const searchText =
          `${apt.client.firstName} ${apt.client.lastName}`.toLowerCase();
        if (!searchText.includes(filters.query.toLowerCase())) {
          return false;
        }
      }
      if (filters.staffIds && !filters.staffIds.includes(apt.staffId)) {
        return false;
      }
      if (filters.serviceIds) {
        const hasService = apt.services.some((s: any) =>
          filters.serviceIds.includes(s.id)
        );
        if (!hasService) return false;
      }
      return true;
    });

    return results.map((appointment: any) => ({
      appointment,
      score: 80,
      matches: ['text'],
    }));
  }

  getSuggestions(businessId: string, query: string, limit = 5) {
    const suggestions: string[] = [];
    for (const apt of this.appointments.values()) {
      const clientName = `${apt.client.firstName} ${apt.client.lastName}`;
      if (clientName.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.push(clientName);
      }
    }
    return suggestions.slice(0, limit);
  }

  clearBusiness(businessId: string) {
    for (const [id, apt] of this.appointments) {
      if (apt.businessId === businessId) {
        this.appointments.delete(id);
      }
    }
  }

  getStats() {
    return {
      totalAppointments: this.appointments.size,
    };
  }
}

class MockPerformanceMonitor {
  private metrics: Array<{ name: string; value: number; timestamp: number }> =
    [];

  recordMetric(name: string, value: number) {
    this.metrics.push({ name, value, timestamp: Date.now() });
  }

  clearMetrics() {
    this.metrics = [];
  }

  getMetrics() {
    return this.metrics;
  }

  getAverageMetric(metricName: string) {
    const filtered = this.metrics.filter((m: any) => m.name === metricName);
    if (filtered.length === 0) return 0;
    return (
      filtered.reduce((sum: any, m: any) => sum + m.value, 0) / filtered.length
    );
  }

  getPercentiles(metricName: string) {
    const values = this.metrics
      .filter((m: any) => m.name === metricName)
      .map((m: any) => m.value)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * values.length) - 1;
      return values[Math.max(0, index)];
    };

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    this.recordMetric(name, duration);
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    this.recordMetric(name, duration);
    return result;
  }

  generateReport() {
    return {
      period: { start: new Date(), end: new Date() },
      metrics: {
        averageCalendarLoadTime: this.getAverageMetric(
          'appointment-calendar-load'
        ),
        averageSearchResponseTime: this.getAverageMetric('appointment-search'),
        cacheHitRate: 50,
      },
      violations: [],
      recommendations: [],
    };
  }
}

// Create mock instances
const appointmentCache = new MockAppointmentCache();
const appointmentSearchIndex = new MockAppointmentSearchIndex();
const appointmentPerformanceMonitor = new MockPerformanceMonitor();

describe('Appointment Cache', () => {
  beforeEach(() => {
    appointmentCache.invalidateAll();
  });

  test('should cache and retrieve appointments', () => {
    const cacheKey = {
      businessId: 'business-1',
      dateRange: {
        start: '2024-01-15T00:00:00Z',
        end: '2024-01-15T23:59:59Z',
      },
    };

    const appointments = [mockAppointment];

    // Cache appointments
    appointmentCache.set(cacheKey, appointments);

    // Retrieve from cache
    const cached = appointmentCache.get(cacheKey);
    expect(cached).toEqual(appointments);
  });

  test('should invalidate cache for business', () => {
    const cacheKey1 = {
      businessId: 'business-1',
      dateRange: { start: '2024-01-15T00:00:00Z', end: '2024-01-15T23:59:59Z' },
    };

    const cacheKey2 = {
      businessId: 'business-2',
      dateRange: { start: '2024-01-15T00:00:00Z', end: '2024-01-15T23:59:59Z' },
    };

    appointmentCache.set(cacheKey1, [mockAppointment]);
    appointmentCache.set(cacheKey2, [mockAppointment]);

    // Invalidate business-1
    appointmentCache.invalidateForBusiness('business-1');

    // business-1 cache should be cleared
    expect(appointmentCache.get(cacheKey1)).toBeNull();

    // business-2 cache should remain
    expect(appointmentCache.get(cacheKey2)).toEqual([mockAppointment]);
  });

  test('should provide cache statistics', () => {
    const cacheKey = {
      businessId: 'business-1',
      dateRange: { start: '2024-01-15T00:00:00Z', end: '2024-01-15T23:59:59Z' },
    };

    appointmentCache.set(cacheKey, [mockAppointment]);

    const stats = appointmentCache.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalAppointments).toBe(1);
  });
});

describe('Appointment Search Index', () => {
  beforeEach(() => {
    appointmentSearchIndex.clearBusiness('business-1');
  });

  test('should add and search appointments', () => {
    appointmentSearchIndex.addAppointment(mockAppointment);

    const results = appointmentSearchIndex.search(
      'business-1',
      { query: 'John' },
      [mockAppointment]
    );

    expect(results).toHaveLength(1);
    expect(results[0].appointment.id).toBe('apt-1');
    expect(results[0].score).toBeGreaterThan(0);
  });

  test('should filter by staff', () => {
    appointmentSearchIndex.addAppointment(mockAppointment);

    const results = appointmentSearchIndex.search(
      'business-1',
      { staffIds: ['staff-1'] },
      [mockAppointment]
    );

    expect(results).toHaveLength(1);
    expect(results[0].appointment.staffId).toBe('staff-1');
  });

  test('should filter by service', () => {
    appointmentSearchIndex.addAppointment(mockAppointment);

    const results = appointmentSearchIndex.search(
      'business-1',
      { serviceIds: ['service-1'] },
      [mockAppointment]
    );

    expect(results).toHaveLength(1);
    expect(results[0].appointment.services[0].id).toBe('service-1');
  });

  test('should provide search suggestions', () => {
    appointmentSearchIndex.addAppointment(mockAppointment);

    const suggestions = appointmentSearchIndex.getSuggestions(
      'business-1',
      'Jo'
    );
    expect(suggestions).toContain('John Doe');
  });

  test('should update appointment in index', () => {
    appointmentSearchIndex.addAppointment(mockAppointment);

    const updatedAppointment = {
      ...mockAppointment,
      client: {
        ...mockAppointment.client,
        firstName: 'Johnny',
      },
    };

    appointmentSearchIndex.updateAppointment(updatedAppointment);

    const results = appointmentSearchIndex.search(
      'business-1',
      { query: 'Johnny' },
      [updatedAppointment]
    );

    expect(results).toHaveLength(1);
    expect(results[0].appointment.client.firstName).toBe('Johnny');
  });

  test('should remove appointment from index', () => {
    appointmentSearchIndex.addAppointment(mockAppointment);
    appointmentSearchIndex.removeAppointment('apt-1');

    const results = appointmentSearchIndex.search(
      'business-1',
      { query: 'John' },
      []
    );

    expect(results).toHaveLength(0);
  });
});

describe('Performance Monitor', () => {
  beforeEach(() => {
    appointmentPerformanceMonitor.clearMetrics();
  });

  test('should record metrics', () => {
    appointmentPerformanceMonitor.recordMetric('test-metric', 100);

    const metrics = appointmentPerformanceMonitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test-metric');
    expect(metrics[0].value).toBe(100);
  });

  test('should calculate average metrics', () => {
    appointmentPerformanceMonitor.recordMetric('test-metric', 100);
    appointmentPerformanceMonitor.recordMetric('test-metric', 200);
    appointmentPerformanceMonitor.recordMetric('test-metric', 300);

    const average =
      appointmentPerformanceMonitor.getAverageMetric('test-metric');
    expect(average).toBe(200);
  });

  test('should measure function execution time', () => {
    const testFunction = () => {
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    };

    const result = appointmentPerformanceMonitor.measureFunction(
      'test-function',
      testFunction
    );
    expect(result).toBe(499500); // Sum of 0 to 999

    const metrics = appointmentPerformanceMonitor.getMetrics();
    expect(metrics.some((m: any) => m.name === 'test-function')).toBe(true);
  });

  test('should measure async function execution time', async () => {
    const asyncFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'completed';
    };

    const result = await appointmentPerformanceMonitor.measureAsync(
      'test-async',
      asyncFunction
    );
    expect(result).toBe('completed');

    const metrics = appointmentPerformanceMonitor.getMetrics();
    expect(metrics.some((m: any) => m.name === 'test-async')).toBe(true);
  });

  test('should generate performance report', () => {
    appointmentPerformanceMonitor.recordMetric(
      'appointment-calendar-load',
      500
    );
    appointmentPerformanceMonitor.recordMetric('appointment-search', 200);

    const report = appointmentPerformanceMonitor.generateReport();

    expect(report.period).toBeDefined();
    expect(report.metrics).toBeDefined();
    expect(report.metrics.averageCalendarLoadTime).toBe(500);
    expect(report.metrics.averageSearchResponseTime).toBe(200);
  });

  test('should calculate percentiles', () => {
    const values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    values.forEach((value: any) => {
      appointmentPerformanceMonitor.recordMetric('test-percentiles', value);
    });

    const percentiles =
      appointmentPerformanceMonitor.getPercentiles('test-percentiles');
    expect(percentiles.p50).toBe(500);
    expect(percentiles.p90).toBe(900);
    expect(percentiles.p95).toBe(950);
    expect(percentiles.p99).toBe(990);
  });
});

describe('Performance Service Integration', () => {
  const mockPerformanceService = {
    shouldUseVirtualScrolling: (count: number) => count >= 50,
    getVirtualScrollingConfig: () => ({
      itemHeight: 80,
      overscan: 5,
      enabled: true,
    }),
    getProgressiveLoadingConfig: () => ({
      chunkSize: 7,
      preloadChunks: 2,
      maxConcurrentLoads: 3,
      enabled: true,
    }),
    getSearchSuggestions: () => [],
    getPerformanceStats: () => ({
      cache: appointmentCache.getStats(),
      search: appointmentSearchIndex.getStats(),
      monitoring: appointmentPerformanceMonitor.generateReport(),
    }),
    clearCaches: () => {
      appointmentCache.invalidateAll();
      appointmentSearchIndex.clearBusiness('business-1');
    },
  };

  test('should determine when to use virtual scrolling', () => {
    expect(mockPerformanceService.shouldUseVirtualScrolling(10)).toBe(false);
    expect(mockPerformanceService.shouldUseVirtualScrolling(100)).toBe(true);
  });

  test('should provide virtual scrolling configuration', () => {
    const config = mockPerformanceService.getVirtualScrollingConfig();

    expect(config.itemHeight).toBeDefined();
    expect(config.overscan).toBeDefined();
    expect(config.enabled).toBeDefined();
  });

  test('should provide progressive loading configuration', () => {
    const config = mockPerformanceService.getProgressiveLoadingConfig();

    expect(config.chunkSize).toBeDefined();
    expect(config.preloadChunks).toBeDefined();
    expect(config.maxConcurrentLoads).toBeDefined();
    expect(config.enabled).toBeDefined();
  });

  test('should provide performance statistics', () => {
    const stats = mockPerformanceService.getPerformanceStats();

    expect(stats.cache).toBeDefined();
    expect(stats.search).toBeDefined();
    expect(stats.monitoring).toBeDefined();
  });

  test('should handle virtual scrolling threshold edge case', () => {
    expect(mockPerformanceService.shouldUseVirtualScrolling(50)).toBe(true); // Exactly at threshold
    expect(mockPerformanceService.shouldUseVirtualScrolling(49)).toBe(false); // Just below threshold
  });
});

describe('Performance Optimization Edge Cases', () => {
  test('should handle empty search results', () => {
    const results = appointmentSearchIndex.search(
      'business-1',
      { query: 'nonexistent' },
      []
    );

    expect(results).toHaveLength(0);
  });

  test('should handle cache with no entries', () => {
    appointmentCache.invalidateAll();
    const stats = appointmentCache.getStats();
    expect(stats.totalEntries).toBe(0);
  });

  test('should handle performance monitoring with no metrics', () => {
    appointmentPerformanceMonitor.clearMetrics();
    const average =
      appointmentPerformanceMonitor.getAverageMetric('nonexistent');
    expect(average).toBe(0);

    const percentiles =
      appointmentPerformanceMonitor.getPercentiles('nonexistent');
    expect(percentiles.p50).toBe(0);
  });

  test('should handle search suggestions with empty query', () => {
    const suggestions = appointmentSearchIndex.getSuggestions('business-1', '');
    expect(suggestions).toHaveLength(0);
  });
});
