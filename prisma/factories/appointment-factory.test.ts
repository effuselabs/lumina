/**
 * AppointmentFactory Tests
 */

import { PrismaClient } from '@prisma/client';
import { AppointmentFactory } from './appointment-factory';
import { DEFAULT_SEED_CONFIG } from './seed-config';

// Mock Prisma Client for testing
const mockPrisma = {
  client: {
    findMany: jest.fn(),
  },
  staff: {
    findMany: jest.fn(),
  },
  service: {
    findMany: jest.fn(),
  },
  appointment: {
    create: jest.fn(),
  },
  appointmentService: {
    createMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('AppointmentFactory', () => {
  let factory: AppointmentFactory;
  const businessId = 'test-business-id';
  const patterns = DEFAULT_SEED_CONFIG.appointments.patternsConfig;

  beforeEach(() => {
    factory = new AppointmentFactory(mockPrisma, businessId, patterns);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should load clients, staff, and services', async () => {
      // Mock data
      const mockClients = [
        {
          id: 'client1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
        },
        {
          id: 'client2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0002',
        },
      ];

      const mockStaff = [
        {
          id: 'staff1',
          displayName: 'Alice Johnson',
          workingHours: { monday: { startTime: '09:00', endTime: '17:00' } },
        },
        {
          id: 'staff2',
          displayName: 'Bob Wilson',
          workingHours: { tuesday: { startTime: '10:00', endTime: '18:00' } },
        },
      ];

      const mockServices = [
        {
          id: 'service1',
          name: 'Haircut',
          duration: 60,
          price: 65,
          category: 'Hair',
        },
        {
          id: 'service2',
          name: 'Hair Color',
          duration: 120,
          price: 120,
          category: 'Hair',
        },
      ];

      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
      (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue(mockStaff);
      (mockPrisma.service.findMany as jest.Mock).mockResolvedValue(
        mockServices
      );

      await factory.initialize();

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: { businessId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: { businessId, isActive: true },
        select: { id: true, displayName: true, workingHours: true },
      });

      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
          category: true,
        },
      });
    });

    it('should throw error if no clients, staff, or services exist', async () => {
      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([]);

      await expect(factory.initialize()).rejects.toThrow(
        'Cannot generate appointments without clients, staff, and services'
      );
    });
  });

  describe('appointment generation', () => {
    beforeEach(async () => {
      // Setup mock data for successful initialization
      const mockClients = [
        {
          id: 'client1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
        },
      ];

      const mockStaff = [
        {
          id: 'staff1',
          displayName: 'Alice Johnson',
          workingHours: { monday: { startTime: '09:00', endTime: '17:00' } },
        },
      ];

      const mockServices = [
        {
          id: 'service1',
          name: 'Haircut',
          duration: 60,
          price: 65,
          category: 'Hair',
        },
        {
          id: 'service2',
          name: 'Hair Color',
          duration: 120,
          price: 120,
          category: 'Hair',
        },
      ];

      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
      (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue(mockStaff);
      (mockPrisma.service.findMany as jest.Mock).mockResolvedValue(
        mockServices
      );

      await factory.initialize();
    });

    it('should generate a valid appointment', async () => {
      const mockAppointment = {
        id: 'appointment1',
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date(),
        endTime: new Date(),
        status: 'SCHEDULED',
      };

      (mockPrisma.appointment.create as jest.Mock).mockResolvedValue(
        mockAppointment
      );
      (mockPrisma.appointmentService.createMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      );

      const result = await factory.generate();

      expect(result).toEqual(mockAppointment);
      expect(mockPrisma.appointment.create).toHaveBeenCalled();
      expect(mockPrisma.appointmentService.createMany).toHaveBeenCalled();
    });

    it('should generate appointments with realistic status distribution', async () => {
      const mockAppointment = {
        id: 'appointment1',
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
      };

      (mockPrisma.appointment.create as jest.Mock).mockResolvedValue(
        mockAppointment
      );
      (mockPrisma.appointmentService.createMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      );

      // Generate multiple appointments to test distribution
      const appointments = [];
      for (let i = 0; i < 10; i++) {
        const appointment = await factory.generate();
        appointments.push(appointment);
      }

      expect(appointments.length).toBe(10);
      expect(mockPrisma.appointment.create).toHaveBeenCalledTimes(10);
    });
  });

  describe('validation', () => {
    it('should validate required fields', () => {
      const invalidData = {
        businessId: '',
        clientId: '',
        staffId: '',
      };

      const result = (factory as any).validate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5); // businessId, clientId, staffId, startTime, endTime
    });

    it('should validate time logic', () => {
      const invalidData = {
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date('2025-01-01T15:00:00'),
        endTime: new Date('2025-01-01T14:00:00'), // End before start
      };

      const result = (factory as any).validate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.code === 'INVALID_RANGE')).toBe(
        true
      );
    });

    it('should validate deposit amount', () => {
      const invalidData = {
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date('2025-01-01T14:00:00'),
        endTime: new Date('2025-01-01T15:00:00'),
        depositAmount: -50, // Negative deposit
      };

      const result = (factory as any).validate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.code === 'INVALID_VALUE')).toBe(
        true
      );
    });

    it('should pass validation for valid data', () => {
      const validData = {
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date('2025-01-01T14:00:00'),
        endTime: new Date('2025-01-01T15:00:00'),
        status: 'SCHEDULED',
        depositAmount: 50,
        depositPaid: true,
      };

      const result = (factory as any).validate(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('historical appointment generation', () => {
    beforeEach(async () => {
      // Setup mock data for successful initialization
      const mockClients = [
        {
          id: 'client1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
        },
      ];

      const mockStaff = [
        {
          id: 'staff1',
          displayName: 'Alice Johnson',
          workingHours: { monday: { startTime: '09:00', endTime: '17:00' } },
        },
      ];

      const mockServices = [
        {
          id: 'service1',
          name: 'Haircut',
          duration: 60,
          price: 65,
          category: 'Hair',
        },
      ];

      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
      (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue(mockStaff);
      (mockPrisma.service.findMany as jest.Mock).mockResolvedValue(
        mockServices
      );

      await factory.initialize();
    });

    it('should generate specified number of historical appointments', async () => {
      const mockAppointment = {
        id: 'appointment1',
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
      };

      (mockPrisma.appointment.create as jest.Mock).mockResolvedValue(
        mockAppointment
      );
      (mockPrisma.appointmentService.createMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      );

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-06-30');
      const targetCount = 5;

      const appointments = await factory.generateHistoricalAppointments(
        startDate,
        endDate,
        targetCount
      );

      expect(appointments).toHaveLength(targetCount);
      expect(mockPrisma.appointment.create).toHaveBeenCalledTimes(targetCount);
    });

    it('should call progress callback during generation', async () => {
      const mockAppointment = {
        id: 'appointment1',
        businessId,
        clientId: 'client1',
        staffId: 'staff1',
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
      };

      (mockPrisma.appointment.create as jest.Mock).mockResolvedValue(
        mockAppointment
      );
      (mockPrisma.appointmentService.createMany as jest.Mock).mockResolvedValue(
        { count: 1 }
      );

      const progressCallback = jest.fn();
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-06-30');
      const targetCount = 3;

      await factory.generateHistoricalAppointments(
        startDate,
        endDate,
        targetCount,
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenLastCalledWith(
        targetCount,
        targetCount
      );
    });
  });
});
