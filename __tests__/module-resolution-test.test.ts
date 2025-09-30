// Test to check if Jest module name mapping is working

describe('Module Resolution Test', () => {
  it('should be able to import from @/ paths', async () => {
    // Try to import something simple with @/ path
    try {
      const { mockAppointment } = await import('@/test-utils/booking-mocks');
      expect(mockAppointment).toBeDefined();
      expect(mockAppointment.id).toBe('apt-123');
    } catch (error) {
      console.error('Module resolution failed:', error);
      throw error;
    }
  });

  it('should be able to import lib utilities', async () => {
    try {
      // Try importing a lib utility
      const searchUtils = await import('@/lib/search-utils');
      expect(searchUtils).toBeDefined();
    } catch (error) {
      console.error('Lib import failed:', error);
      throw error;
    }
  });
});
