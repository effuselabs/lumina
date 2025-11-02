/**
 * Notification Service
 * Core business logic for email notification management
 * 
 * Handles all notification types including:
 * - Booking confirmations
 * - Appointment reminders (24h and 2h)
 * - Cancellation notifications
 * - Staff notifications
 * - Daily booking summaries
 */

import { prisma } from '@/lib/prisma';
import { templateEngine } from './template-engine';
import { ResendEmailProvider } from './resend-provider';
import type { EmailProvider, EmailTemplateType } from './types';
import type {
  BookingConfirmationData,
  AppointmentReminderData,
  CancellationNotificationData,
  StaffBookingAlertData,
  StaffCancellationAlertData,
  DailyBookingSummaryData,
} from './templates';

/**
 * Result of a notification operation
 */
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  error?: string;
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
}

/**
 * Appointment changes for modification notifications
 */
export interface AppointmentChanges {
  oldStartTime?: Date;
  newStartTime?: Date;
  oldStaffId?: string;
  newStaffId?: string;
  oldServices?: string[];
  newServices?: string[];
  reason?: string;
}

/**
 * Filters for notification history queries
 */
export interface NotificationFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  templateType?: EmailTemplateType;
  limit?: number;
  offset?: number;
}

/**
 * Notification history record
 */
export interface NotificationHistory {
  id: string;
  businessId: string;
  appointmentId?: string;
  recipientEmail: string;
  recipientName?: string;
  templateType: string;
  subject: string;
  status: string;
  attemptCount: number;
  sentAt?: Date;
  failureReason?: string;
  createdAt: Date;
}

/**
 * Notification Service Error Codes
 */
export enum NotificationErrorCode {
  INVALID_BUSINESS_CONTEXT = 'INVALID_BUSINESS_CONTEXT',
  APPOINTMENT_NOT_FOUND = 'APPOINTMENT_NOT_FOUND',
  CLIENT_NOT_FOUND = 'CLIENT_NOT_FOUND',
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  TEMPLATE_RENDER_ERROR = 'TEMPLATE_RENDER_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
  PREFERENCE_CHECK_FAILED = 'PREFERENCE_CHECK_FAILED',
}

/**
 * Custom error class for notification errors
 */
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: NotificationErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

/**
 * Notification Service Configuration
 */
export interface NotificationServiceConfig {
  emailProvider?: EmailProvider;
  fromEmail?: string;
  fromName?: string;
  enableQueue?: boolean;
}

/**
 * Helper function to convert null to undefined
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Notification Service
 * Orchestrates email notification creation and delivery
 */
export class NotificationService {
  private emailProvider: EmailProvider;
  private fromEmail: string;
  private fromName: string;
  private enableQueue: boolean;

  constructor(config?: NotificationServiceConfig) {
    // Initialize email provider (default to Resend)
    this.emailProvider = config?.emailProvider || new ResendEmailProvider({
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: config?.fromEmail || process.env.EMAIL_FROM,
      fromName: config?.fromName || process.env.EMAIL_FROM_NAME || 'Lumina',
    });

    this.fromEmail = config?.fromEmail || process.env.EMAIL_FROM || 'noreply@uselumina.app';
    this.fromName = config?.fromName || process.env.EMAIL_FROM_NAME || 'Lumina';
    this.enableQueue = config?.enableQueue !== false; // Default to true
  }

