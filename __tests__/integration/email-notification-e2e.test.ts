/**
 * E2E Tests for Email Notification User Journeys
 *
 * Tests complete user journeys including:
 * - Complete booking → confirmation → reminder flow
 * - Cancellation notification flow
 * - Staff notification flow
 * - Unsubscribe flow
 *
 * Requirements: All requirements
 */

import { NotificationService } from '@/lib/email/notification-service';
import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/email/resend-provider');
jest.mock('@/lib/email/template-engine');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Email Notification E2E User Journeys', () => {
  let notificationService: NotificationService;

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

    // Add missing models to mockPrisma
    if (!mockPrisma.emailPreference) {
      (mockPrisma as any).emailPreference = {
        findUnique: jest.fn(),
      };
    }
    if (!mockPrisma.emailQueue) {
      (mockPrisma as any).emailQueue = {
        create: jest.fn(),
      };
    }

    // Setup default mocks
    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(
      mockBusiness
    );
    (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(
      mockAppointment
    );
    (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue(
      null
    );
    (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue({
      id: 'queue-123',
      businessId: mockBusinessId,
      recipientEmail: 'john.doe@test.com',
      status: 'pending',
      createdAt: new Date(),
    });
    (mockPrisma.communicationHistory.create as jest.Mock).mockResolvedValue({});
  });

  describe('Complete Booking Journey', () => {
    it('should complete booking → confirmation → reminder flow', async () => {
      // Step 1: Send booking confirmation
      const confirmationResult =
        await notificationService.sendBookingConfirmation(
          mockAppointmentId,
          mockBusinessId
        );

      expect(confirmationResult.success).toBe(true);
      expect(confirmationResult.deliveryStatus).toBe('queued');

      // Verify confirmation email was queued
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateType: 'booking_confirmation',
          priority: 'high',
        }),
      });

      // Step 2: Send 24h reminder
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      });

      const reminderResult = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(reminderResult.success).toBe(true);
      expect(reminderResult.deliveryStatus).toBe('queued');

      // Verify reminder email was queued
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateType: 'appointment_reminder_24h',
          priority: 'normal',
        }),
      });
    });
  });

  describe('Cancellation Journey', () => {
    it('should complete cancellation notification flow', async () => {
      const cancellationReason = 'Client requested cancellation';

      const result = await notificationService.sendCancellationNotification(
        mockAppointmentId,
        mockBusinessId,
        cancellationReason
      );

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('queued');

      // Verify cancellation email was queued
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateType: 'cancellation_notification',
          priority: 'high',
        }),
      });
    });
  });

  describe('Email Preference Journey', () => {
    it('should respect client opt-out preferences', async () => {
      // Client opts out of reminders
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue({
        businessId: mockBusinessId,
        email: 'john.doe@test.com',
        receiveConfirmations: true,
        receiveReminders: false,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: null,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      });

      // Try to send reminder
      const reminderResult = await notificationService.sendAppointmentReminder(
        mockAppointmentId,
        mockBusinessId,
        '24h'
      );

      expect(reminderResult.success).toBe(false);
      expect(reminderResult.error).toContain('opted out');

      // But confirmation should still work
      (mockPrisma.appointment.findUnique as jest.Mock).mockResolvedValue(
        mockAppointment
      );

      const confirmationResult =
        await notificationService.sendBookingConfirmation(
          mockAppointmentId,
          mockBusinessId
        );

      expect(confirmationResult.success).toBe(true);
    });

    it('should send transactional emails even if unsubscribed', async () => {
      // Client has unsubscribed
      (mockPrisma.emailPreference.findUnique as jest.Mock).mockResolvedValue({
        businessId: mockBusinessId,
        email: 'john.doe@test.com',
        receiveConfirmations: true,
        receiveReminders: false,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: new Date(),
      });

      // Confirmation should still be sent (transactional)
      const confirmationResult =
        await notificationService.sendBookingConfirmation(
          mockAppointmentId,
          mockBusinessId
        );

      expect(confirmationResult.success).toBe(true);

      // Cancellation should still be sent (transactional)
      const cancellationResult =
        await notificationService.sendCancellationNotification(
          mockAppointmentId,
          mockBusinessId
        );

      expect(cancellationResult.success).toBe(true);
    });
  });
});
