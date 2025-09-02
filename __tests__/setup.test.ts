import {
  createMockBusiness,
  createMockUser,
  resetFactoryCounters,
} from '@/factories';

describe('Testing Setup', () => {
  beforeEach(() => {
    resetFactoryCounters();
  });

  it('should create mock users correctly', () => {
    const user = createMockUser();

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user.role).toBe('owner');
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should create mock business correctly', () => {
    const business = createMockBusiness();

    expect(business).toHaveProperty('id');
    expect(business).toHaveProperty('name');
    expect(business).toHaveProperty('email');
    expect(business.financialModel).toBe('commission');
    expect(business.createdAt).toBeInstanceOf(Date);
  });

  it('should allow overrides in factories', () => {
    const customUser = createMockUser({
      name: 'Custom User',
      role: 'staff',
    });

    expect(customUser.name).toBe('Custom User');
    expect(customUser.role).toBe('staff');
  });

  it('should have working test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.NEXTAUTH_SECRET).toBeDefined();
  });
});
