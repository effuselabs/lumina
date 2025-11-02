/**
 * Integration Tests for Email Notification Delivery
 * 
 * Tests end-to-end email delivery flows including:
 * - Booking confirmation flow
 * - Reminder scheduling and delivery
 * - Multi-tenant data isolation
 * - Provider integration
 * 
 * Requirements: All requirements
 */

import { NotificationService } from '@/lib/email/notification-service';
import { EmailQueueManager } from '@/lib/email/queue-manager';
import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/email/resend-provider');
jest.mock('@/lib/email/template-engine');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Email Notification Delivery Integration', () => {
  let notificationService: NotificationService;
  let queueManager: EmailQueueManager;

  const mockBusinessId = 'business-123';
  const mockAppointmentId = 'appointment-123';

  const mockBusiness = {
    id: mockBusinessId,
    name: 'Test Salon',
    address: '123 Main St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    phone: '+1234567890',
    email: 'salon@test.com',
    logo: 'https://example.com/logo.png',
    primaryColor: '#FFD25A',
    isActive: true,
  };

  const mockAppointment = {
    id: mockAppointmentId,
    businessId: mockBusinessId,
    clientId: 'client-123',
    staffId: 'staff-123',
    startTime: new Date('2024-12-01T10:00:00Z'),
    endTime: new Date('2024-12-01T11:00:00Z'),
    status: AppointmentStatus.SCHEDULED,
    totalDuration: 60,
    totalPrice: new Decimal(50),
    clientEmail: 'john.doe@test.com',
    clientName: 'John Doe',
    cancellationReason: null,
    business: mockBusiness,
    client: {
      id: 'client-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      phone: '+1234567890',
    },
    staff: {
      id: 'staff-123',
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith',
      user: {
        email: 'jane.smith@test.com',
      },
    },
    services: [
      {
        id: 'as-123',
        serviceId: 'service-123',
        serviceName: 'Haircut',
        price: new Decimal(50),
        duration: 60,
        serviceOrder: 1,
        startOffset: 0,
        service: {
          name: 'Haircut',
          description: 'Professional haircut',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    notificationService = new NotificationService();
    queueManager = new EmailQueueManager();

    // Add missing models to mockPrisma
    if (!mockPrisma.emailPreference) {
      (mockPrisma as any).emailPreference = {
        findUnique: jest.fn(),
      };
    }
    if (!mockPrisma.emailQueue) {
      (mockPrisma as any).emailQueue = {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      };
    }

    // Setup default mocks
    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(mockBusiness);
    (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue({
      id: 'queue-123',
      businessId: mockBusinessId,
      recipientEmail: 'john.doe@test.com',
      status: 'pending',
      createdAt: new Date(),
    });
    (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.communicationHistory.create as jest.Mock).mockResolvedValue({});
  });

  describe('End-to-End Booking Confirmation Flow', () => {
    it('should complete full booking confirmation delivery flow', async () => {
      // Step 1: Send booking confirmation
      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');
      expect(result.notificationId).toBeDefined();

      // Verify business validation was performed
      expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: mockBusinessId },
        select: { id: true, isActive: true },
      });

      // Verify appointment was fetched
      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: mockAppointmentId },
        include: expect.any(Object),
      });

      // Verify email was queued
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: mockBusinessId,
          appointmentId: mockAppointmentId,
          recipientEmail: 'john.doe@test.com',
          templateType: 'booking_confirmation',
          priority: 'high',
          status: 'pending',
        }),
      });
    });

    it('should handle multi-tenant data isolation', async () => {
      const differentBusinessId = 'business-456';

      // Appointment belongs to different business
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        businessId: differentBusinessId,
      });

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not belong to this business');
      expect(mockPrisma.emailQueue.create).not.toHaveBeenCalled();
    });
  });

  describe('Reminder Scheduling and Delivery', () => {
    it('should schedule and deliver 24h reminder', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      });

      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');

      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateType: 'appointment_reminder_24h',
          priority: 'normal',
        }),
      });
    });

    it('should not send reminder for cancelled appointments', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        status: AppointmentStatus.CANCELLED,
      });

      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(false);
      expect(mockPrisma.emailQueue.create).not.toHaveBeenCalled();
    });
  });

  describe('Queue Processing Integration', () => {
    it('should enqueue and dequeue emails in priority order', async () => {
      const mockQueueEntry = {
        id: 'queue-123',
        businessId: mockBusinessId,
        recipientEmail: 'test@example.com',
        recipientName: 'John Doe',
        templateType: 'booking_confirmation',
        subject: 'Test Email',
        htmlContent: '<html>Test</html>',
        textContent: 'Test',
        priority: 'high',
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 3,
        scheduledAt: new Date(),
        createdAt: new Date(),
        metadata: {},
      };

      (mockPrisma.emailQueue.findFirst as jest.Mock).mockResolvedValue(mockQueueEntry);
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        status: 'processing',
      });

      // Dequeue the email
      const email = await queueManager.dequeue();

      expect(email).toBeDefined();
      expect(email?.priority).toBe('high');
      expect(email?.templateType).toBe('booking_confirmation');

      // Verify it was marked as processing
      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'processing',
        }),
      });
    });

    it('should handle retry scheduling for failed deliveries', async () => {
      const mockQueueEntry = {
        id: 'queue-123',
        businessId: mockBusinessId,
        status: 'failed',
        attemptCount: 1,
        maxAttempts: 3,
        createdAt: new Date(),
      };

      (mockPrisma.emailQueue.findUnique as jest.Mock).mockResolvedValue(mockQueueEntry);
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        status: 'pending',
        attemptCount: 1,
      });

      await queueManager.scheduleRetry('queue-123', 1);

      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'pending',
          attemptCount: 1,
          scheduledAt: expect.any(Date),
        }),
      });
    });
  });

  describe('Multi-Tenant Data Isolation', () => {
    it('should enforce business context in all operations', async () => {
      // Test with valid business
      const result1 = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result1.success).toBe(true);

      // Test with invalid business
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

      const result2 = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        'invalid-business-id'
      );

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Business not found');
    });

    it('should prevent cross-tenant email delivery', async () => {
      const business1Id = 'business-123';
      const business2Id = 'business-456';

      // Appointment belongs to business1
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        businessId: business1Id,
      });

      // Try to send notification as business2
      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        business2Id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not belong to this business');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      (mockPrisma.appointment.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should continue if communication history logging fails', async () => {
      (mockPrisma.communicationHistory.create as jest.Mock).mockRejectedValue(
        new Error('Logging failed')
      );

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      // Should still succeed even if logging fails
      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');
    });

    it('should handle queue full scenario', async () => {
      (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(10000);

      const mockEmail = {
        id: 'msg-123',
        businessId: mockBusinessId,
        to: 'test@example.com',
        from: 'noreply@uselumina.app',
        subject: 'Test',
        html: '<html>Test</html>',
        text: 'Test',
        templateType: 'booking_confirmation' as const,
        metadata: {},
        priority: 'normal' as const,
        attemptCount: 0,
        maxAttempts: 3,
        scheduledAt: new Date(),
        createdAt: new Date(),
      };

      await expect(queueManager.enqueue(mockEmail)).rejects.toThrow('Queue is full');
    });
  });
});
