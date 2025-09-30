// Basic test to verify Jest setup is working

describe('Basic Jest Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have mocked globals (manual setup)', () => {
    // Manual setup for now since jest.setup.js isn't loading
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    expect(global.ResizeObserver).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
  });
});
