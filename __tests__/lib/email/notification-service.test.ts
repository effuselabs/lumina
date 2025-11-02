/**
 * Unit Tests for NotificationService
 * 
 * Tests the core notification service business logic including:
 * - Booking confirmation notifications
 * - Appointment reminders (24h and 2h)
 * - Cancellation notifications
 * - Staff notifications
 * - Business context validation
 * - Email preference checking
 * - Error handling
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { NotificationService, NotificationError, NotificationErrorCode } from '@/lib/email/notification-service';
import { prisma } from '@/lib/prisma';
import { templateEngine } from '@/lib/email/template-engine';
import { AppointmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/email/template-engine');
jest.mock('@/lib/email/resend-provider');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('NotificationService', () => {
  let notificationService: NotificationService;

  const mockBusinessId = 'business-123';
  const mockAppointmentId = 'appointment-123';
  const mockClientId = 'client-123';
  const mockStaffId = 'staff-123';

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

  const mockClient = {
    id: mockClientId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1234567890',
  };

  const mockStaff = {
    id: mockStaffId,
    firstName: 'Jane',
    lastName: 'Smith',
    displayName: 'Jane Smith',
    user: {
      email: 'jane.smith@test.com',
    },
  };

  const mockAppointment = {
    id: mockAppointmentId,
    businessId: mockBusinessId,
    clientId: mockClientId,
    staffId: mockStaffId,
    startTime: new Date('2024-12-01T10:00:00Z'),
    endTime: new Date('2024-12-01T11:00:00Z'),
    status: AppointmentStatus.SCHEDULED,
    totalDuration: 60,
    totalPrice: new Decimal(50),
    clientEmail: 'john.doe@test.com',
    clientName: 'John Doe',
    cancellationReason: null,
    business: mockBusiness,
    client: mockClient,
    staff: mockStaff,
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

    // Initialize service
    notificationService = new NotificationService({
      fromEmail: 'test@uselumina.app',
      fromName: 'Test Lumina',
      enableQueue: true,
    });

    // Add missing models to mockPrisma if they don't exist
    if (!mockPrisma.emailPreference) {
      (mockPrisma as any).emailPreference = {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };
    }
    if (!mockPrisma.emailQueue) {
      (mockPrisma as any).emailQueue = {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
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
      recipientEmail: mockClient.email,
      status: 'pending',
      createdAt: new Date(),
    });
    (mockPrisma.communicationHistory.create as jest.Mock).mockResolvedValue({});

    // Mock template engine
    (templateEngine.render as jest.Mock).mockResolvedValue({
      html: '<html>Test Email</html>',
      text: 'Test Email',
      subject: 'Test Subject',
    });
  });

  describe('Business Context Validation', () => {
    it('should validate business exists and is active', async () => {
      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: mockBusinessId },
        select: { id: true, isActive: true },
      });
    });

    it('should fail when business does not exist', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Business not found');
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should fail when business is not active', async () => {
      (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
        ...mockBusiness,
        isActive: false,
      });

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Business is not active');
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should fail when appointment does not belong to business', async () => {
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        businessId: 'different-business-123',
      });

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not belong to this business');
      expect(result.deliveryStatus).toBe('failed');
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation successfully', async () => {
      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('queue-123');
      expect(result.deliveryStatus).toBe('queued');

      // Verify appointment was fetched with correct includes
      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: mockAppointmentId },
        include: expect.objectContaining({
          business: expect.any(Object),
          client: expect.any(Object),
          staff: expect.any(Object),
          services: expect.any(Object),
        }),
      });

      // Verify template was rendered
      expect(templateEngine.render).toHaveBeenCalledWith(
        'booking_confirmation',
        expect.objectContaining({
          businessName: mockBusiness.name,
          clientName: 'John Doe',
          serviceName: 'Haircut',
          staffName: mockStaff.displayName,
        }),
        expect.objectContaining({
          businessId: mockBusinessId,
          businessName: mockBusiness.name,
        })
      );

      // Verify email was queued
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: mockBusinessId,
          appointmentId: mockAppointmentId,
          recipientEmail: mockClient.email,
          templateType: 'booking_confirmation',
          priority: 'high',
          status: 'pending',
        }),
      });
    });

    it('should fail when appointment not found', async () => {
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Appointment not found');
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should fail when client has no email address', async () => {
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        client: null,
        clientEmail: null,
      });

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No email address found for client');
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should respect email preferences when client opts out', async () => {
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue({
        businessId: mockBusinessId,
        email: mockClient.email,
        receiveConfirmations: false,
        receiveReminders: true,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: null,
      });

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('opted out');
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should send confirmation even if client unsubscribed (transactional)', async () => {
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue({
        businessId: mockBusinessId,
        email: mockClient.email,
        receiveConfirmations: true,
        receiveReminders: false,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: new Date(),
      });

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');
    });
  });

  describe('sendAppointmentReminder', () => {
    beforeEach(() => {
      // Set appointment to future date for reminder tests
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days in future

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      });
    });

    it('should send 24h reminder successfully', async () => {
      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');

      expect(templateEngine.render).toHaveBeenCalledWith(
        'appointment_reminder_24h',
        expect.objectContaining({
          reminderType: '24h',
          clientName: 'John Doe',
        }),
        expect.any(Object)
      );

      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateType: 'appointment_reminder_24h',
          priority: 'normal',
        }),
      });
    });

    it('should send 2h reminder successfully', async () => {
      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '2h'
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');

      expect(templateEngine.render).toHaveBeenCalledWith(
        'appointment_reminder_2h',
        expect.objectContaining({
          reminderType: '2h',
        }),
        expect.any(Object)
      );
    });

    it('should not send reminder for cancelled appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        status: AppointmentStatus.CANCELLED,
      });

      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
      expect(mockPrisma.emailQueue.create).not.toHaveBeenCalled();
    });

    it('should not send reminder for completed appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
      });

      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('completed');
      expect(mockPrisma.emailQueue.create).not.toHaveBeenCalled();
    });

    it('should not send reminder for past appointment', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: pastDate,
      });

      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('in the past');
      expect(mockPrisma.emailQueue.create).not.toHaveBeenCalled();
    });

    it('should respect email preferences for reminders', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days in future

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      });

      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue({
        businessId: mockBusinessId,
        email: mockClient.email,
        receiveConfirmations: true,
        receiveReminders: false,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: null,
      });

      const result = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('opted out');
      expect(mockPrisma.emailQueue.create).not.toHaveBeenCalled();
    });
  });

  describe('sendCancellationNotification', () => {
    it('should send cancellation notification successfully', async () => {
      const cancellationReason = 'Client requested cancellation';

      const result = await notificationService.sendCancellationNotification(
        mockAppointmentId,
        mockBusinessId,
        cancellationReason
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');

      expect(templateEngine.render).toHaveBeenCalledWith(
        'cancellation_notification',
        expect.objectContaining({
          clientName: 'John Doe',
          cancellationReason,
        }),
        expect.any(Object)
      );

      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateType: 'cancellation_notification',
          priority: 'high',
        }),
      });
    });

    it('should use appointment cancellation reason if not provided', async () => {
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        cancellationReason: 'Staff unavailable',
      });

      const result = await notificationService.sendCancellationNotification(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);

      expect(templateEngine.render).toHaveBeenCalledWith(
        'cancellation_notification',
        expect.objectContaining({
          cancellationReason: 'Staff unavailable',
        }),
        expect.any(Object)
      );
    });

    it('should send cancellation even if client unsubscribed (transactional)', async () => {
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue({
        businessId: mockBusinessId,
        email: mockClient.email,
        receiveConfirmations: true,
        receiveReminders: false,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: new Date(),
      });

      const result = await notificationService.sendCancellationNotification(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');
    });
  });

  describe('Error Handling', () => {
    it('should handle template rendering errors gracefully', async () => {
      (templateEngine.render as jest.Mock).mockRejectedValue(
        new Error('Template rendering failed')
      );

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.deliveryStatus).toBe('failed');
    });

    it('should handle queue errors gracefully', async () => {
      (mockPrisma.emailQueue.create as jest.Mock).mockRejectedValue(
        new Error('Queue is full')
      );

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.deliveryStatus).toBe('failed');
    });

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
  });

  describe('Email Preference Checking', () => {
    it('should allow all emails when no preferences exist', async () => {
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      expect(result.success).toBe(true);
    });

    it('should handle preference check errors gracefully (fail open)', async () => {
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await notificationService.sendBookingConfirmation(
        mockAppointmentId,
        mockBusinessId
      );

      // Should still send email on preference check error (fail open for transactional)
      expect(result.success).toBe(true);
    });
  });
});
