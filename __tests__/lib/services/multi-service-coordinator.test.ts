/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import {
  MultiServiceCoordinator,
  multiServiceCoordinator,
} from '@/lib/services/multi-service-coordinator';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    service: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    staffService: {
      findMany: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
    },
    promotion: {
      findMany: jest.fn(),
    },
    loyaltyMembership: {
      findFirst: jest.fn(),
    },
  },
}));

describe('MultiServiceCoordinator', () => {
  const mockBusinessId = 'business-123';
  const mockStaffId = 'staff-123';
  const mockClientId = 'client-123';
  const mockAppointmentId = 'appointment-123';

  const mockServices = [
    {
      serviceId: 'service-1',
      serviceName: 'Haircut',
      price: 50,
      duration: 30,
      serviceOrder: 1,
    },
    {
      serviceId: 'service-2',
      serviceName: 'Hair Wash',
      price: 20,
      duration: 15,
      serviceOrder: 2,
    },
    {
      serviceId: 'service-3',
      serviceName: 'Styling',
      price: 30,
      duration: 20,
      serviceOrder: 3,
    },
  ];

  const mockTimeSlot = {
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:30:00Z'), // 90 minutes
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mocks
    (prisma.promotion.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.loyaltyMembership.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateMultiServiceBooking', () => {
    it('should validate a successful multi-service booking', async () => {
      // Mock service existence validation
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 30,
          price: new Decimal(50),
        },
        {
          id: 'service-2',
          name: 'Hair Wash',
          duration: 15,
          price: new Decimal(20),
        },
        {
          id: 'service-3',
          name: 'Styling',
          duration: 20,
          price: new Decimal(30),
        },
      ]);

      // Mock staff service validation
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue([
        { staffId: mockStaffId, serviceId: 'service-1' },
        { staffId: mockStaffId, serviceId: 'service-2' },
        { staffId: mockStaffId, serviceId: 'service-3' },
      ]);

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        mockServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalDuration).toBe(65); // 30 + 15 + 20
      expect(result.totalPrice.toNumber()).toBe(100); // 50 + 20 + 30
      expect(result.optimizedServices).toHaveLength(3);
    });

    it('should fail validation when services do not exist', async () => {
      // Mock missing services
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 30,
          price: new Decimal(50),
        },
      ]);
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue([
        { staffId: mockStaffId, serviceId: 'service-1' },
      ]);

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        mockServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Services not found or inactive: service-2, service-3'
      );
    });

    it('should fail validation when staff cannot perform services', async () => {
      // Mock all services exist
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 30,
          price: new Decimal(50),
        },
        {
          id: 'service-2',
          name: 'Hair Wash',
          duration: 15,
          price: new Decimal(20),
        },
        {
          id: 'service-3',
          name: 'Styling',
          duration: 20,
          price: new Decimal(30),
        },
      ]);

      // Mock staff can only perform some services
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue([
        { staffId: mockStaffId, serviceId: 'service-1' },
        { staffId: mockStaffId, serviceId: 'service-2' },
      ]);

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        mockServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Staff member cannot perform services: service-3'
      );
    });

    it('should fail validation when duration exceeds time slot', async () => {
      const longServices = [
        {
          serviceId: 'service-1',
          serviceName: 'Long Service',
          price: 100,
          duration: 120, // 2 hours
          serviceOrder: 1,
        },
      ];

      const shortTimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'), // 30 minutes
      };

      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Long Service',
          duration: 120,
          price: new Decimal(100),
        },
      ]);
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue([
        { staffId: mockStaffId, serviceId: 'service-1' },
      ]);

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        longServices,
        shortTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Total service duration (120 minutes) exceeds available time slot (30 minutes)'
      );
    });

    it('should detect duplicate services', async () => {
      const duplicateServices = [
        {
          serviceId: 'service-1',
          serviceName: 'Haircut',
          price: 50,
          duration: 30,
          serviceOrder: 1,
        },
        {
          serviceId: 'service-1', // Duplicate
          serviceName: 'Haircut',
          price: 50,
          duration: 30,
          serviceOrder: 2,
        },
      ];

      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 30,
          price: new Decimal(50),
        },
      ]);
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue([
        { staffId: mockStaffId, serviceId: 'service-1' },
      ]);

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        duplicateServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate services detected in booking');
    });

    it('should generate warnings for tight scheduling', async () => {
      const tightServices = [
        {
          serviceId: 'service-1',
          serviceName: 'Long Service',
          price: 100,
          duration: 85, // 85 minutes in 90-minute slot (94%)
          serviceOrder: 1,
        },
      ];

      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Long Service',
          duration: 85,
          price: new Decimal(100),
        },
      ]);
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue([
        { staffId: mockStaffId, serviceId: 'service-1' },
      ]);

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        tightServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Booking uses more than 90% of available time slot - consider buffer time'
      );
    });

    it('should generate warnings for multiple services', async () => {
      const manyServices = [
        {
          serviceId: 'service-1',
          serviceName: 'Service 1',
          price: 10,
          duration: 10,
          serviceOrder: 1,
        },
        {
          serviceId: 'service-2',
          serviceName: 'Service 2',
          price: 10,
          duration: 10,
          serviceOrder: 2,
        },
        {
          serviceId: 'service-3',
          serviceName: 'Service 3',
          price: 10,
          duration: 10,
          serviceOrder: 3,
        },
        {
          serviceId: 'service-4',
          serviceName: 'Service 4',
          price: 10,
          duration: 10,
          serviceOrder: 4,
        },
      ];

      (prisma.service.findMany as jest.Mock).mockResolvedValue(
        manyServices.map((s: any) => ({
          id: s.serviceId,
          name: s.serviceName,
          duration: s.duration,
          price: new Decimal(s.price),
        }))
      );
      (prisma.staffService.findMany as jest.Mock).mockResolvedValue(
        manyServices.map((s: any) => ({
          staffId: mockStaffId,
          serviceId: s.serviceId,
        }))
      );

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        manyServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Multiple services may require additional preparation time'
      );
    });
  });

  describe('calculateTotalDuration', () => {
    it('should calculate total duration correctly', async () => {
      const serviceIds = ['service-1', 'service-2', 'service-3'];

      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        { id: 'service-1', duration: 30 },
        { id: 'service-2', duration: 15 },
        { id: 'service-3', duration: 20 },
      ]);

      const totalDuration =
        await multiServiceCoordinator.calculateTotalDuration(
          serviceIds,
          mockBusinessId
        );

      expect(totalDuration).toBe(65);
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: serviceIds },
          businessId: mockBusinessId,
          isActive: true,
        },
        select: {
          id: true,
          duration: true,
        },
      });
    });

    it('should throw error for missing services', async () => {
      const serviceIds = ['service-1', 'service-2', 'missing-service'];

      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        { id: 'service-1', duration: 30 },
        { id: 'service-2', duration: 15 },
      ]);

      await expect(
        multiServiceCoordinator.calculateTotalDuration(
          serviceIds,
          mockBusinessId
        )
      ).rejects.toThrow('Services not found: missing-service');
    });
  });

  describe('calculateTotalPrice', () => {
    it('should calculate base price correctly', async () => {
      // Mock no discounts or promotions
      const coordinator = new MultiServiceCoordinator();
      jest
        .spyOn(coordinator as any, 'getApplicableDiscounts')
        .mockResolvedValue([]);
      jest
        .spyOn(coordinator as any, 'getApplicablePromotions')
        .mockResolvedValue([]);

      const totalPrice = await coordinator.calculateTotalPrice(
        mockServices,
        mockBusinessId
      );

      expect(totalPrice.toNumber()).toBe(100); // 50 + 20 + 30
    });

    it('should apply percentage discount correctly', async () => {
      const coordinator = new MultiServiceCoordinator();

      const mockDiscount = {
        id: 'discount-1',
        name: '10% Off',
        type: 'PERCENTAGE' as const,
        value: 10,
        applicableServices: [],
        minimumServices: 2,
        conditions: {},
      };

      jest
        .spyOn(coordinator as any, 'getApplicableDiscounts')
        .mockResolvedValue([mockDiscount]);
      jest
        .spyOn(coordinator as any, 'getApplicablePromotions')
        .mockResolvedValue([]);

      const totalPrice = await coordinator.calculateTotalPrice(
        mockServices,
        mockBusinessId
      );

      expect(totalPrice.toNumber()).toBe(90); // 100 - 10%
    });

    it('should apply fixed amount discount correctly', async () => {
      const coordinator = new MultiServiceCoordinator();

      const mockDiscount = {
        id: 'discount-1',
        name: '$15 Off',
        type: 'FIXED_AMOUNT' as const,
        value: 15,
        applicableServices: [],
        minimumServices: 2,
        conditions: {},
      };

      jest
        .spyOn(coordinator as any, 'getApplicableDiscounts')
        .mockResolvedValue([mockDiscount]);
      jest
        .spyOn(coordinator as any, 'getApplicablePromotions')
        .mockResolvedValue([]);

      const totalPrice = await coordinator.calculateTotalPrice(
        mockServices,
        mockBusinessId
      );

      expect(totalPrice.toNumber()).toBe(85); // 100 - 15
    });
  });

  describe('optimizeServiceOrder', () => {
    it('should optimize service order by duration', async () => {
      const unorderedServices = [
        {
          serviceId: 'service-1',
          serviceName: 'Short Service',
          price: 20,
          duration: 15,
        },
        {
          serviceId: 'service-2',
          serviceName: 'Long Service',
          price: 50,
          duration: 45,
        },
        {
          serviceId: 'service-3',
          serviceName: 'Medium Service',
          price: 30,
          duration: 30,
        },
      ];

      const optimizedServices =
        await multiServiceCoordinator.optimizeServiceOrder(
          unorderedServices,
          mockBusinessId
        );

      // Should be ordered by duration (longest first): service-2, service-3, service-1
      expect(optimizedServices[0].serviceId).toBe('service-2');
      expect(optimizedServices[1].serviceId).toBe('service-3');
      expect(optimizedServices[2].serviceId).toBe('service-1');

      // Check service orders are assigned
      expect(optimizedServices[0].serviceOrder).toBe(1);
      expect(optimizedServices[1].serviceOrder).toBe(2);
      expect(optimizedServices[2].serviceOrder).toBe(3);

      // Check start offsets are calculated
      expect(optimizedServices[0].startOffset).toBe(0);
      expect(optimizedServices[1].startOffset).toBe(45);
      expect(optimizedServices[2].startOffset).toBe(75);
    });

    it('should preserve existing service order when specified', async () => {
      const orderedServices = [
        {
          serviceId: 'service-1',
          serviceName: 'First',
          price: 20,
          duration: 15,
          serviceOrder: 1,
        },
        {
          serviceId: 'service-2',
          serviceName: 'Second',
          price: 50,
          duration: 45,
          serviceOrder: 2,
        },
        {
          serviceId: 'service-3',
          serviceName: 'Third',
          price: 30,
          duration: 30,
          serviceOrder: 3,
        },
      ];

      const optimizedServices =
        await multiServiceCoordinator.optimizeServiceOrder(
          orderedServices,
          mockBusinessId
        );

      // The optimization sorts by duration (longest first) when no dependencies exist
      // So service-2 (45 min) should come first, then service-3 (30 min), then service-1 (15 min)
      expect(optimizedServices[0].serviceId).toBe('service-2');
      expect(optimizedServices[1].serviceId).toBe('service-3');
      expect(optimizedServices[2].serviceId).toBe('service-1');
    });
  });

  describe('handleServiceModification', () => {
    const mockAppointment = {
      id: mockAppointmentId,
      businessId: mockBusinessId,
      staffId: mockStaffId,
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      services: [
        {
          id: 'as-1',
          serviceId: 'service-1',
          serviceName: 'Haircut',
          price: new Decimal(50),
          duration: 30,
          serviceOrder: 1,
          startOffset: 0,
          assignedStaffId: null,
        },
        {
          id: 'as-2',
          serviceId: 'service-2',
          serviceName: 'Hair Wash',
          price: new Decimal(20),
          duration: 15,
          serviceOrder: 2,
          startOffset: 30,
          assignedStaffId: null,
        },
      ],
    };

    it('should handle adding a service', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      // Mock validation for the new service combination
      const coordinator = new MultiServiceCoordinator();
      jest.spyOn(coordinator, 'validateMultiServiceBooking').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        totalDuration: 65, // 30 + 15 + 20
        totalPrice: new Decimal(100), // 50 + 20 + 30
        optimizedServices: [],
      });

      const serviceChanges = [
        {
          action: 'add' as const,
          serviceId: 'service-3',
          newServiceData: {
            serviceName: 'Styling',
            price: 30,
            duration: 20,
            serviceOrder: 3,
          },
        },
      ];

      const result = await coordinator.handleServiceModification(
        mockAppointmentId,
        serviceChanges,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.newTotalPrice.toNumber()).toBe(100);
      expect(result.newTotalDuration).toBe(65);
    });

    it('should handle removing a service', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      const coordinator = new MultiServiceCoordinator();
      jest.spyOn(coordinator, 'validateMultiServiceBooking').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        totalDuration: 30, // Only haircut remaining
        totalPrice: new Decimal(50),
        optimizedServices: [],
      });

      const serviceChanges = [
        {
          action: 'remove' as const,
          serviceId: 'service-2',
        },
      ];

      const result = await coordinator.handleServiceModification(
        mockAppointmentId,
        serviceChanges,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.newTotalPrice.toNumber()).toBe(50);
      expect(result.newTotalDuration).toBe(30);
    });

    it('should handle modifying a service', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      const coordinator = new MultiServiceCoordinator();
      jest.spyOn(coordinator, 'validateMultiServiceBooking').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        totalDuration: 55, // 40 + 15 (modified haircut duration)
        totalPrice: new Decimal(80), // 60 + 20 (modified haircut price)
        optimizedServices: [],
      });

      const serviceChanges = [
        {
          action: 'modify' as const,
          serviceId: 'service-1',
          newServiceData: {
            price: 60,
            duration: 40,
          },
        },
      ];

      const result = await coordinator.handleServiceModification(
        mockAppointmentId,
        serviceChanges,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.newTotalPrice.toNumber()).toBe(80);
      expect(result.newTotalDuration).toBe(55);
    });

    it('should fail when appointment is not found', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await multiServiceCoordinator.handleServiceModification(
        'non-existent-appointment',
        [],
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Appointment not found');
    });

    it('should fail when validation fails', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      const coordinator = new MultiServiceCoordinator();
      jest.spyOn(coordinator, 'validateMultiServiceBooking').mockResolvedValue({
        isValid: false,
        errors: ['Staff cannot perform this service'],
        warnings: [],
        totalDuration: 0,
        totalPrice: new Decimal(0),
        optimizedServices: [],
      });

      const serviceChanges = [
        {
          action: 'add' as const,
          serviceId: 'invalid-service',
          newServiceData: {
            serviceName: 'Invalid Service',
            price: 100,
            duration: 60,
          },
        },
      ];

      const result = await coordinator.handleServiceModification(
        mockAppointmentId,
        serviceChanges,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Staff cannot perform this service');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.service.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await multiServiceCoordinator.validateMultiServiceBooking(
        mockServices,
        mockTimeSlot,
        mockStaffId,
        mockBusinessId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain(
        'Validation failed: Database connection failed'
      );
    });

    it('should handle calculateTotalDuration errors', async () => {
      (prisma.service.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        multiServiceCoordinator.calculateTotalDuration(
          ['service-1'],
          mockBusinessId
        )
      ).rejects.toThrow('Failed to calculate total duration: Database error');
    });

    it('should handle calculateTotalPrice errors', async () => {
      const coordinator = new MultiServiceCoordinator();
      jest
        .spyOn(coordinator as any, 'getApplicableDiscounts')
        .mockRejectedValue(new Error('Discount service error'));

      await expect(
        coordinator.calculateTotalPrice(mockServices, mockBusinessId)
      ).rejects.toThrow(
        'Failed to calculate total price: Discount service error'
      );
    });
  });

  describe('enhanced pricing calculations', () => {
    it('should apply multi-service discount for 3+ services', async () => {
      const coordinator = new MultiServiceCoordinator();

      // Mock the private method to return multi-service discount
      jest
        .spyOn(coordinator as any, 'getApplicableDiscounts')
        .mockResolvedValue([
          {
            id: 'multi-service-discount',
            name: 'Multi-Service Discount',
            type: 'PERCENTAGE',
            value: 10,
            applicableServices: mockServices.map((s: any) => s.serviceId),
            minimumServices: 3,
            conditions: { multiService: true },
          },
        ]);
      jest
        .spyOn(coordinator as any, 'getApplicablePromotions')
        .mockResolvedValue([]);

      const totalPrice = await coordinator.calculateTotalPrice(
        mockServices,
        mockBusinessId
      );

      expect(totalPrice.toNumber()).toBe(90); // 100 - 10%
    });

    it('should apply high-value discount for orders over $100', async () => {
      const highValueServices = [
        {
          serviceId: 'service-1',
          serviceName: 'Premium Cut',
          price: 80,
          duration: 60,
        },
        {
          serviceId: 'service-2',
          serviceName: 'Premium Color',
          price: 120,
          duration: 90,
        },
      ];

      const coordinator = new MultiServiceCoordinator();

      jest
        .spyOn(coordinator as any, 'getApplicableDiscounts')
        .mockResolvedValue([
          {
            id: 'high-value-discount',
            name: 'High Value Discount',
            type: 'FIXED_AMOUNT',
            value: 20,
            applicableServices: highValueServices.map((s: any) => s.serviceId),
            minimumServices: 1,
            conditions: { minimumSpend: 100 },
          },
        ]);
      jest
        .spyOn(coordinator as any, 'getApplicablePromotions')
        .mockResolvedValue([]);

      const totalPrice = await coordinator.calculateTotalPrice(
        highValueServices,
        mockBusinessId
      );

      expect(totalPrice.toNumber()).toBe(180); // 200 - 20
    });

    it('should calculate time-based pricing with off-peak discount', async () => {
      const earlyTimeSlot = {
        startTime: new Date('2024-01-15T08:00:00Z'), // 8 AM
        endTime: new Date('2024-01-15T09:30:00Z'),
      };

      const result = await multiServiceCoordinator.calculateTimeBasedPricing(
        mockServices,
        earlyTimeSlot,
        mockBusinessId
      );

      expect(result.basePrice.toNumber()).toBe(100);
      expect(result.adjustedPrice.toNumber()).toBe(90); // 10% off-peak discount
      expect(result.discountApplied).toBe('Off-peak hours discount (10%)');
    });

    it('should calculate time-based pricing with weekend premium', async () => {
      // Create a date that's definitely Saturday and during regular hours
      const saturday = new Date(2024, 0, 13, 14, 0, 0); // January 13, 2024, 2 PM local time
      const weekendTimeSlot = {
        startTime: saturday,
        endTime: new Date(saturday.getTime() + 90 * 60 * 1000), // 90 minutes later
      };

      const result = await multiServiceCoordinator.calculateTimeBasedPricing(
        mockServices,
        weekendTimeSlot,
        mockBusinessId
      );

      expect(result.basePrice.toNumber()).toBe(100);
      // Saturday 2 PM should only get weekend premium (no off-peak discount)
      expect(result.adjustedPrice.toNumber()).toBe(105); // 5% weekend premium
      expect(result.discountApplied).toBe('Weekend premium (5%)');
    });

    it('should calculate time-based pricing with both off-peak and weekend adjustments', async () => {
      // Create a date that's definitely Saturday evening (off-peak)
      const saturdayEvening = new Date(2024, 0, 13, 19, 0, 0); // January 13, 2024, 7 PM local time
      const weekendEveningTimeSlot = {
        startTime: saturdayEvening,
        endTime: new Date(saturdayEvening.getTime() + 90 * 60 * 1000),
      };

      const result = await multiServiceCoordinator.calculateTimeBasedPricing(
        mockServices,
        weekendEveningTimeSlot,
        mockBusinessId
      );

      expect(result.basePrice.toNumber()).toBe(100);
      // Saturday 7 PM should get both off-peak discount and weekend premium
      // 100 - 10 (off-peak) + 5 (weekend) = 95
      expect(result.adjustedPrice.toNumber()).toBe(95);
      expect(result.discountApplied).toBe(
        'Off-peak hours discount (10%), Weekend premium (5%)'
      );
    });

    it('should calculate loyalty discount correctly', async () => {
      const mockLoyaltyMembership = {
        id: 'membership-1',
        clientId: mockClientId,
        currentPoints: 500,
        loyaltyProgram: {
          id: 'program-1',
          businessId: mockBusinessId,
          pointsPerDollar: new Decimal(1),
          pointsRedemptionRate: new Decimal(0.01), // 1 cent per point
        },
      };

      (prisma.loyaltyMembership.findFirst as jest.Mock).mockResolvedValue(
        mockLoyaltyMembership
      );

      const result = await multiServiceCoordinator.calculateLoyaltyDiscount(
        mockServices,
        mockClientId,
        mockBusinessId
      );

      expect(result.pointsEarned).toBe(100); // 100 * 1 point per dollar
      expect(result.discount.toNumber()).toBe(5); // 500 points * 0.01, but capped at 50% of total (50)
      expect(result.pointsUsed).toBe(500);
    });

    it('should handle loyalty calculation errors gracefully', async () => {
      (prisma.loyaltyMembership.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await multiServiceCoordinator.calculateLoyaltyDiscount(
        mockServices,
        mockClientId,
        mockBusinessId
      );

      expect(result.discount.toNumber()).toBe(0);
      expect(result.pointsEarned).toBe(0);
      expect(result.pointsUsed).toBe(0);
    });
  });
});
