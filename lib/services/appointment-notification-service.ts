/**
 * Appointment Notification Service
 *
 * Handles all notification types for appointment changes including
 * real-time WebSocket notifications, email notifications, and SMS notifications.
 * Integrates with the existing notification infrastructure.
 *
 * Requirements: 8.6, 8.7
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma';
import { AppointmentWithRelations } from '@/types/database';
import { AppointmentStatus } from '@prisma/client';
import { WebSocketService } from './websocket-service';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface NotificationRecipient {
  id: string;
  type: 'staff' | 'client' | 'business_owner';
  email?: string;
  phone?: string;
  name: string;
  preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    realTime: boolean;
  };
}

export interface AppointmentNotificationData {
  appointment: AppointmentWithRelations;
  previousData?: Partial<AppointmentWithRelations>;
  changeType:
    'created' | 'updated' | 'cancelled' | 'rescheduled' | 'status_changed';
  changedBy?: {
    id: string;
    name: string;
    type: 'staff' | 'client' | 'system';
  };
  businessInfo: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

export interface NotificationTemplate {
  subject: string;
  emailHtml: string;
  emailText: string;
  smsText: string;
  pushTitle: string;
  pushBody: string;
}

export interface NotificationResult {
  success: boolean;
  sentChannels: string[];
  failedChannels: string[];
  errors: string[];
}

// ============================================================================
// APPOINTMENT NOTIFICATION SERVICE
// ============================================================================

export class AppointmentNotificationService {
  private webSocketService: WebSocketService;

  constructor() {
    // WebSocketService requires config and callbacks - using placeholders
    this.webSocketService = new WebSocketService({} as any, {} as any);
  }

  /**
   * Send comprehensive notifications for appointment changes
   * Requirements: 8.6
   */
  async sendAppointmentNotifications(
    notificationData: AppointmentNotificationData
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: true,
      sentChannels: [],
      failedChannels: [],
      errors: [],
    };

    try {
      // Get notification recipients
      const recipients = await this.getNotificationRecipients(notificationData);

      // Send notifications to each recipient
      for (const recipient of recipients) {
        await this.sendNotificationToRecipient(
          recipient,
          notificationData,
          result
        );
      }

      // Send real-time notifications
      await this.sendRealTimeNotifications(notificationData, result);

      // Log notification activity
      await this.logNotificationActivity(notificationData, result);

      result.success = result.failedChannels.length === 0;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Notification service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Send real-time WebSocket notifications
   * Requirements: 8.6, 8.7
   */
  async sendRealTimeNotifications(
    notificationData: AppointmentNotificationData,
    result: NotificationResult
  ): Promise<void> {
    try {
      const { appointment, changeType, changedBy } = notificationData;

      // Prepare real-time notification payload
      const realtimePayload = {
        type: `appointment_${changeType}`,
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        staffId: appointment.staffId,
        clientId: appointment.clientId,
        data: {
          appointment: {
            id: appointment.id,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            clientName:
              appointment.clientName ||
              `${appointment.client?.firstName} ${appointment.client?.lastName}`.trim(),
            services: appointment.services.map(s => ({
              id: s.serviceId,
              name: s.serviceName,
              duration: s.duration,
              price: s.price,
            })),
            staff: {
              id: appointment.staff.id,
              name: appointment.staff.displayName,
            },
          },
          changeType,
          changedBy,
          timestamp: new Date(),
        },
      };

      // Send to business room (all staff in the business)
      await this.webSocketService.broadcastToRoom(
        `business_${appointment.businessId}`,
        realtimePayload
      );

      // Send to specific staff member
      await this.webSocketService.broadcastToUser(
        appointment.staffId,
        realtimePayload
      );

      // Send to client if they have an active session
      if (appointment.clientId) {
        await this.webSocketService.broadcastToUser(appointment.clientId, {
          ...realtimePayload,
          type: `client_appointment_${changeType}`,
        });
      }

      result.sentChannels.push('realtime');
    } catch (error) {
      result.failedChannels.push('realtime');
      result.errors.push(
        `Real-time notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send notification to a specific recipient
   */
  private async sendNotificationToRecipient(
    recipient: NotificationRecipient,
    notificationData: AppointmentNotificationData,
    result: NotificationResult
  ): Promise<void> {
    try {
      // Generate notification template
      const template = await this.generateNotificationTemplate(
        recipient,
        notificationData
      );

      // Send email notification
      if (recipient.preferences.email && recipient.email) {
        await this.sendEmailNotification(recipient, template, result);
      }

      // Send SMS notification
      if (recipient.preferences.sms && recipient.phone) {
        await this.sendSMSNotification(recipient, template, result);
      }

      // Send push notification (if implemented)
      if (recipient.preferences.push) {
        await this.sendPushNotification(recipient, template, result);
      }
    } catch (error) {
      result.errors.push(
        `Failed to notify ${recipient.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all recipients who should be notified
   */
  private async getNotificationRecipients(
    notificationData: AppointmentNotificationData
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];
    const { appointment } = notificationData;

    try {
      // Add staff member
      const staff = await prisma.staff.findUnique({
        where: { id: appointment.staffId },
        include: { user: true },
      });

      if (staff) {
        recipients.push({
          id: staff.id,
          type: 'staff',
          email: staff.user.email,
          phone: undefined, // Would be stored in staff profile
          name: staff.displayName,
          preferences: {
            email: true,
            sms: false,
            push: true,
            realTime: true,
          },
        });
      }

      // Add client
      if (appointment.client) {
        recipients.push({
          id: appointment.client.id,
          type: 'client',
          email:
            appointment.client.email || appointment.clientEmail || undefined,
          phone:
            appointment.client.phone || appointment.clientPhone || undefined,
          name: `${appointment.client.firstName} ${appointment.client.lastName}`,
          preferences: {
            email: appointment.client.emailMarketing,
            sms: appointment.client.smsMarketing,
            push: false,
            realTime: false,
          },
        });
      } else if (appointment.clientEmail || appointment.clientPhone) {
        // Walk-in client
        recipients.push({
          id: 'walk-in',
          type: 'client',
          email: appointment.clientEmail || undefined,
          phone: appointment.clientPhone || undefined,
          name: appointment.clientName || 'Client',
          preferences: {
            email: true,
            sms: true,
            push: false,
            realTime: false,
          },
        });
      }

      // Add business owners/managers (if configured)
      const businessOwners = await prisma.businessUser.findMany({
        where: {
          businessId: appointment.businessId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        include: { user: true },
      });

      for (const owner of businessOwners) {
        recipients.push({
          id: owner.userId,
          type: 'business_owner',
          email: owner.user.email,
          phone: undefined,
          name: owner.user.name || 'Business Owner',
          preferences: {
            email: true,
            sms: false,
            push: true,
            realTime: true,
          },
        });
      }

      return recipients;
    } catch (error) {
      console.error('Failed to get notification recipients:', error);
      return recipients;
    }
  }

  /**
   * Generate notification template based on recipient and change type
   */
  private async generateNotificationTemplate(
    recipient: NotificationRecipient,
    notificationData: AppointmentNotificationData
  ): Promise<NotificationTemplate> {
    const { appointment, changeType, businessInfo } = notificationData;

    const appointmentDate = appointment.startTime.toLocaleDateString();
    const appointmentTime = appointment.startTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const clientName =
      appointment.clientName ||
      `${appointment.client?.firstName} ${appointment.client?.lastName}`.trim();
    const staffName = appointment.staff.displayName;
    const serviceName = appointment.services.map(s => s.serviceName).join(', ');

    // Base template data
    const templateData = {
      recipientName: recipient.name,
      businessName: businessInfo.name,
      appointmentDate,
      appointmentTime,
      clientName,
      staffName,
      serviceName,
      appointmentId: appointment.id,
    };

    // Generate templates based on change type and recipient type
    switch (changeType) {
      case 'created':
        return this.generateCreatedTemplate(templateData, recipient.type);

      case 'updated':
      case 'rescheduled':
        return this.generateUpdatedTemplate(
          templateData,
          recipient.type,
          notificationData
        );

      case 'cancelled':
        return this.generateCancelledTemplate(templateData, recipient.type);

      case 'status_changed':
        return this.generateStatusChangedTemplate(
          templateData,
          recipient.type,
          appointment.status
        );

      default:
        return this.generateDefaultTemplate(templateData, recipient.type);
    }
  }

  /**
   * Generate template for new appointments
   */
  private generateCreatedTemplate(
    data: any,
    recipientType: string
  ): NotificationTemplate {
    if (recipientType === 'client') {
      return {
        subject: `Appointment Confirmed - ${data.businessName}`,
        emailHtml: `
          <h2>Appointment Confirmed</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your appointment has been confirmed:</p>
          <ul>
            <li><strong>Date:</strong> ${data.appointmentDate}</li>
            <li><strong>Time:</strong> ${data.appointmentTime}</li>
            <li><strong>Service:</strong> ${data.serviceName}</li>
            <li><strong>Staff:</strong> ${data.staffName}</li>
          </ul>
          <p>We look forward to seeing you!</p>
          <p>Best regards,<br>${data.businessName}</p>
        `,
        emailText: `Appointment Confirmed\n\nHi ${data.recipientName},\n\nYour appointment has been confirmed:\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}\nService: ${data.serviceName}\nStaff: ${data.staffName}\n\nWe look forward to seeing you!\n\nBest regards,\n${data.businessName}`,
        smsText: `${data.businessName}: Your appointment is confirmed for ${data.appointmentDate} at ${data.appointmentTime} with ${data.staffName}. See you soon!`,
        pushTitle: 'Appointment Confirmed',
        pushBody: `${data.appointmentDate} at ${data.appointmentTime} with ${data.staffName}`,
      };
    } else {
      return {
        subject: `New Appointment - ${data.clientName}`,
        emailHtml: `
          <h2>New Appointment Scheduled</h2>
          <p>Hi ${data.recipientName},</p>
          <p>A new appointment has been scheduled:</p>
          <ul>
            <li><strong>Client:</strong> ${data.clientName}</li>
            <li><strong>Date:</strong> ${data.appointmentDate}</li>
            <li><strong>Time:</strong> ${data.appointmentTime}</li>
            <li><strong>Service:</strong> ${data.serviceName}</li>
            <li><strong>Staff:</strong> ${data.staffName}</li>
          </ul>
        `,
        emailText: `New Appointment Scheduled\n\nHi ${data.recipientName},\n\nA new appointment has been scheduled:\nClient: ${data.clientName}\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}\nService: ${data.serviceName}\nStaff: ${data.staffName}`,
        smsText: `New appointment: ${data.clientName} on ${data.appointmentDate} at ${data.appointmentTime}`,
        pushTitle: 'New Appointment',
        pushBody: `${data.clientName} - ${data.appointmentDate} at ${data.appointmentTime}`,
      };
    }
  }

  /**
   * Generate template for updated appointments
   */
  private generateUpdatedTemplate(
    data: any,
    recipientType: string,
    notificationData: AppointmentNotificationData
  ): NotificationTemplate {
    const { previousData } = notificationData;

    if (recipientType === 'client') {
      return {
        subject: `Appointment Updated - ${data.businessName}`,
        emailHtml: `
          <h2>Appointment Updated</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your appointment has been updated:</p>
          <ul>
            <li><strong>Date:</strong> ${data.appointmentDate}</li>
            <li><strong>Time:</strong> ${data.appointmentTime}</li>
            <li><strong>Service:</strong> ${data.serviceName}</li>
            <li><strong>Staff:</strong> ${data.staffName}</li>
          </ul>
          <p>Please make note of these changes.</p>
          <p>Best regards,<br>${data.businessName}</p>
        `,
        emailText: `Appointment Updated\n\nHi ${data.recipientName},\n\nYour appointment has been updated:\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}\nService: ${data.serviceName}\nStaff: ${data.staffName}\n\nPlease make note of these changes.\n\nBest regards,\n${data.businessName}`,
        smsText: `${data.businessName}: Your appointment has been updated to ${data.appointmentDate} at ${data.appointmentTime} with ${data.staffName}.`,
        pushTitle: 'Appointment Updated',
        pushBody: `${data.appointmentDate} at ${data.appointmentTime} with ${data.staffName}`,
      };
    } else {
      return {
        subject: `Appointment Updated - ${data.clientName}`,
        emailHtml: `
          <h2>Appointment Updated</h2>
          <p>Hi ${data.recipientName},</p>
          <p>An appointment has been updated:</p>
          <ul>
            <li><strong>Client:</strong> ${data.clientName}</li>
            <li><strong>Date:</strong> ${data.appointmentDate}</li>
            <li><strong>Time:</strong> ${data.appointmentTime}</li>
            <li><strong>Service:</strong> ${data.serviceName}</li>
            <li><strong>Staff:</strong> ${data.staffName}</li>
          </ul>
        `,
        emailText: `Appointment Updated\n\nHi ${data.recipientName},\n\nAn appointment has been updated:\nClient: ${data.clientName}\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}\nService: ${data.serviceName}\nStaff: ${data.staffName}`,
        smsText: `Appointment updated: ${data.clientName} on ${data.appointmentDate} at ${data.appointmentTime}`,
        pushTitle: 'Appointment Updated',
        pushBody: `${data.clientName} - ${data.appointmentDate} at ${data.appointmentTime}`,
      };
    }
  }

  /**
   * Generate template for cancelled appointments
   */
  private generateCancelledTemplate(
    data: any,
    recipientType: string
  ): NotificationTemplate {
    if (recipientType === 'client') {
      return {
        subject: `Appointment Cancelled - ${data.businessName}`,
        emailHtml: `
          <h2>Appointment Cancelled</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your appointment scheduled for ${data.appointmentDate} at ${data.appointmentTime} has been cancelled.</p>
          <p>If you would like to reschedule, please contact us.</p>
          <p>Best regards,<br>${data.businessName}</p>
        `,
        emailText: `Appointment Cancelled\n\nHi ${data.recipientName},\n\nYour appointment scheduled for ${data.appointmentDate} at ${data.appointmentTime} has been cancelled.\n\nIf you would like to reschedule, please contact us.\n\nBest regards,\n${data.businessName}`,
        smsText: `${data.businessName}: Your appointment for ${data.appointmentDate} at ${data.appointmentTime} has been cancelled. Contact us to reschedule.`,
        pushTitle: 'Appointment Cancelled',
        pushBody: `${data.appointmentDate} at ${data.appointmentTime} appointment cancelled`,
      };
    } else {
      return {
        subject: `Appointment Cancelled - ${data.clientName}`,
        emailHtml: `
          <h2>Appointment Cancelled</h2>
          <p>Hi ${data.recipientName},</p>
          <p>The appointment with ${data.clientName} scheduled for ${data.appointmentDate} at ${data.appointmentTime} has been cancelled.</p>
        `,
        emailText: `Appointment Cancelled\n\nHi ${data.recipientName},\n\nThe appointment with ${data.clientName} scheduled for ${data.appointmentDate} at ${data.appointmentTime} has been cancelled.`,
        smsText: `Appointment cancelled: ${data.clientName} on ${data.appointmentDate} at ${data.appointmentTime}`,
        pushTitle: 'Appointment Cancelled',
        pushBody: `${data.clientName} - ${data.appointmentDate} at ${data.appointmentTime}`,
      };
    }
  }

  /**
   * Generate template for status changes
   */
  private generateStatusChangedTemplate(
    data: any,
    recipientType: string,
    status: AppointmentStatus
  ): NotificationTemplate {
    const statusText = this.getStatusDisplayText(status);

    return {
      subject: `Appointment ${statusText} - ${recipientType === 'client' ? data.businessName : data.clientName}`,
      emailHtml: `
        <h2>Appointment Status Updated</h2>
        <p>Hi ${data.recipientName},</p>
        <p>The appointment status has been updated to: <strong>${statusText}</strong></p>
        <ul>
          <li><strong>${recipientType === 'client' ? 'Date' : 'Client'}:</strong> ${recipientType === 'client' ? data.appointmentDate : data.clientName}</li>
          <li><strong>Time:</strong> ${data.appointmentTime}</li>
          <li><strong>Service:</strong> ${data.serviceName}</li>
          <li><strong>Staff:</strong> ${data.staffName}</li>
        </ul>
      `,
      emailText: `Appointment Status Updated\n\nHi ${data.recipientName},\n\nThe appointment status has been updated to: ${statusText}\n\n${recipientType === 'client' ? 'Date' : 'Client'}: ${recipientType === 'client' ? data.appointmentDate : data.clientName}\nTime: ${data.appointmentTime}\nService: ${data.serviceName}\nStaff: ${data.staffName}`,
      smsText: `Appointment ${statusText.toLowerCase()}: ${recipientType === 'client' ? data.appointmentDate : data.clientName} at ${data.appointmentTime}`,
      pushTitle: `Appointment ${statusText}`,
      pushBody: `${recipientType === 'client' ? data.appointmentDate : data.clientName} at ${data.appointmentTime}`,
    };
  }

  /**
   * Generate default template
   */
  private generateDefaultTemplate(
    data: any,
    recipientType: string
  ): NotificationTemplate {
    return {
      subject: `Appointment Update - ${recipientType === 'client' ? data.businessName : data.clientName}`,
      emailHtml: `
        <h2>Appointment Update</h2>
        <p>Hi ${data.recipientName},</p>
        <p>There has been an update to your appointment:</p>
        <ul>
          <li><strong>${recipientType === 'client' ? 'Date' : 'Client'}:</strong> ${recipientType === 'client' ? data.appointmentDate : data.clientName}</li>
          <li><strong>Time:</strong> ${data.appointmentTime}</li>
          <li><strong>Service:</strong> ${data.serviceName}</li>
          <li><strong>Staff:</strong> ${data.staffName}</li>
        </ul>
      `,
      emailText: `Appointment Update\n\nHi ${data.recipientName},\n\nThere has been an update to your appointment:\n\n${recipientType === 'client' ? 'Date' : 'Client'}: ${recipientType === 'client' ? data.appointmentDate : data.clientName}\nTime: ${data.appointmentTime}\nService: ${data.serviceName}\nStaff: ${data.staffName}`,
      smsText: `Appointment update: ${recipientType === 'client' ? data.appointmentDate : data.clientName} at ${data.appointmentTime}`,
      pushTitle: 'Appointment Update',
      pushBody: `${recipientType === 'client' ? data.appointmentDate : data.clientName} at ${data.appointmentTime}`,
    };
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    result: NotificationResult
  ): Promise<void> {
    try {
      // In a full implementation, this would integrate with an email service like SendGrid, AWS SES, etc.
      console.log(`Email notification sent to ${recipient.email}:`, {
        subject: template.subject,
        recipient: recipient.name,
      });

      result.sentChannels.push('email');
    } catch (error) {
      result.failedChannels.push('email');
      result.errors.push(
        `Email notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    result: NotificationResult
  ): Promise<void> {
    try {
      // In a full implementation, this would integrate with an SMS service like Twilio, AWS SNS, etc.
      console.log(`SMS notification sent to ${recipient.phone}:`, {
        message: template.smsText,
        recipient: recipient.name,
      });

      result.sentChannels.push('sms');
    } catch (error) {
      result.failedChannels.push('sms');
      result.errors.push(
        `SMS notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send push notification (placeholder implementation)
   */
  private async sendPushNotification(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    result: NotificationResult
  ): Promise<void> {
    try {
      // In a full implementation, this would integrate with a push notification service
      console.log(`Push notification sent to ${recipient.id}:`, {
        title: template.pushTitle,
        body: template.pushBody,
        recipient: recipient.name,
      });

      result.sentChannels.push('push');
    } catch (error) {
      result.failedChannels.push('push');
      result.errors.push(
        `Push notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log notification activity for audit trail
   */
  private async logNotificationActivity(
    notificationData: AppointmentNotificationData,
    result: NotificationResult
  ): Promise<void> {
    try {
      // In a full implementation, this would log to a notifications audit table
      console.log('Notification activity logged:', {
        appointmentId: notificationData.appointment.id,
        changeType: notificationData.changeType,
        sentChannels: result.sentChannels,
        failedChannels: result.failedChannels,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log notification activity:', error);
    }
  }

  /**
   * Get display text for appointment status
   */
  private getStatusDisplayText(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'Scheduled';
      case AppointmentStatus.CONFIRMED:
        return 'Confirmed';
      case AppointmentStatus.IN_PROGRESS:
        return 'In Progress';
      case AppointmentStatus.COMPLETED:
        return 'Completed';
      case AppointmentStatus.CANCELLED:
        return 'Cancelled';
      case AppointmentStatus.NO_SHOW:
        return 'No Show';
      default:
        return 'Updated';
    }
  }
}
