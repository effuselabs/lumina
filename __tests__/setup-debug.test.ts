// Debug test to check setup file loading

// Manually set up mocks to test if they work
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

describe('Setup Debug', () => {
  it('should have manually set up mocks', () => {
    expect(global.ResizeObserver).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
  });

  it('should have environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