  /**
   * Validate business context
   * Ensures the business exists and is active
   */
  private async validateBusinessContext(businessId: string): Promise<void> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, isActive: true },
    });

    if (!business) {
      throw new NotificationError(
        `Business not found: ${businessId}`,
        NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
        { businessId }
      );
    }

    if (!business.isActive) {
      throw new NotificationError(
        `Business is not active: ${businessId}`,
        NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
        { businessId, isActive: false }
      );
    }
  }

  /**
   * Check if client has opted out of specific email types
   */
  private async checkEmailPreferences(
    businessId: string,
    email: string,
    templateType: EmailTemplateType
  ): Promise<boolean> {
    try {
      const preferences = await prisma.emailPreference.findUnique({
        where: {
          businessId_email: {
            businessId,
            email,
          },
        },
      });

      // If no preferences found, allow all emails by default
      if (!preferences) {
        return true;
      }

      // Check if user has unsubscribed completely
      if (preferences.unsubscribedAt) {
        // Always allow transactional emails (confirmations, cancellations)
        if (
          templateType === 'booking_confirmation' ||
          templateType === 'cancellation_notification'
        ) {
          return true;
        }
        return false;
      }

      // Check specific preferences based on template type
      switch (templateType) {
        case 'booking_confirmation':
          return preferences.receiveConfirmations;
        case 'appointment_reminder_24h':
        case 'appointment_reminder_2h':
          return preferences.receiveReminders;
        case 'cancellation_notification':
          return preferences.receiveCancellations;
        case 'staff_booking_alert':
        case 'staff_cancellation_alert':
        case 'daily_booking_summary':
          // Staff notifications are always sent
          return true;
        default:
          return preferences.receiveMarketing;
      }
    } catch (error) {
      console.error('[NotificationService] Error checking email preferences', {
        businessId,
        email,
        templateType,
        error: error instanceof Error ? error.message : String(error),
      });
      // On error, allow the email to be sent (fail open for transactional emails)
      return true;
    }
  }

  /**
   * Queue an email for delivery
   */
  private async queueEmail(
    businessId: string,
    appointmentId: string | undefined,
    recipientEmail: string,
    recipientName: string | undefined,
    templateType: EmailTemplateType,
    subject: string,
    html: string,
    text: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const queueEntry = await prisma.emailQueue.create({
        data: {
          businessId,
          appointmentId,
          recipientEmail,
          recipientName,
          templateType,
          subject,
          htmlContent: html,
          textContent: text,
          priority,
          status: 'pending',
          metadata,
        },
      });

      console.log('[NotificationService] Email queued', {
        queueId: queueEntry.id,
        businessId,
        recipientEmail,
        templateType,
      });

      return queueEntry.id;
    } catch (error) {
      console.error('[NotificationService] Failed to queue email', {
        businessId,
        recipientEmail,
        templateType,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new NotificationError(
        'Failed to queue email',
        NotificationErrorCode.QUEUE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Log notification to communication history
   */
  private async logCommunication(
    businessId: string,
    clientId: string | undefined,
    appointmentId: string | undefined,
    templateType: EmailTemplateType,
    subject: string,
    content: string,
    recipientEmail: string
  ): Promise<void> {
    try {
      // Only log if we have a clientId
      if (!clientId) {
        return;
      }

      await prisma.communicationHistory.create({
        data: {
          businessId,
          clientId,
          appointmentId,
          type: 'EMAIL',
          direction: 'OUTBOUND',
          channel: 'EMAIL',
          subject,
          content,
          status: 'SENT',
          automationType: this.mapTemplateTypeToAutomationType(templateType),
        },
      });
    } catch (error) {
      // Log error but don't throw - communication history is not critical
      console.error('[NotificationService] Failed to log communication', {
        businessId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Map template type to automation type for communication history
   */
  private mapTemplateTypeToAutomationType(
    templateType: EmailTemplateType
  ): 'APPOINTMENT_CONFIRMATION' | 'APPOINTMENT_REMINDER' | 'CANCELLATION_NOTICE' | 'PROMOTIONAL' {
    switch (templateType) {
      case 'booking_confirmation':
        return 'APPOINTMENT_CONFIRMATION';
      case 'appointment_reminder_24h':
      case 'appointment_reminder_2h':
        return 'APPOINTMENT_REMINDER';
      case 'cancellation_notification':
        return 'CANCELLATION_NOTICE';
      default:
        return 'PROMOTIONAL';
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    appointmentId: string,
    businessId: string
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch appointment with all related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              phone: true,
              email: true,
              logo: true,
              primaryColor: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotificationError(
          `Appointment not found: ${appointmentId}`,
          NotificationErrorCode.APPOINTMENT_NOT_FOUND,
          { appointmentId, businessId }
        );
      }

      // Verify appointment belongs to the business
      if (appointment.businessId !== businessId) {
        throw new NotificationError(
          'Appointment does not belong to this business',
          NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
          { appointmentId, businessId, actualBusinessId: appointment.businessId }
        );
      }

      // Determine recipient email
      const recipientEmail = appointment.client?.email || appointment.clientEmail || undefined;
      const recipientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || undefined;

      if (!recipientEmail) {
        throw new NotificationError(
          'No email address found for client',
          NotificationErrorCode.INVALID_RECIPIENT,
          { appointmentId, clientId: appointment.clientId }
        );
      }

      // Check email preferences
      const canSend = await this.checkEmailPreferences(
        businessId,
        recipientEmail,
        'booking_confirmation'
      );

      if (!canSend) {
        console.log('[NotificationService] Client has opted out of confirmations', {
          appointmentId,
          recipientEmail,
        });
        return {
          success: false,
          error: 'Client has opted out of confirmation emails',
          deliveryStatus: 'failed',
        };
      }

      // Build business address
      const businessAddress = [
        appointment.business.address,
        appointment.business.city,
        appointment.business.state,
        appointment.business.zipCode,
      ]
        .filter(Boolean)
        .join(', ');

      // Build services list
      const services = appointment.services.map((as) => ({
        name: as.serviceName,
        price: as.price.toNumber(),
        duration: as.duration,
      }));

      // Generate cancellation link
      const cancellationLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking/cancel/${appointment.id}`;

      // Prepare template data
      const templateData: BookingConfirmationData = {
        businessName: appointment.business.name,
        businessAddress,
        businessPhone: appointment.business.phone || undefined,
        businessLogoUrl: nullToUndefined(appointment.business.logo),
        primaryColor: appointment.business.primaryColor || '#FFD25A',
        clientName: recipientName || 'Valued Client',
        appointmentDate: appointment.startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appointmentTime: appointment.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        serviceName: services.map((s) => s.name).join(', '),
        servicePrice: `$${appointment.totalPrice.toNumber().toFixed(2)}`,
        staffName: appointment.staff.displayName,
        cancellationLink,
      };

      // Render email template
      const rendered = await templateEngine.render(
        'booking_confirmation',
        templateData,
        {
          businessId: appointment.business.id,
          businessName: appointment.business.name,
          logoUrl: nullToUndefined(appointment.business.logo),
          primaryColor: nullToUndefined(appointment.business.primaryColor),
        }
      );

      // Queue email for delivery
      const queueId = await this.queueEmail(
        businessId,
        appointmentId,
        recipientEmail,
        recipientName,
        'booking_confirmation',
        rendered.subject,
        rendered.html,
        rendered.text,
        'high', // Confirmations are high priority
        {
          appointmentId,
          clientId: appointment.clientId,
          staffId: appointment.staffId,
        }
      );

      // Log to communication history
      await this.logCommunication(
        businessId,
        nullToUndefined(appointment.clientId),
        appointmentId,
        'booking_confirmation',
        rendered.subject,
        rendered.text,
        recipientEmail
      );

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send booking confirmation', {
        appointmentId,
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Send appointment reminder email
   */
  async sendAppointmentReminder(
    appointmentId: string,
    businessId: string,
    reminderType: '24h' | '2h'
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch appointment with all related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              phone: true,
              email: true,
              logo: true,
              primaryColor: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotificationError(
          `Appointment not found: ${appointmentId}`,
          NotificationErrorCode.APPOINTMENT_NOT_FOUND,
          { appointmentId, businessId }
        );
      }

      // Verify appointment belongs to the business
      if (appointment.businessId !== businessId) {
        throw new NotificationError(
          'Appointment does not belong to this business',
          NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
          { appointmentId, businessId, actualBusinessId: appointment.businessId }
        );
      }

      // Check if appointment is still active (not cancelled or completed)
      if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
        console.log('[NotificationService] Skipping reminder for inactive appointment', {
          appointmentId,
          status: appointment.status,
        });
        return {
          success: false,
          error: `Appointment is ${appointment.status.toLowerCase()}`,
          deliveryStatus: 'failed',
        };
      }

      // Check if appointment is in the past
      if (appointment.startTime < new Date()) {
        console.log('[NotificationService] Skipping reminder for past appointment', {
          appointmentId,
          startTime: appointment.startTime,
        });
        return {
          success: false,
          error: 'Appointment is in the past',
          deliveryStatus: 'failed',
        };
      }

      // Determine recipient email
      const recipientEmail = appointment.client?.email || appointment.clientEmail || undefined;
      const recipientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || undefined;

      if (!recipientEmail) {
        throw new NotificationError(
          'No email address found for client',
          NotificationErrorCode.INVALID_RECIPIENT,
          { appointmentId, clientId: appointment.clientId }
        );
      }

      // Check email preferences
      const templateType = reminderType === '24h' ? 'appointment_reminder_24h' : 'appointment_reminder_2h';
      const canSend = await this.checkEmailPreferences(
        businessId,
        recipientEmail,
        templateType
      );

      if (!canSend) {
        console.log('[NotificationService] Client has opted out of reminders', {
          appointmentId,
          recipientEmail,
          reminderType,
        });
        return {
          success: false,
          error: 'Client has opted out of reminder emails',
          deliveryStatus: 'failed',
        };
      }

      // Build business address
      const businessAddress = [
        appointment.business.address,
        appointment.business.city,
        appointment.business.state,
        appointment.business.zipCode,
      ]
        .filter(Boolean)
        .join(', ');

      // Build services list
      const services = appointment.services.map((as) => ({
        name: as.serviceName,
        price: as.price.toNumber(),
        duration: as.duration,
      }));

      // Generate reschedule and cancellation links
      const rescheduleLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking/reschedule/${appointment.id}`;
      const cancellationLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking/cancel/${appointment.id}`;

      // Prepare template data
      const templateData: AppointmentReminderData = {
        businessName: appointment.business.name,
        businessAddress,
        businessPhone: appointment.business.phone || undefined,
        businessLogoUrl: nullToUndefined(appointment.business.logo),
        primaryColor: appointment.business.primaryColor || '#FFD25A',
        clientName: recipientName || 'Valued Client',
        appointmentDate: appointment.startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appointmentTime: appointment.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        serviceName: services.map((s) => s.name).join(', '),
        staffName: appointment.staff.displayName,
        reminderType,
        rescheduleLink,
        cancellationLink,
      };

      // Render email template
      const rendered = await templateEngine.render(
        templateType,
        templateData,
        {
          businessId: appointment.business.id,
          businessName: appointment.business.name,
          logoUrl: nullToUndefined(appointment.business.logo),
          primaryColor: nullToUndefined(appointment.business.primaryColor),
        }
      );

      // Queue email for delivery
      const queueId = await this.queueEmail(
        businessId,
        appointmentId,
        recipientEmail,
        recipientName,
        templateType,
        rendered.subject,
        rendered.html,
        rendered.text,
        'normal', // Reminders are normal priority
        {
          appointmentId,
          clientId: appointment.clientId,
          staffId: appointment.staffId,
          reminderType,
        }
      );

      // Log to communication history
      await this.logCommunication(
        businessId,
        nullToUndefined(appointment.clientId),
        appointmentId,
        templateType,
        rendered.subject,
        rendered.text,
        recipientEmail
      );

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send appointment reminder', {
        appointmentId,
        businessId,
        reminderType,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Send cancellation notification email
   */
  async sendCancellationNotification(
    appointmentId: string,
    businessId: string,
    reason?: string
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch appointment with all related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              phone: true,
              email: true,
              logo: true,
              primaryColor: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotificationError(
          `Appointment not found: ${appointmentId}`,
          NotificationErrorCode.APPOINTMENT_NOT_FOUND,
          { appointmentId, businessId }
        );
      }

      // Verify appointment belongs to the business
      if (appointment.businessId !== businessId) {
        throw new NotificationError(
          'Appointment does not belong to this business',
          NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
          { appointmentId, businessId, actualBusinessId: appointment.businessId }
        );
      }

      // Determine recipient email (client)
      const recipientEmail = appointment.client?.email || appointment.clientEmail || undefined;
      const recipientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || undefined;

      if (!recipientEmail) {
        throw new NotificationError(
          'No email address found for client',
          NotificationErrorCode.INVALID_RECIPIENT,
          { appointmentId, clientId: appointment.clientId }
        );
      }

      // Check email preferences
      const canSend = await this.checkEmailPreferences(
        businessId,
        recipientEmail,
        'cancellation_notification'
      );

      if (!canSend) {
        console.log('[NotificationService] Client has opted out of cancellation notifications', {
          appointmentId,
          recipientEmail,
        });
        return {
          success: false,
          error: 'Client has opted out of cancellation emails',
          deliveryStatus: 'failed',
        };
      }

      // Build business address
      const businessAddress = [
        appointment.business.address,
        appointment.business.city,
        appointment.business.state,
        appointment.business.zipCode,
      ]
        .filter(Boolean)
        .join(', ');

      // Build services list
      const services = appointment.services.map((as) => ({
        name: as.serviceName,
        price: as.price.toNumber(),
        duration: as.duration,
      }));

      // Generate rebook link
      const rebookLink = `${process.env.NEXT_PUBLIC_APP_URL}/book/${appointment.business.id}`;

      // Prepare template data
      const templateData: CancellationNotificationData = {
        businessName: appointment.business.name,
        businessAddress,
        businessPhone: appointment.business.phone || undefined,
        businessLogoUrl: nullToUndefined(appointment.business.logo),
        primaryColor: appointment.business.primaryColor || '#FFD25A',
        clientName: recipientName || 'Valued Client',
        appointmentDate: appointment.startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appointmentTime: appointment.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        serviceName: services.map((s) => s.name).join(', '),
        staffName: appointment.staff.displayName,
        cancellationReason: reason || appointment.cancellationReason || undefined,
        rebookLink,
      };

      // Render email template
      const rendered = await templateEngine.render(
        'cancellation_notification',
        templateData,
        {
          businessId: appointment.business.id,
          businessName: appointment.business.name,
          logoUrl: nullToUndefined(appointment.business.logo),
          primaryColor: nullToUndefined(appointment.business.primaryColor),
        }
      );

      // Queue email for delivery to client
      const queueId = await this.queueEmail(
        businessId,
        appointmentId,
        recipientEmail,
        recipientName,
        'cancellation_notification',
        rendered.subject,
        rendered.html,
        rendered.text,
        'high', // Cancellations are high priority
        {
          appointmentId,
          clientId: appointment.clientId,
          staffId: appointment.staffId,
          cancellationReason: reason,
        }
      );

      // Log to communication history
      await this.logCommunication(
        businessId,
        nullToUndefined(appointment.clientId),
        appointmentId,
        'cancellation_notification',
        rendered.subject,
        rendered.text,
        recipientEmail
      );

      // Also send cancellation alert to staff member
      if (appointment.staff.user?.email) {
        try {
          await this.sendStaffCancellationAlert(
            appointmentId,
            appointment.staffId,
            businessId
          );
        } catch (error) {
          // Log error but don't fail the client notification
          console.error('[NotificationService] Failed to send staff cancellation alert', {
            appointmentId,
            staffId: appointment.staffId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send cancellation notification', {
        appointmentId,
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Send modification notification email
   */
  async sendModificationNotification(
    appointmentId: string,
    businessId: string,
    changes: AppointmentChanges
  ): Promise<NotificationResult> {
    // TODO: Implement modification notification
    throw new Error('Not implemented yet');
  }

  /**
   * Send staff booking alert email
   */
  async sendStaffBookingAlert(
    appointmentId: string,
    staffId: string,
    businessId: string
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch appointment with all related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              logo: true,
              primaryColor: true,
            },
          },
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotificationError(
          `Appointment not found: ${appointmentId}`,
          NotificationErrorCode.APPOINTMENT_NOT_FOUND,
          { appointmentId, businessId }
        );
      }

      // Fetch staff member with email
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      if (!staff) {
        throw new NotificationError(
          `Staff member not found: ${staffId}`,
          NotificationErrorCode.STAFF_NOT_FOUND,
          { staffId, businessId }
        );
      }

      if (!staff.user?.email) {
        throw new NotificationError(
          'No email address found for staff member',
          NotificationErrorCode.INVALID_RECIPIENT,
          { staffId }
        );
      }

      // Build client name
      const clientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || 'Walk-in Client';

      // Build services list
      const services = appointment.services.map((as) => ({
        name: as.serviceName,
        price: as.price.toNumber(),
        duration: as.duration,
      }));

      // Generate view appointment link
      const viewAppointmentLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments/${appointment.id}`;

      // Prepare template data
      const templateData: StaffBookingAlertData = {
        businessName: appointment.business.name,
        businessLogoUrl: nullToUndefined(appointment.business.logo),
        primaryColor: appointment.business.primaryColor || '#FFD25A',
        staffName: staff.displayName,
        clientName,
        clientPhone: appointment.client?.phone || appointment.clientPhone || undefined,
        clientEmail: appointment.client?.email || appointment.clientEmail || undefined,
        appointmentDate: appointment.startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appointmentTime: appointment.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        serviceName: services.map((s) => s.name).join(', '),
        servicePrice: `$${appointment.totalPrice.toNumber().toFixed(2)}`,
        specialRequests: appointment.notes || undefined,
        viewAppointmentLink,
      };

      // Render email template
      const rendered = await templateEngine.render(
        'staff_booking_alert',
        templateData,
        {
          businessId: appointment.business.id,
          businessName: appointment.business.name,
          logoUrl: nullToUndefined(appointment.business.logo),
          primaryColor: nullToUndefined(appointment.business.primaryColor),
        }
      );

      // Queue email for delivery
      const queueId = await this.queueEmail(
        businessId,
        appointmentId,
        staff.user.email,
        staff.displayName,
        'staff_booking_alert',
        rendered.subject,
        rendered.html,
        rendered.text,
        'normal',
        {
          appointmentId,
          staffId,
          clientId: appointment.clientId,
        }
      );

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send staff booking alert', {
        appointmentId,
        staffId,
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Send staff cancellation alert email
   */
  async sendStaffCancellationAlert(
    appointmentId: string,
    staffId: string,
    businessId: string
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch appointment with all related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              logo: true,
              primaryColor: true,
            },
          },
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotificationError(
          `Appointment not found: ${appointmentId}`,
          NotificationErrorCode.APPOINTMENT_NOT_FOUND,
          { appointmentId, businessId }
        );
      }

      // Fetch staff member with email
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      if (!staff) {
        throw new NotificationError(
          `Staff member not found: ${staffId}`,
          NotificationErrorCode.STAFF_NOT_FOUND,
          { staffId, businessId }
        );
      }

      if (!staff.user?.email) {
        throw new NotificationError(
          'No email address found for staff member',
          NotificationErrorCode.INVALID_RECIPIENT,
          { staffId }
        );
      }

      // Build client name
      const clientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || 'Walk-in Client';

      // Build services list
      const services = appointment.services.map((as) => ({
        name: as.serviceName,
        duration: as.duration,
      }));

      // Generate view schedule link
      const viewScheduleLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/schedule`;

      // Prepare template data
      const templateData: StaffCancellationAlertData = {
        businessName: appointment.business.name,
        businessLogoUrl: nullToUndefined(appointment.business.logo),
        primaryColor: appointment.business.primaryColor || '#FFD25A',
        staffName: staff.displayName,
        clientName,
        appointmentDate: appointment.startTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appointmentTime: appointment.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        serviceName: services.map((s) => s.name).join(', '),
        cancellationReason: appointment.cancellationReason || undefined,
        viewScheduleLink,
      };

      // Render email template
      const rendered = await templateEngine.render(
        'staff_cancellation_alert',
        templateData,
        {
          businessId: appointment.business.id,
          businessName: appointment.business.name,
          logoUrl: nullToUndefined(appointment.business.logo),
          primaryColor: nullToUndefined(appointment.business.primaryColor),
        }
      );

      // Queue email for delivery
      const queueId = await this.queueEmail(
        businessId,
        appointmentId,
        staff.user.email,
        staff.displayName,
        'staff_cancellation_alert',
        rendered.subject,
        rendered.html,
        rendered.text,
        'normal',
        {
          appointmentId,
          staffId,
          clientId: appointment.clientId,
        }
      );

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send staff cancellation alert', {
        appointmentId,
        staffId,
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Send daily booking summary email
   */
  async sendDailyBookingSummary(
    businessId: string,
    date: Date
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch business with owner information
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          users: {
            where: {
              role: 'OWNER',
            },
            include: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!business) {
        throw new NotificationError(
          `Business not found: ${businessId}`,
          NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
          { businessId }
        );
      }

      // Get business owner email
      const owner = business.users.find((bu) => bu.role === 'OWNER');
      if (!owner?.user?.email) {
        throw new NotificationError(
          'No owner email found for business',
          NotificationErrorCode.INVALID_RECIPIENT,
          { businessId }
        );
      }

      // Set date range for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch appointments for the day
      const appointments = await prisma.appointment.findMany({
        where: {
          businessId,
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          staff: {
            select: {
              displayName: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Calculate total revenue
      const totalRevenue = appointments.reduce(
        (sum, apt) => sum + apt.totalPrice.toNumber(),
        0
      );

      // Build appointments list
      const appointmentsList = appointments.map((apt) => ({
        time: apt.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        clientName: apt.client
          ? `${apt.client.firstName} ${apt.client.lastName}`
          : apt.clientName || 'Walk-in',
        serviceName: apt.services.map((s) => s.serviceName).join(', '),
        staffName: apt.staff.displayName,
        price: `$${apt.totalPrice.toNumber().toFixed(2)}`,
      }));

      // Generate view dashboard link
      const viewDashboardLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

      // Prepare template data
      const templateData: DailyBookingSummaryData = {
        businessName: business.name,
        businessLogoUrl: nullToUndefined(business.logo),
        primaryColor: business.primaryColor || '#FFD25A',
        recipientName: owner.user.name || 'Business Owner',
        date: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalAppointments: appointments.length,
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        appointments: appointmentsList,
        viewDashboardLink,
      };

      // Render email template
      const rendered = await templateEngine.render(
        'daily_booking_summary',
        templateData,
        {
          businessId: business.id,
          businessName: business.name,
          logoUrl: nullToUndefined(business.logo),
          primaryColor: nullToUndefined(business.primaryColor),
        }
      );

      // Queue email for delivery
      const queueId = await this.queueEmail(
        businessId,
        undefined,
        owner.user.email,
        owner.user.name || undefined,
        'daily_booking_summary',
        rendered.subject,
        rendered.html,
        rendered.text,
        'low', // Summaries are low priority
        {
          date: date.toISOString(),
          totalAppointments: appointments.length,
          totalRevenue,
        }
      );

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send daily booking summary', {
        businessId,
        date,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(
    businessId: string,
    recipientEmail: string,
    templateType: EmailTemplateType
  ): Promise<NotificationResult> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Fetch business data for branding
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          email: true,
          logo: true,
          primaryColor: true,
        },
      });

      if (!business) {
        throw new NotificationError(
          `Business not found: ${businessId}`,
          NotificationErrorCode.INVALID_BUSINESS_CONTEXT,
          { businessId }
        );
      }

      // Build business address
      const businessAddress = [
        business.address,
        business.city,
        business.state,
        business.zipCode,
      ]
        .filter(Boolean)
        .join(', ');

      // Generate test data based on template type
      let templateData: any;
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1); // Tomorrow

      switch (templateType) {
        case 'booking_confirmation':
          templateData = {
            businessName: business.name,
            businessAddress,
            businessPhone: business.phone || undefined,
            businessLogoUrl: nullToUndefined(business.logo),
            primaryColor: business.primaryColor || '#FFD25A',
            clientName: 'Test Client',
            appointmentDate: testDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            appointmentTime: '10:00 AM',
            serviceName: 'Test Service',
            servicePrice: '50.00',
            staffName: 'Test Staff Member',
            cancellationLink: `${process.env.NEXT_PUBLIC_APP_URL}/booking/cancel/test`,
          };
          break;

        case 'appointment_reminder_24h':
        case 'appointment_reminder_2h':
          templateData = {
            businessName: business.name,
            businessAddress,
            businessPhone: business.phone || undefined,
            businessLogoUrl: nullToUndefined(business.logo),
            primaryColor: business.primaryColor || '#FFD25A',
            clientName: 'Test Client',
            appointmentDate: testDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            appointmentTime: '10:00 AM',
            serviceName: 'Test Service',
            staffName: 'Test Staff Member',
            reminderType: templateType === 'appointment_reminder_24h' ? '24h' : '2h',
            rescheduleLink: `${process.env.NEXT_PUBLIC_APP_URL}/booking/reschedule/test`,
            cancellationLink: `${process.env.NEXT_PUBLIC_APP_URL}/booking/cancel/test`,
          };
          break;

        case 'cancellation_notification':
          templateData = {
            businessName: business.name,
            businessAddress,
            businessPhone: business.phone || undefined,
            businessLogoUrl: nullToUndefined(business.logo),
            primaryColor: business.primaryColor || '#FFD25A',
            clientName: 'Test Client',
            appointmentDate: testDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            appointmentTime: '10:00 AM',
            serviceName: 'Test Service',
            staffName: 'Test Staff Member',
            cancellationReason: 'This is a test cancellation',
            rebookLink: `${process.env.NEXT_PUBLIC_APP_URL}/book/${businessId}`,
          };
          break;

        case 'staff_booking_alert':
          templateData = {
            businessName: business.name,
            businessLogoUrl: nullToUndefined(business.logo),
            primaryColor: business.primaryColor || '#FFD25A',
            staffName: 'Test Staff Member',
            clientName: 'Test Client',
            clientPhone: '(555) 123-4567',
            clientEmail: 'test@example.com',
            appointmentDate: testDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            appointmentTime: '10:00 AM',
            serviceName: 'Test Service',
            servicePrice: '50.00',
            specialRequests: 'This is a test booking alert',
            viewAppointmentLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments/test`,
          };
          break;

        case 'staff_cancellation_alert':
          templateData = {
            businessName: business.name,
            businessLogoUrl: nullToUndefined(business.logo),
            primaryColor: business.primaryColor || '#FFD25A',
            staffName: 'Test Staff Member',
            clientName: 'Test Client',
            appointmentDate: testDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            appointmentTime: '10:00 AM',
            serviceName: 'Test Service',
            cancellationReason: 'This is a test cancellation',
            viewScheduleLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/schedule`,
          };
          break;

        case 'daily_booking_summary':
          templateData = {
            businessName: business.name,
            businessLogoUrl: nullToUndefined(business.logo),
            primaryColor: business.primaryColor || '#FFD25A',
            recipientName: 'Business Owner',
            date: testDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            totalAppointments: 3,
            totalRevenue: '150.00',
            appointments: [
              {
                time: '9:00 AM',
                clientName: 'Test Client 1',
                serviceName: 'Test Service 1',
                staffName: 'Test Staff 1',
                price: '50.00',
              },
              {
                time: '11:00 AM',
                clientName: 'Test Client 2',
                serviceName: 'Test Service 2',
                staffName: 'Test Staff 2',
                price: '60.00',
              },
              {
                time: '2:00 PM',
                clientName: 'Test Client 3',
                serviceName: 'Test Service 3',
                staffName: 'Test Staff 3',
                price: '40.00',
              },
            ],
            viewDashboardLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          };
          break;

        default:
          throw new NotificationError(
            `Unsupported template type: ${templateType}`,
            NotificationErrorCode.TEMPLATE_RENDER_ERROR,
            { templateType }
          );
      }

      // Render email template
      const rendered = await templateEngine.render(
        templateType,
        templateData,
        {
          businessId: business.id,
          businessName: business.name,
          logoUrl: nullToUndefined(business.logo),
          primaryColor: nullToUndefined(business.primaryColor),
        }
      );

      // Queue email for delivery
      const queueId = await this.queueEmail(
        businessId,
        undefined, // No appointment ID for test emails
        recipientEmail,
        'Test Recipient',
        templateType,
        `[TEST] ${rendered.subject}`,
        rendered.html,
        rendered.text,
        'high', // Test emails are high priority
        {
          isTest: true,
          templateType,
        }
      );

      console.log('[NotificationService] Test email queued', {
        businessId,
        recipientEmail,
        templateType,
        queueId,
      });

      return {
        success: true,
        notificationId: queueId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to send test email', {
        businessId,
        recipientEmail,
        templateType,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    businessId: string,
    filters: NotificationFilters = {}
  ): Promise<NotificationHistory[]> {
    // TODO: Implement notification history retrieval
    throw new Error('Not implemented yet');
  }

  /**
   * Retry failed notification
   */
  async retryFailedNotification(notificationId: string): Promise<NotificationResult> {
    try {
      // Fetch notification from queue
      const notification = await prisma.emailQueue.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new NotificationError(
          `Notification not found: ${notificationId}`,
          NotificationErrorCode.QUEUE_ERROR,
          { notificationId }
        );
      }

      // Validate business context
      await this.validateBusinessContext(notification.businessId);

      // Check if notification can be retried
      if (notification.status === 'sent' || notification.status === 'delivered') {
        throw new NotificationError(
          'Cannot retry a successfully delivered notification',
          NotificationErrorCode.QUEUE_ERROR,
          { notificationId, status: notification.status }
        );
      }

      if (notification.attemptCount >= notification.maxAttempts) {
        throw new NotificationError(
          'Maximum retry attempts reached',
          NotificationErrorCode.QUEUE_ERROR,
          { notificationId, attemptCount: notification.attemptCount, maxAttempts: notification.maxAttempts }
        );
      }

      // Reset notification status to pending for retry
      await prisma.emailQueue.update({
        where: { id: notificationId },
        data: {
          status: 'pending',
          scheduledAt: new Date(), // Schedule for immediate processing
          failureReason: null, // Clear previous failure reason
        },
      });

      console.log('[NotificationService] Notification queued for retry', {
        notificationId,
        businessId: notification.businessId,
        attemptCount: notification.attemptCount,
      });

      return {
        success: true,
        notificationId,
        deliveryStatus: 'queued',
      };
    } catch (error) {
      console.error('[NotificationService] Failed to retry notification', {
        notificationId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationError) {
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
