// Debug test for factories import

// Try different import approaches
describe('Factories Import Debug', () => {
  it('should import from relative path', async () => {
    const factories = await import('../factories');
    expect(factories.createMockUser).toBeDefined();
    expect(factories.createMockBusiness).toBeDefined();
  });

  it('should create mock data', async () => {
    const factories = await import('../factories');
    const user = factories.createMockUser();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
  });
});
