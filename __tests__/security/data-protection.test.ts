import { prisma } from '@/lib/prisma';
import { DataProtectionService } from '@/lib/security/data-protection';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { BusinessRole, UserRole } from '@prisma/client';

// Mock environment variable
process.env.DATA_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('DataProtectionService', () => {
  let dataProtection: DataProtectionService;
  let testBusinessId: string;
  let testUserId: string;
  let testClientId: string;

  beforeEach(async () => {
    dataProtection = new DataProtectionService();

    // Create test business
    const business = await prisma.business.create({
      data: {
        name: 'Data Protection Test Business',
        slug: 'data-protection-test',
        email: 'dataprotection@test.com',
        phone: '555-0300',
        address: '123 Privacy St',
        city: 'Secure City',
        state: 'SC',
        zipCode: '12345',
        country: 'US',
        timezone: 'America/New_York',
      },
    });
    testBusinessId = business.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'dataprotection-user@test.com',
        name: 'Data Protection User',
        role: UserRole.STAFF,
      },
    });
    testUserId = user.id;

    // Create business user relationship
    await prisma.businessUser.create({
      data: {
        businessId: testBusinessId,
        userId: testUserId,
        role: BusinessRole.MANAGER,
      },
    });

    // Create test client with comprehensive data
    const client = await prisma.client.create({
      data: {
        businessId: testBusinessId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        dateOfBirth: new Date('1990-01-15'),
        address: '456 Client Ave',
        city: 'Client City',
        state: 'CC',
        zipCode: '54321',
        country: 'US',
        preferences: { newsletter: true, sms: false },
        notes: 'Prefers morning appointments',
      },
    });
    testClientId = client.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.campaignRecipient.deleteMany({
      where: { client: { businessId: testBusinessId } },
    });
    await prisma.clientReview.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.loyaltyTransaction.deleteMany({
      where: { membership: { client: { businessId: testBusinessId } } },
    });
    await prisma.loyaltyMembership.deleteMany({
      where: { client: { businessId: testBusinessId } },
    });
    await prisma.communicationHistory.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.appointmentService.deleteMany({
      where: { appointment: { businessId: testBusinessId } },
    });
    await prisma.transaction.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.appointment.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.appointmentPreferences.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.client.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.businessUser.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.business.deleteMany({ where: { id: testBusinessId } });
    await prisma.auditLog.deleteMany({});
    await prisma.securityLog.deleteMany({});
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'Sensitive client information';

      const encrypted = dataProtection.encrypt(plaintext);
      expect(encrypted.encryptedValue).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = dataProtection.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'Same input data';

      const encrypted1 = dataProtection.encrypt(plaintext);
      const encrypted2 = dataProtection.encrypt(plaintext);

      // Should have different IVs and encrypted values
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedValue).not.toBe(encrypted2.encryptedValue);

      // But both should decrypt to same plaintext
      expect(dataProtection.decrypt(encrypted1)).toBe(plaintext);
      expect(dataProtection.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should fail decryption with tampered data', () => {
      const plaintext = 'Original data';
      const encrypted = dataProtection.encrypt(plaintext);

      // Tamper with encrypted data
      const tamperedData = {
        ...encrypted,
        encryptedValue: encrypted.encryptedValue.slice(0, -2) + 'XX',
      };

      expect(() => dataProtection.decrypt(tamperedData)).toThrow(
        'Decryption failed'
      );
    });
  });

  describe('Hashing', () => {
    it('should hash data consistently with same salt', () => {
      const data = 'password123';
      const salt = 'testsalt';

      const hash1 = dataProtection.hash(data, salt);
      const hash2 = dataProtection.hash(data, salt);

      expect(hash1).toBe(hash2);
    });

    it('should verify hashed data correctly', () => {
      const data = 'password123';
      const hashed = dataProtection.hash(data);

      expect(dataProtection.verifyHash(data, hashed)).toBe(true);
      expect(dataProtection.verifyHash('wrongpassword', hashed)).toBe(false);
    });

    it('should produce different hashes with different salts', () => {
      const data = 'password123';

      const hash1 = dataProtection.hash(data);
      const hash2 = dataProtection.hash(data);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Data Masking', () => {
    it('should mask email addresses correctly', () => {
      expect(dataProtection.maskEmail('john.doe@example.com')).toBe(
        'j***e@e***.com'
      );
      expect(dataProtection.maskEmail('a@b.co')).toBe('a@b***.co');
      expect(dataProtection.maskEmail('invalid-email')).toBe('[INVALID_EMAIL]');
      expect(dataProtection.maskEmail('')).toBe('[INVALID_EMAIL]');
    });

    it('should mask phone numbers correctly', () => {
      expect(dataProtection.maskPhone('+1-555-123-4567')).toBe('1*********67');
      expect(dataProtection.maskPhone('5551234567')).toBe('5*******67');
      expect(dataProtection.maskPhone('123')).toBe('***');
      expect(dataProtection.maskPhone('')).toBe('[NO_PHONE]');
    });

    it('should mask names correctly', () => {
      expect(dataProtection.maskName('John Doe')).toBe('J*** D**');
      expect(dataProtection.maskName('Mary Jane Smith')).toBe(
        'M*** J*** S****'
      );
      expect(dataProtection.maskName('Al')).toBe('Al');
      expect(dataProtection.maskName('')).toBe('[NO_NAME]');
    });

    it('should mask sensitive data in objects', () => {
      const sensitiveData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        nonSensitive: 'public data',
      };

      const masked = dataProtection.maskSensitiveData(sensitiveData);

      expect(masked.firstName).toBe('J***');
      expect(masked.lastName).toBe('D**');
      expect(masked.email).toBe('j***@e***.com');
      expect(masked.phone).toBe('5***34');
      expect(masked.address).toBe('[MASKED]');
      expect(masked.nonSensitive).toBe('[MASKED_STRING]');
    });

    it('should handle nested objects and arrays', () => {
      const nestedData = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        contacts: [
          { name: 'Jane Smith', phone: '555-9876' },
          { name: 'Bob Johnson', email: 'bob@example.com' },
        ],
      };

      const masked = dataProtection.maskSensitiveData(nestedData);

      expect(masked.user.name).toBe('J*** D**');
      expect(masked.user.email).toBe('j***@e***.com');
      expect(masked.contacts[0].name).toBe('J*** S****');
      expect(masked.contacts[0].phone).toBe('5***76');
      expect(masked.contacts[1].email).toBe('b***@e***.com');
    });
  });

  describe('GDPR Data Export', () => {
    beforeEach(async () => {
      // Create comprehensive test data for the client

      // Create staff for appointments
      const staff = await prisma.staff.create({
        data: {
          businessId: testBusinessId,
          userId: testUserId,
          displayName: 'Test Staff',
          employmentType: 'COMMISSION',
          commissionRate: 50,
        },
      });

      // Create service
      const service = await prisma.service.create({
        data: {
          businessId: testBusinessId,
          name: 'Test Service',
          duration: 60,
          price: 100,
          isActive: true,
        },
      });

      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: staff.id,
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          totalDuration: 60,
          totalPrice: 100,
          status: 'COMPLETED',
        },
      });

      // Create appointment service
      await prisma.appointmentService.create({
        data: {
          appointmentId: appointment.id,
          serviceId: service.id,
          serviceName: 'Test Service',
          price: 100,
          duration: 60,
          serviceOrder: 1,
        },
      });

      // Create transaction
      await prisma.transaction.create({
        data: {
          businessId: testBusinessId,
          appointmentId: appointment.id,
          amount: 100,
          type: 'PAYMENT',
          status: 'COMPLETED',
          paymentMethod: 'CARD',
        },
      });

      // Create communication history
      await prisma.communicationHistory.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          type: 'APPOINTMENT_REMINDER',
          direction: 'OUTBOUND',
          channel: 'EMAIL',
          subject: 'Appointment Reminder',
          content: 'Your appointment is tomorrow',
          status: 'SENT',
        },
      });

      // Create appointment preferences
      await prisma.appointmentPreferences.create({
        data: {
          clientId: testClientId,
          businessId: testBusinessId,
          preferredStaffId: staff.id,
          preferredServices: [service.id],
          specialRequests: 'Prefers morning slots',
        },
      });
    });

    it('should export complete client data', async () => {
      const exportData = await dataProtection.exportClientData(
        testClientId,
        testBusinessId
      );

      expect(exportData.personalData).toBeDefined();
      expect(exportData.personalData.firstName).toBe('John');
      expect(exportData.personalData.lastName).toBe('Doe');
      expect(exportData.personalData.email).toBe('john.doe@example.com');

      expect(exportData.appointments).toHaveLength(1);
      expect(exportData.appointments[0].status).toBe('COMPLETED');
      expect(exportData.appointments[0].services).toHaveLength(1);

      expect(exportData.transactions).toHaveLength(1);
      expect(exportData.transactions[0].type).toBe('PAYMENT');

      expect(exportData.communications).toHaveLength(1);
      expect(exportData.communications[0].type).toBe('APPOINTMENT_REMINDER');

      expect(exportData.metadata.businessId).toBe(testBusinessId);
      expect(exportData.metadata.clientId).toBe(testClientId);

      // Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'GDPR_DATA_EXPORT',
          resourceId: testClientId,
        },
      });
      expect(auditLogs).toHaveLength(1);
    });

    it('should reject export for non-existent client', async () => {
      await expect(
        dataProtection.exportClientData('non-existent-id', testBusinessId)
      ).rejects.toThrow('Client not found or access denied');
    });

    it('should reject export for client from different business', async () => {
      // Create another business
      const otherBusiness = await prisma.business.create({
        data: {
          name: 'Other Business',
          slug: 'other-business',
          email: 'other@test.com',
          phone: '555-0400',
          address: '789 Other St',
          city: 'Other City',
          state: 'OC',
          zipCode: '67890',
          country: 'US',
          timezone: 'America/Los_Angeles',
        },
      });

      await expect(
        dataProtection.exportClientData(testClientId, otherBusiness.id)
      ).rejects.toThrow('Client not found or access denied');

      // Cleanup
      await prisma.business.delete({ where: { id: otherBusiness.id } });
    });
  });

  describe('GDPR Data Deletion', () => {
    let appointmentId: string;
    let transactionId: string;

    beforeEach(async () => {
      // Create test data that should be handled during deletion

      const staff = await prisma.staff.create({
        data: {
          businessId: testBusinessId,
          userId: testUserId,
          displayName: 'Test Staff',
          employmentType: 'COMMISSION',
          commissionRate: 50,
        },
      });

      const appointment = await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: staff.id,
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          totalDuration: 60,
          totalPrice: 100,
          status: 'COMPLETED',
          notes: 'Client specific notes',
        },
      });
      appointmentId = appointment.id;

      const transaction = await prisma.transaction.create({
        data: {
          businessId: testBusinessId,
          appointmentId: appointment.id,
          amount: 100,
          type: 'PAYMENT',
          status: 'COMPLETED',
          paymentMethod: 'CARD',
        },
      });
      transactionId = transaction.id;

      await prisma.communicationHistory.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          type: 'APPOINTMENT_REMINDER',
          direction: 'OUTBOUND',
          channel: 'EMAIL',
          subject: 'Appointment Reminder',
          content: 'Your appointment is tomorrow',
          status: 'SENT',
        },
      });

      await prisma.appointmentPreferences.create({
        data: {
          clientId: testClientId,
          businessId: testBusinessId,
          specialRequests: 'Client preferences',
        },
      });
    });

    it('should delete client data while preserving business records', async () => {
      const result = await dataProtection.deleteClientData(
        testClientId,
        testBusinessId,
        testUserId,
        'GDPR deletion request'
      );

      expect(result.deletedRecords.client).toBe(1);
      expect(result.deletedRecords.communicationHistory).toBe(1);
      expect(result.deletedRecords.appointmentPreferences).toBe(1);
      expect(result.retainedRecords.appointments).toBe(1);
      expect(result.retainedRecords.transactions).toBe(1);

      // Verify client is deleted
      const deletedClient = await prisma.client.findUnique({
        where: { id: testClientId },
      });
      expect(deletedClient).toBeNull();

      // Verify appointment is anonymized but retained
      const anonymizedAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(anonymizedAppointment).toBeDefined();
      expect(anonymizedAppointment?.clientId).toBeNull();
      expect(anonymizedAppointment?.clientName).toBe('[DELETED CLIENT]');
      expect(anonymizedAppointment?.clientEmail).toBeNull();
      expect(anonymizedAppointment?.notes).toBe('[CLIENT DATA DELETED]');

      // Verify transaction is retained
      const retainedTransaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
      expect(retainedTransaction).toBeDefined();

      // Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'GDPR_DATA_DELETION',
          resourceId: testClientId,
        },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].metadata).toHaveProperty('gdprCompliance', true);
    });

    it('should reject deletion for non-existent client', async () => {
      await expect(
        dataProtection.deleteClientData(
          'non-existent-id',
          testBusinessId,
          testUserId,
          'Test deletion'
        )
      ).rejects.toThrow('Client not found or access denied');
    });
  });

  describe('Data Anonymization', () => {
    beforeEach(async () => {
      // Create old data that should be anonymized
      const oldDate = new Date('2020-01-01T00:00:00Z');

      const staff = await prisma.staff.create({
        data: {
          businessId: testBusinessId,
          userId: testUserId,
          displayName: 'Test Staff',
          employmentType: 'COMMISSION',
          commissionRate: 50,
        },
      });

      // Create old appointment
      await prisma.appointment.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          staffId: staff.id,
          startTime: oldDate,
          endTime: new Date(oldDate.getTime() + 60 * 60 * 1000),
          totalDuration: 60,
          totalPrice: 100,
          status: 'COMPLETED',
          clientName: 'Old Client Name',
          clientEmail: 'old@example.com',
          clientPhone: '555-0000',
          notes: 'Old client notes',
          createdAt: oldDate,
        },
      });

      // Create old communication
      await prisma.communicationHistory.create({
        data: {
          businessId: testBusinessId,
          clientId: testClientId,
          type: 'APPOINTMENT_REMINDER',
          direction: 'OUTBOUND',
          channel: 'EMAIL',
          subject: 'Old Communication',
          content: 'Old content',
          status: 'SENT',
          createdAt: oldDate,
        },
      });

      // Create old audit log
      await prisma.auditLog.create({
        data: {
          userId: testUserId,
          businessId: testBusinessId,
          action: 'OLD_ACTION',
          resourceType: 'test',
          createdAt: oldDate,
        },
      });

      // Create old security log
      await prisma.securityLog.create({
        data: {
          type: 'UNAUTHORIZED_BUSINESS_ACCESS',
          businessId: testBusinessId,
          resourceType: 'test',
          attemptedAction: 'old_action',
          severity: 'LOW',
          createdAt: oldDate,
        },
      });
    });

    it('should anonymize expired data according to retention policy', async () => {
      const retentionPolicy = {
        appointmentData: 365, // 1 year
        transactionData: 2555, // 7 years
        communicationData: 365, // 1 year
        auditLogs: 365, // 1 year
        securityLogs: 365, // 1 year
        deletedClientData: 30, // 30 days
      };

      const result = await dataProtection.anonymizeExpiredData(
        testBusinessId,
        retentionPolicy
      );

      expect(result.anonymizedRecords.appointments).toBe(1);
      expect(result.deletedRecords.communicationHistory).toBe(1);
      expect(result.deletedRecords.auditLogs).toBe(1);
      expect(result.deletedRecords.securityLogs).toBe(1);

      // Verify appointment was anonymized
      const anonymizedAppointments = await prisma.appointment.findMany({
        where: {
          businessId: testBusinessId,
          clientName: '[ANONYMIZED]',
        },
      });
      expect(anonymizedAppointments).toHaveLength(1);

      // Verify communications were deleted
      const remainingComms = await prisma.communicationHistory.findMany({
        where: { businessId: testBusinessId },
      });
      expect(remainingComms).toHaveLength(0);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput =
        '<script>alert("xss")</script>Hello<script>alert("xss2")</script>';
      const sanitized = dataProtection.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello');
    });

    it('should remove javascript protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = dataProtection.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const maliciousInput = 'onclick=alert("xss") onload=malicious()';
      const sanitized = dataProtection.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('malicious()');
    });

    it('should validate and sanitize emails', () => {
      expect(dataProtection.validateAndSanitizeEmail('test@example.com')).toBe(
        'test@example.com'
      );
      expect(dataProtection.validateAndSanitizeEmail('Test@Example.COM')).toBe(
        'test@example.com'
      );
      expect(
        dataProtection.validateAndSanitizeEmail('invalid-email')
      ).toBeNull();
      expect(
        dataProtection.validateAndSanitizeEmail('<script>@example.com')
      ).toBeNull();
    });

    it('should validate and sanitize phone numbers', () => {
      expect(dataProtection.validateAndSanitizePhone('+1-555-123-4567')).toBe(
        '+15551234567'
      );
      expect(dataProtection.validateAndSanitizePhone('(555) 123-4567')).toBe(
        '5551234567'
      );
      expect(dataProtection.validateAndSanitizePhone('123')).toBeNull();
      expect(
        dataProtection.validateAndSanitizePhone('abc-def-ghij')
      ).toBeNull();
    });

    it('should validate and sanitize names', () => {
      expect(dataProtection.validateAndSanitizeName('John Doe')).toBe(
        'John Doe'
      );
      expect(
        dataProtection.validateAndSanitizeName("Mary O'Connor-Smith")
      ).toBe("Mary O'Connor-Smith");
      expect(dataProtection.validateAndSanitizeName('John123 <script>')).toBe(
        'John'
      );
      expect(
        dataProtection.validateAndSanitizeName('   Multiple   Spaces   ')
      ).toBe('Multiple Spaces');
      expect(dataProtection.validateAndSanitizeName('')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', () => {
      // Create service with invalid key
      const invalidKeyService = new (class extends DataProtectionService {
        constructor() {
          // Override to use invalid key
          process.env.DATA_ENCRYPTION_KEY = 'invalid';
          super();
        }
      })();

      expect(() => new DataProtectionService()).toThrow(
        'Encryption key must be 32 bytes'
      );
    });

    it('should handle missing encryption key', () => {
      const originalKey = process.env.DATA_ENCRYPTION_KEY;
      delete process.env.DATA_ENCRYPTION_KEY;

      expect(() => new DataProtectionService()).toThrow(
        'DATA_ENCRYPTION_KEY environment variable is required'
      );

      // Restore key
      process.env.DATA_ENCRYPTION_KEY = originalKey;
    });

    it('should handle database errors during GDPR operations', async () => {
      // Mock prisma to throw error
      const originalFindFirst = prisma.client.findFirst;
      prisma.client.findFirst = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(
        dataProtection.exportClientData(testClientId, testBusinessId)
      ).rejects.toThrow('Failed to export client data: Database error');

      // Restore original method
      prisma.client.findFirst = originalFindFirst;
    });
  });
});
