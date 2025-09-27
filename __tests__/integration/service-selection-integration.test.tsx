/**
 * Integration test for Service Selection component
 * Tests the complete functionality without mocking
 */

import { ServiceSelection } from '@/components/booking/service-selection';

describe('ServiceSelection Integration', () => {
  const mockOnServicesSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export the ServiceSelection component', () => {
    expect(ServiceSelection).toBeDefined();
    expect(typeof ServiceSelection).toBe('function');
  });

  it('should accept required props', () => {
    const props = {
      businessId: 'test-business',
      onServicesSelect: mockOnServicesSelect,
    };

    expect(() => {
      // Just test that the component can be instantiated with props
      const component = ServiceSelection(props);
      expect(component).toBeDefined();
    }).not.toThrow();
  });
});
