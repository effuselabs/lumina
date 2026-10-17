import { randomUUID } from 'crypto';
import { render } from '@react-email/render';
import { ResendEmailProvider } from './resend-provider';
import BookingConfirmationEmail, {
  type AppointmentNotice,
} from './templates/booking-confirmation-email';
import type { EmailMessage, EmailProvider, EmailTemplateType } from './types';

/**
 * Client emails about one appointment: confirmed, moved, or cancelled.
 *
 * This used to be a second, independent email stack built on nodemailer/SMTP,
 * running alongside the Resend one in notification-service.ts. It now delegates
 * to the same ResendEmailProvider, so there is a single delivery path.
 *
 * nodemailer was dropped entirely: it carried a HIGH advisory whose fix
 * (9.0.3) falls outside next-auth's optional peer range (^7 || ^8), so the
 * dependency could neither be kept nor upgraded — and the project had already
 * standardised on Resend.
 *
 * The public shape of `emailService` is unchanged so callers did not need
 * touching. `previewUrl` is retained in the return type and is always
 * undefined: it existed only for nodemailer's Ethereal test inbox.
 */

/** When the appointment was, before a move — already in salon time. */
interface PreviousTime {
  appointmentDate: string;
  appointmentTime: string;
}

const SUBJECT: Record<AppointmentNotice['kind'], string> = {
  confirmed: 'Appointment Confirmed',
  moved: 'Appointment Moved',
  cancelled: 'Appointment Cancelled',
};

const TEMPLATE: Record<AppointmentNotice['kind'], EmailTemplateType> = {
  confirmed: 'booking_confirmation',
  moved: 'modification_notification',
  cancelled: 'cancellation_notification',
};

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  price: number;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  appointmentId: string;
  notes?: string;
  /** Optional, for provider-side attribution. */
  businessId?: string;
}

interface SendBookingConfirmationResult {
  success: boolean;
  messageId?: string;
  /** Always undefined. Kept so existing callers still type-check. */
  previewUrl?: string;
  error?: string;
}

class EmailService {
  private lazyProvider?: EmailProvider;

  /**
   * Resolved on first send. ResendEmailProvider reads RESEND_API_KEY, and
   * this module is imported by API routes — constructing it at module scope
   * would break `next build` anywhere email secrets are absent, including
   * CI. The previous implementation built its transport in the constructor
   * of a module-scope singleton, which is exactly that failure.
   */
  private get provider(): EmailProvider {
    if (!this.lazyProvider) {
      this.lazyProvider = new ResendEmailProvider({
        apiKey: process.env.RESEND_API_KEY || '',
        fromEmail: process.env.EMAIL_FROM,
        fromName: process.env.EMAIL_FROM_NAME || 'Lumina',
      });
    }
    return this.lazyProvider;
  }

  sendBookingConfirmation(
    data: BookingEmailData
  ): Promise<SendBookingConfirmationResult> {
    return this.send(data, { kind: 'confirmed' });
  }

  /** The appointment moved. `previous` is where it was, in salon time. */
  sendAppointmentMoved(
    data: BookingEmailData,
    previous: PreviousTime
  ): Promise<SendBookingConfirmationResult> {
    return this.send(data, { kind: 'moved', previous });
  }

  sendAppointmentCancelled(
    data: BookingEmailData
  ): Promise<SendBookingConfirmationResult> {
    return this.send(data, { kind: 'cancelled' });
  }

  private async send(
    data: BookingEmailData,
    notice: AppointmentNotice
  ): Promise<SendBookingConfirmationResult> {
    try {
      const html = await render(BookingConfirmationEmail({ ...data, notice }));
      const text = this.renderPlainText(data, notice);

      const message: EmailMessage = {
        id: randomUUID(),
        businessId: data.businessId ?? '',
        to: data.customerEmail,
        from: process.env.EMAIL_FROM || 'noreply@mail.uselumina.app',
        subject: `${SUBJECT[notice.kind]} - ${data.businessName}`,
        html,
        text,
        templateType: TEMPLATE[notice.kind],
        metadata: {
          appointmentId: data.appointmentId,
          businessName: data.businessName,
        },
        priority: 'high',
        attemptCount: 0,
        maxAttempts: 3,
        scheduledAt: new Date(),
        createdAt: new Date(),
      };

      const result = await this.provider.send(message);

      if (!result.success) {
        return {
          success: false,
          error: result.error ?? 'Email provider reported failure',
        };
      }

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send ${TEMPLATE[notice.kind]} email:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private renderPlainText(
    data: BookingEmailData,
    notice: AppointmentNotice
  ): string {
    const opening = {
      confirmed: `Appointment Confirmed!\n\nYour booking at ${data.businessName} has been successfully scheduled.`,
      moved: `Appointment Moved\n\n${data.businessName} has moved your appointment to a new time.`,
      cancelled: `Appointment Cancelled\n\nYour appointment at ${data.businessName} has been cancelled.`,
    }[notice.kind];
    const was =
      notice.kind === 'moved'
        ? `- Was: ${notice.previous.appointmentDate}, ${notice.previous.appointmentTime}\n`
        : '';
    const closing =
      notice.kind === 'cancelled'
        ? `To book again, contact ${data.businessName} or visit their booking page.`
        : `Important Information:
• Please arrive 5-10 minutes early for your appointment
• If you need to reschedule or cancel, please contact us as soon as possible
• Bring a valid ID and any relevant medical information if applicable

Thank you for choosing ${data.businessName}! We look forward to seeing you.`;
    return `
${opening}

Appointment Details:
- Confirmation ID: ${data.appointmentId}
- Service: ${data.serviceName}
- Staff Member: ${data.staffName}
${was}- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}
- Duration: ${this.formatDuration(data.duration)}
- Price: ${this.formatPrice(data.price)}
${data.notes ? `- Notes: ${data.notes}` : ''}

Business Information:
${data.businessName}
${data.businessAddress || ''}
${data.businessPhone ? `Phone: ${data.businessPhone}` : ''}
${data.businessEmail ? `Email: ${data.businessEmail}` : ''}

${closing}
      `.trim();
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      return await this.provider.healthCheck();
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

// Export a singleton instance. Constructing it is now free — the provider,
// and therefore the API key, is resolved on first send.
export const emailService = new EmailService();
