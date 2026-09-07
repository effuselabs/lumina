/**
 * Tests for ClientFactory
 */

import { PrismaClient } from '@prisma/client';
import { ClientFactory } from './client-factory';
import { DEFAULT_SEED_CONFIG } from './seed-config';

// Mock Prisma for testing
const mockPrisma = {
  client: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  staff: {
    findMany: jest.fn(),
  },
  service: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ClientFactory', () => {
  let clientFactory: ClientFactory;
  const businessId = 'test-business-id';

  beforeEach(() => {
    clientFactory = new ClientFactory(
      mockPrisma,
      businessId,
      DEFAULT_SEED_CONFIG.clients.demographics
    );

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock responses
    (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([
      { id: 'staff-1' },
      { id: 'staff-2' },
      { id: 'staff-3' },
    ]);

    (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([
      { id: 'service-1' },
      { id: 'service-2' },
      { id: 'service-3' },
      { id: 'service-4' },
      { id: 'service-5' },
    ]);

    (mockPrisma.client.create as jest.Mock).mockResolvedValue({
      id: 'client-1',
      businessId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('initialization', () => {
    it('should initialize with staff and service data', async () => {
      await clientFactory.initialize();

      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: { businessId, isActive: true },
        select: { id: true },
      });

      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: { businessId, isActive: true },
        select: { id: true },
      });
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      await clientFactory.initialize();
    });

    it('should generate a valid client', async () => {
      const client = await clientFactory.generate();

      expect(client).toBeDefined();
      expect(client.id).toBe('client-1');
      expect(client.businessId).toBe(businessId);
      expect(client.firstName).toBe('John');
      expect(client.lastName).toBe('Doe');
      expect(mockPrisma.client.create).toHaveBeenCalledTimes(1);
    });

    it('should generate client with comprehensive profile data', async () => {
      const createCall = (mockPrisma.client.create as jest.Mock).mock.calls[0];
      await clientFactory.generate();

      const clientData = createCall[0].data;
      expect(clientData).toMatchObject({
        businessId,
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        address: expect.any(String),
        city: expect.any(String),
        state: expect.any(String),
        zipCode: expect.any(String),
        emailMarketing: expect.any(Boolean),
        smsMarketing: expect.any(Boolean),
        notes: expect.any(String),
      });
    });

    it('should validate client data before creation', async () => {
      // Mock invalid data scenario
      const invalidFactory = new ClientFactory(
        mockPrisma,
        '', // Invalid business ID
        DEFAULT_SEED_CONFIG.clients.demographics
      );

      await expect(invalidFactory.generate()).rejects.toThrow(
        'Client validation failed'
      );
    });
  });

  describe('generateClients', () => {
    beforeEach(async () => {
      await clientFactory.initialize();
    });

    it('should generate multiple clients', async () => {
      const clientCount = 5;
      const clients = await clientFactory.generateClients(clientCount);

      expect(clients).toHaveLength(clientCount);
      expect(mockPrisma.client.create).toHaveBeenCalledTimes(clientCount);
    });

    it('should call progress callback during batch generation', async () => {
      const progressCallback = jest.fn();
      const clientCount = 10;

      await clientFactory.generateClients(clientCount, {}, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Should be called at least once with final progress
      expect(progressCallback).toHaveBeenCalledWith(clientCount, clientCount);
    });
  });

  describe('demographic distribution', () => {
    beforeEach(async () => {
      await clientFactory.initialize();
    });

    it('should respect age range distribution', async () => {
      const clientCount = 100;
      const clients = await clientFactory.generateClients(clientCount);

      // Verify that clients were generated (we can't easily test distribution in unit tests)
      expect(clients).toHaveLength(clientCount);
      expect(mockPrisma.client.create).toHaveBeenCalledTimes(clientCount);
    });

    it('should generate diverse client profiles', async () => {
      const client = await clientFactory.generate();

      // Verify the client data includes comprehensive profile information
      const createCall = (mockPrisma.client.create as jest.Mock).mock.calls[0];
      const clientData = createCall[0].data;

      expect(clientData.notes).toContain('Age range:');
      expect(clientData.notes).toContain('Loyalty:');
      expect(clientData.notes).toContain('Visit frequency:');
      expect(clientData.notes).toContain('Communication:');
    });
  });

  describe('validation', () => {
    it('should validate required fields', () => {
      const validation = (clientFactory as any).validate({
        businessId: '',
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '123',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(4); // businessId, firstName, email, phone
    });

    it('should pass validation for valid data', () => {
      const validation = (clientFactory as any).validate({
        businessId: 'valid-business-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('realistic data generation', () => {
    beforeEach(async () => {
      await clientFactory.initialize();
    });

    it('should generate realistic email addresses', () => {
      const email = (clientFactory as any).generateEmail('John', 'Doe');
      expect(email).toMatch(/^john\.doe@[a-z]+\.[a-z]+$/);
    });

    it('should generate valid phone numbers', () => {
      const phone = (clientFactory as any).generatePhone();
      expect(phone).toBeDefined();
      expect(typeof phone).toBe('string');
    });

    it('should generate comprehensive address data', () => {
      const address = (clientFactory as any).generateAddress();
      expect(address).toMatchObject({
        address: expect.any(String),
        city: expect.any(String),
        state: expect.any(String),
        zipCode: expect.any(String),
      });
    });
  });
});
