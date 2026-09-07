import { BusinessMetricsTracker } from '@/lib/monitoring/business-metrics-tracker';
import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    businessMetric: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  },
}));

describe('BusinessMetricsTracker', () => {
  let tracker: BusinessMetricsTracker;
  const mockBusinessId = 'test-business-id';

  beforeEach(() => {
    tracker = new BusinessMetricsTracker();
    jest.clearAllMocks();
  });

  describe('trackAppointmentCreated', () => {
    it('should track appointment creation metrics', async () => {
      const appointmentData = {
        totalPrice: 100,
        serviceIds: ['service-1', 'service-2'],
        staffId: 'staff-1',
        startTime: new Date('2024-01-15T10:00:00Z'),
      };

      await tracker.trackAppointmentCreated(mockBusinessId, appointmentData);

      // Should track appointment creation
      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'APPOINTMENT_CREATED',
          },
        },
        update: {
          value: { increment: 1 },
          metadata: {
            totalRevenue: { increment: 100 },
          },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_CREATED',
          value: 1,
          metadata: {
            totalRevenue: 100,
          },
        },
      });

      // Should track service usage for each service
      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'SERVICE_USAGE',
          },
        },
        update: {
          metadata: {
            services: {
              'service-1': { increment: 1 },
            },
          },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'SERVICE_USAGE',
          value: 1,
          metadata: {
            services: {
              'service-1': 1,
            },
          },
        },
      });

      // Should track staff utilization
      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'STAFF_UTILIZATION',
          },
        },
        update: {
          metadata: {
            staff: {
              'staff-1': { increment: 1 },
            },
          },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'STAFF_UTILIZATION',
          value: 1,
          metadata: {
            staff: {
              'staff-1': 1,
            },
          },
        },
      });

      // Should track peak hours (10 AM)
      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'PEAK_HOURS',
          },
        },
        update: {
          metadata: {
            hours: {
              '10': { increment: 1 },
            },
          },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'PEAK_HOURS',
          value: 1,
          metadata: {
            hours: {
              '10': 1,
            },
          },
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const appointmentData = {
        totalPrice: 100,
        serviceIds: ['service-1'],
        staffId: 'staff-1',
        startTime: new Date(),
      };

      (prisma.businessMetric.upsert as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw error
      await expect(
        tracker.trackAppointmentCreated(mockBusinessId, appointmentData)
      ).resolves.not.toThrow();
    });
  });

  describe('trackAppointmentStatusChange', () => {
    it('should track appointment confirmation', async () => {
      const appointmentDate = new Date('2024-01-15T10:00:00Z');

      await tracker.trackAppointmentStatusChange(
        mockBusinessId,
        'appointment-1',
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
        appointmentDate
      );

      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'APPOINTMENT_CONFIRMED',
          },
        },
        update: {
          value: { increment: 1 },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_CONFIRMED',
          value: 1,
        },
      });
    });

    it('should track appointment completion', async () => {
      const appointmentDate = new Date('2024-01-15T10:00:00Z');

      await tracker.trackAppointmentStatusChange(
        mockBusinessId,
        'appointment-1',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        appointmentDate
      );

      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'APPOINTMENT_COMPLETED',
          },
        },
        update: {
          value: { increment: 1 },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_COMPLETED',
          value: 1,
        },
      });
    });

    it('should track appointment cancellation', async () => {
      const appointmentDate = new Date('2024-01-15T10:00:00Z');

      await tracker.trackAppointmentStatusChange(
        mockBusinessId,
        'appointment-1',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        appointmentDate
      );

      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'APPOINTMENT_CANCELLED',
          },
        },
        update: {
          value: { increment: 1 },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_CANCELLED',
          value: 1,
        },
      });
    });

    it('should track no-show appointments', async () => {
      const appointmentDate = new Date('2024-01-15T10:00:00Z');

      await tracker.trackAppointmentStatusChange(
        mockBusinessId,
        'appointment-1',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.NO_SHOW,
        appointmentDate
      );

      expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
        where: {
          businessId_date_type: {
            businessId: mockBusinessId,
            date: new Date('2024-01-15T00:00:00Z'),
            type: 'APPOINTMENT_NO_SHOW',
          },
        },
        update: {
          value: { increment: 1 },
        },
        create: {
          businessId: mockBusinessId,
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_NO_SHOW',
          value: 1,
        },
      });
    });
  });

  describe('getAppointmentVolumeMetrics', () => {
    it('should calculate appointment volume metrics correctly', async () => {
      const mockAppointments = [
        { status: AppointmentStatus.SCHEDULED },
        { status: AppointmentStatus.CONFIRMED },
        { status: AppointmentStatus.COMPLETED },
        { status: AppointmentStatus.COMPLETED },
        { status: AppointmentStatus.CANCELLED },
        { status: AppointmentStatus.NO_SHOW },
      ];

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(
        mockAppointments
      );

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const metrics = await tracker.getAppointmentVolumeMetrics(
        mockBusinessId,
        startDate,
        endDate
      );

      expect(metrics).toEqual({
        total: 6,
        scheduled: 1,
        confirmed: 1,
        completed: 2,
        cancelled: 1,
        noShow: 1,
        successRate: 33.33333333333333, // 2 completed out of 6 total
      });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          businessId: mockBusinessId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
        },
      });
    });

    it('should handle empty appointment list', async () => {
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const metrics = await tracker.getAppointmentVolumeMetrics(
        mockBusinessId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics).toEqual({
        total: 0,
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        successRate: 0,
      });
    });
  });

  describe('getBusinessMetrics', () => {
    it('should return business metrics for date range', async () => {
      const mockMetrics = [
        {
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_CREATED',
          value: 5,
          metadata: { totalRevenue: 500 },
        },
        {
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'APPOINTMENT_COMPLETED',
          value: 4,
          metadata: {},
        },
        {
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'STAFF_UTILIZATION',
          value: 1,
          metadata: { staff: { 'staff-1': 3, 'staff-2': 2 } },
        },
        {
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'SERVICE_USAGE',
          value: 1,
          metadata: { services: { 'service-1': 3, 'service-2': 2 } },
        },
        {
          date: new Date('2024-01-15T00:00:00Z'),
          type: 'PEAK_HOURS',
          value: 1,
          metadata: { hours: { '10': 2, '14': 3 } },
        },
      ];

      (prisma.businessMetric.findMany as jest.Mock).mockResolvedValue(
        mockMetrics
      );

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const metrics = await tracker.getBusinessMetrics(
        mockBusinessId,
        startDate,
        endDate
      );

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual({
        businessId: mockBusinessId,
        date: new Date('2024-01-15'),
        appointmentVolume: 5,
        successfulBookings: 4,
        cancelledBookings: 0,
        noShowBookings: 0,
        totalRevenue: 500,
        averageBookingValue: 100, // 500 / 5
        staffUtilization: { 'staff-1': 3, 'staff-2': 2 },
        popularServices: { 'service-1': 3, 'service-2': 2 },
        peakHours: { '10': 2, '14': 3 },
      });
    });

    it('should handle empty metrics', async () => {
      (prisma.businessMetric.findMany as jest.Mock).mockResolvedValue([]);

      const metrics = await tracker.getBusinessMetrics(
        mockBusinessId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(metrics).toEqual([]);
    });
  });
});
