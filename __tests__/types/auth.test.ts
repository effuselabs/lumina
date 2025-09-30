// Simple test for auth types to expand test infrastructure
import type { BusinessRole, UserRole } from '../../types/auth';

describe('Auth Types', () => {
  describe('UserRole', () => {
    it('should have expected user roles', () => {
      // Test that the types exist and can be used
      const adminRole: UserRole = 'ADMIN';
      const businessOwnerRole: UserRole = 'BUSINESS_OWNER';
      const staffRole: UserRole = 'STAFF';
      const clientRole: UserRole = 'CLIENT';

      expect(adminRole).toBe('ADMIN');
      expect(businessOwnerRole).toBe('BUSINESS_OWNER');
      expect(staffRole).toBe('STAFF');
      expect(clientRole).toBe('CLIENT');
    });
  });

  describe('BusinessRole', () => {
    it('should have expected business roles', () => {
      // Test that the types exist and can be used
      const ownerRole: BusinessRole = 'OWNER';
      const managerRole: BusinessRole = 'MANAGER';
      const staffRole: BusinessRole = 'STAFF';

      expect(ownerRole).toBe('OWNER');
      expect(managerRole).toBe('MANAGER');
      expect(staffRole).toBe('STAFF');
    });
  });
});
