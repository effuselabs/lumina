import { prisma } from '@/lib/prisma';
import { ClientService } from '@/lib/services/client-service';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lookupClient', () => {
    const businessId = 'business-123';

    it('returns client data when client exists by email', async () => {
      const mockClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        marketingOptIn: true,
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(mockClient);

      const result = await ClientService.lookupClient({
        businessId,
        email: 'john@example.com',
      });

      expect(result).toEqual({
        clientExists: true,
        clientData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          marketingOptIn: true,
        },
      });

      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: {
          businessId,
          isActive: true,
          OR: [{ email: 'john@example.com' }],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          marketingOptIn: true,
        },
      });
    });

    it('returns client data when client exists by phone', async () => {
      const mockClient = {
        id: 'client-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1987654321',
        marketingOptIn: false,
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(mockClient);

      const result = await ClientService.lookupClient({
        businessId,
        phone: '1987654321',
      });

      expect(result).toEqual({
        clientExists: true,
        clientData: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+1987654321',
          marketingOptIn: false,
        },
      });

      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: {
          businessId,
          isActive: true,
          OR: [{ phone: '+1987654321' }],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          marketingOptIn: true,
        },
      });
    });

    it('returns client data when client exists by email or phone', async () => {
      const mockClient = {
        id: 'client-123',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        phone: '+1555666777',
        marketingOptIn: true,
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(mockClient);

      const result = await ClientService.lookupClient({
        businessId,
        email: 'bob@example.com',
        phone: '1555666777',
      });

      expect(result.clientExists).toBe(true);
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: {
          businessId,
          isActive: true,
          OR: [{ email: 'bob@example.com' }, { phone: '+1555666777' }],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          marketingOptIn: true,
        },
      });
    });

    it('returns clientExists false when no client found', async () => {
      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);

      const result = await ClientService.lookupClient({
        businessId,
        email: 'notfound@example.com',
      });

      expect(result).toEqual({
        clientExists: false,
      });
    });

    it('returns clientExists false when no email or phone provided', async () => {
      const result = await ClientService.lookupClient({
        businessId,
      });

      expect(result).toEqual({
        clientExists: false,
      });

      expect(mockPrisma.client.findFirst).not.toHaveBeenCalled();
    });

    it('throws error when database operation fails', async () => {
      asMock(mockPrisma.client.findFirst).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        ClientService.lookupClient({
          businessId,
          email: 'test@example.com',
        })
      ).rejects.toThrow('Failed to lookup client information');
    });
  });

  describe('createClient', () => {
    const clientData = {
      businessId: 'business-123',
      firstName: 'New',
      lastName: 'Client',
      email: 'new@example.com',
      phone: '1234567890',
      notes: 'Test notes',
      marketingOptIn: true,
      source: 'public_booking' as const,
    };

    it('creates new client when no existing client found', async () => {
      const mockCreatedClient = {
        id: 'client-new',
        ...clientData,
        email: 'new@example.com',
        phone: '+11234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);
      asMock(mockPrisma.client.create).mockResolvedValueOnce(mockCreatedClient);

      const result = await ClientService.createClient(clientData);

      expect(result).toEqual(mockCreatedClient);
      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: {
          businessId: 'business-123',
          firstName: 'New',
          lastName: 'Client',
          email: 'new@example.com',
          phone: '+11234567890',
          marketingOptIn: true,
          notes: 'Test notes',
          source: 'public_booking',
          isActive: true,
        },
      });
    });

    it('updates existing client when found', async () => {
      const existingClient = {
        id: 'client-existing',
        businessId: 'business-123',
        firstName: 'Old',
        lastName: 'Name',
        email: 'new@example.com',
        phone: '+11234567890',
        isActive: true,
      };

      const updatedClient = {
        ...existingClient,
        firstName: 'New',
        lastName: 'Client',
        notes: 'Test notes',
        marketingOptIn: true,
        updatedAt: new Date(),
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(existingClient);
      asMock(mockPrisma.client.update).mockResolvedValueOnce(updatedClient);

      const result = await ClientService.createClient(clientData);

      expect(result).toEqual(updatedClient);
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-existing' },
        data: {
          firstName: 'New',
          lastName: 'Client',
          email: 'new@example.com',
          phone: '+11234567890',
          marketingOptIn: true,
          notes: 'Test notes',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('normalizes phone numbers correctly', async () => {
      const testCases = [
        { input: '1234567890', expected: '+11234567890' },
        { input: '+1234567890', expected: '+1234567890' },
        { input: '11234567890', expected: '+11234567890' },
        { input: '+11234567890', expected: '+11234567890' },
        { input: '(123) 456-7890', expected: '+11234567890' },
        { input: '+44 20 7946 0958', expected: '+442079460958' },
      ];

      for (const testCase of testCases) {
        asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);
        asMock(mockPrisma.client.create).mockResolvedValueOnce({
          id: 'test-client',
          phone: testCase.expected,
        } as any);

        await ClientService.createClient({
          ...clientData,
          phone: testCase.input,
        });

        expect(mockPrisma.client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              phone: testCase.expected,
            }),
          })
        );

        jest.clearAllMocks();
      }
    });

    it('trims and normalizes text fields', async () => {
      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);
      asMock(mockPrisma.client.create).mockResolvedValueOnce({
        id: 'test-client',
      } as any);

      await ClientService.createClient({
        ...clientData,
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        notes: '  Some notes  ',
      });

      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          notes: 'Some notes',
        }),
      });
    });

    it('handles null notes correctly', async () => {
      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);
      asMock(mockPrisma.client.create).mockResolvedValueOnce({
        id: 'test-client',
      } as any);

      await ClientService.createClient({
        ...clientData,
        notes: undefined,
      });

      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: null,
        }),
      });
    });

    it('throws error when database operation fails', async () => {
      asMock(mockPrisma.client.findFirst).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(ClientService.createClient(clientData)).rejects.toThrow(
        'Failed to create client profile'
      );
    });
  });

  describe('getClientById', () => {
    it('returns client when found', async () => {
      const mockClient = {
        id: 'client-123',
        businessId: 'business-123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(mockClient);

      const result = await ClientService.getClientById(
        'client-123',
        'business-123'
      );

      expect(result).toEqual(mockClient);
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'client-123',
          businessId: 'business-123',
          isActive: true,
        },
      });
    });

    it('returns null when client not found', async () => {
      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);

      const result = await ClientService.getClientById(
        'nonexistent',
        'business-123'
      );

      expect(result).toBeNull();
    });

    it('throws error when database operation fails', async () => {
      asMock(mockPrisma.client.findFirst).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        ClientService.getClientById('client-123', 'business-123')
      ).rejects.toThrow('Failed to retrieve client information');
    });
  });

  describe('updateClient', () => {
    it('updates client successfully', async () => {
      const existingClient = {
        id: 'client-123',
        businessId: 'business-123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      const updatedClient = {
        ...existingClient,
        firstName: 'Jane',
        updatedAt: new Date(),
      };

      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(existingClient);
      asMock(mockPrisma.client.update).mockResolvedValueOnce(updatedClient);

      const result = await ClientService.updateClient(
        'client-123',
        'business-123',
        {
          firstName: 'Jane',
        }
      );

      expect(result).toEqual(updatedClient);
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        data: {
          firstName: 'Jane',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('throws error when client not found', async () => {
      asMock(mockPrisma.client.findFirst).mockResolvedValueOnce(null);

      await expect(
        ClientService.updateClient('nonexistent', 'business-123', {
          firstName: 'Jane',
        })
      ).rejects.toThrow('Client not found');
    });
  });

  describe('validateClientData', () => {
    it('validates valid client data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        notes: 'Some notes',
      };

      const result = ClientService.validateClientData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates first name length', () => {
      const invalidData = {
        firstName: 'A',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
      };

      const result = ClientService.validateClientData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'First name must be between 2 and 50 characters'
      );
    });

    it('validates email format', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '1234567890',
      };

      const result = ClientService.validateClientData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('validates phone format', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123',
      };

      const result = ClientService.validateClientData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });

    it('validates notes length', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        notes: 'A'.repeat(501),
      };

      const result = ClientService.validateClientData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Notes must be less than 500 characters');
    });
  });

  describe('searchClients', () => {
    it('searches clients by name', async () => {
      const mockClients = [
        {
          id: 'client-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        {
          id: 'client-2',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      ];

      asMock(mockPrisma.client.findMany).mockResolvedValueOnce(mockClients);

      const result = await ClientService.searchClients('business-123', 'doe');

      expect(result).toEqual(mockClients);
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: {
          businessId: 'business-123',
          isActive: true,
          OR: [
            { firstName: { contains: 'doe', mode: 'insensitive' } },
            { lastName: { contains: 'doe', mode: 'insensitive' } },
            { email: { contains: 'doe', mode: 'insensitive' } },
            { phone: { contains: 'doe' } },
          ],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 10,
      });
    });

    it('limits search results', async () => {
      asMock(mockPrisma.client.findMany).mockResolvedValueOnce([]);

      await ClientService.searchClients('business-123', 'test', 5);

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });
});
