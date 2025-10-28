/**
 * Template Engine
 * Renders email templates with dynamic data and business branding
 */

import {
  bookingConfirmationHtml,
  bookingConfirmationText,
  type BookingConfirmationData,
} from './templates/booking-confirmation';
import {
  appointmentReminderHtml,
  appointmentReminderText,
  type AppointmentReminderData,
} from './templates/appointment-reminder';
import {
  cancellationNotificationHtml,
  cancellationNotificationText,
  type CancellationNotificationData,
} from './templates/cancellation-notification';
import {
  staffBookingAlertHtml,
  staffBookingAlertText,
  staffCancellationAlertHtml,
  staffCancellationAlertText,
  dailyBookingSummaryHtml,
  dailyBookingSummaryText,
  type StaffBookingAlertData,
  type StaffCancellationAlertData,
  type DailyBookingSummaryData,
} from './templates/staff-notifications';
import type { EmailTemplateType, TemplateData } from './templates';

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

export interface BusinessBranding {
  businessId: string;
  businessName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export class TemplateEngine {
  /**
   * Render an email template with the provided data
   */
  async render(
    templateType: EmailTemplateType,
    data: TemplateData,
    branding?: BusinessBranding
  ): Promise<RenderedEmail> {
    try {
      // Apply branding to data if provided
      const brandedData = this.applyBrandingToData(data, branding);

      // Get the appropriate template renderer
      const { html, text, subject } = this.getTemplateRenderer(
        templateType,
        brandedData
      );

      // Substitute variables in the rendered content
      const processedHtml = this.substituteVariables(html, brandedData);
      const processedText = this.substituteVariables(text, brandedData);

      return {
        html: processedHtml,
        text: processedText,
        subject: this.substituteVariables(subject, brandedData),
      };
    } catch (error) {
      throw new TemplateRenderError(
        `Failed to render template ${templateType}`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get the template renderer for a specific template type
   */
  private getTemplateRenderer(
    templateType: EmailTemplateType,
    data: any
  ): { html: string; text: string; subject: string } {
    switch (templateType) {
      case 'booking_confirmation':
        return {
          html: bookingConfirmationHtml(data as BookingConfirmationData),
          text: bookingConfirmationText(data as BookingConfirmationData),
          subject: `Booking Confirmed - ${data.businessName}`,
        };

      case 'appointment_reminder_24h':
      case 'appointment_reminder_2h':
        return {
          html: appointmentReminderHtml(data as AppointmentReminderData),
          text: appointmentReminderText(data as AppointmentReminderData),
          subject: `Reminder: Appointment ${data.reminderType === '24h' ? 'Tomorrow' : 'in 2 Hours'} - ${data.businessName}`,
        };

      case 'cancellation_notification':
        return {
          html: cancellationNotificationHtml(
            data as CancellationNotificationData
          ),
          text: cancellationNotificationText(
            data as CancellationNotificationData
          ),
          subject: `Appointment Cancelled - ${data.businessName}`,
        };

      case 'staff_booking_alert':
        return {
          html: staffBookingAlertHtml(data as StaffBookingAlertData),
          text: staffBookingAlertText(data as StaffBookingAlertData),
          subject: `New Booking Alert - ${data.businessName}`,
        };

      case 'staff_cancellation_alert':
        return {
          html: staffCancellationAlertHtml(
            data as StaffCancellationAlertData
          ),
          text: staffCancellationAlertText(
            data as StaffCancellationAlertData
          ),
          subject: `Appointment Cancelled - ${data.businessName}`,
        };

      case 'daily_booking_summary':
        return {
          html: dailyBookingSummaryHtml(data as DailyBookingSummaryData),
          text: dailyBookingSummaryText(data as DailyBookingSummaryData),
          subject: `Daily Booking Summary - ${data.date} - ${data.businessName}`,
        };

      case 'modification_notification':
        // TODO: Implement modification notification template
        throw new TemplateRenderError(
          'Modification notification template not yet implemented',
          'TEMPLATE_NOT_IMPLEMENTED'
        );

      default:
        throw new TemplateRenderError(
          `Unknown template type: ${templateType}`,
          'UNKNOWN_TEMPLATE_TYPE'
        );
    }
  }

  /**
   * Apply business branding to template data
   */
  private applyBrandingToData(
    data: TemplateData,
    branding?: BusinessBranding
  ): any {
    if (!branding) {
      return data;
    }

    return {
      ...data,
      businessLogoUrl: branding.logoUrl || (data as any).businessLogoUrl,
      primaryColor: branding.primaryColor || (data as any).primaryColor,
      secondaryColor:
        branding.secondaryColor || (data as any).secondaryColor,
      accentColor: branding.accentColor || (data as any).accentColor,
    };
  }

  /**
   * Substitute variables in template content
   * Handles missing variables gracefully by leaving placeholders or using empty strings
   */
  private substituteVariables(content: string, data: any): string {
    // Replace {{{variable}}} placeholders (triple braces for unescaped content)
    let result = content.replace(/\{\{\{(\w+)\}\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined && value !== null ? String(value) : '';
    });

    // Replace {{variable}} placeholders (double braces for escaped content)
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      if (value === undefined || value === null) {
        return '';
      }
      // Basic HTML escaping for safety
      return this.escapeHtml(String(value));
    });

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
  }

  /**
   * Generate plain text from HTML (basic implementation)
   * Strips HTML tags and converts common elements to text equivalents
   */
  generatePlainTextFromHtml(html: string): string {
    let text = html;

    // Remove style and script tags and their content
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Convert common HTML elements to text equivalents
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<li>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');

    // Convert links to text with URL
    text = text.replace(
      /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
      '$2 ($1)'
    );

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Clean up whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
    text = text.replace(/[ \t]+/g, ' '); // Normalize spaces
    text = text.trim();

    return text;
  }

  /**
   * Decode common HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[a-z]+;|&#\d+;/gi, (entity) => {
      return entityMap[entity.toLowerCase()] || entity;
    });
  }

  /**
   * Validate template data has all required fields
   */
  validateTemplateData(
    templateType: EmailTemplateType,
    data: any
  ): { valid: boolean; missingFields: string[] } {
    const requiredFields = this.getRequiredFields(templateType);
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ''
      ) {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Get required fields for a template type
   */
  private getRequiredFields(templateType: EmailTemplateType): string[] {
    const commonFields = ['businessName'];

    switch (templateType) {
      case 'booking_confirmation':
        return [
          ...commonFields,
          'clientName',
          'appointmentDate',
          'appointmentTime',
          'serviceName',
          'staffName',
          'businessAddress',
          'cancellationLink',
        ];

      case 'appointment_reminder_24h':
      case 'appointment_reminder_2h':
        return [
          ...commonFields,
          'clientName',
          'appointmentDate',
          'appointmentTime',
          'serviceName',
          'staffName',
          'businessAddress',
          'rescheduleLink',
          'cancellationLink',
          'reminderType',
        ];

      case 'cancellation_notification':
        return [
          ...commonFields,
          'clientName',
          'appointmentDate',
          'appointmentTime',
          'serviceName',
          'staffName',
          'businessAddress',
          'rebookLink',
        ];

      case 'staff_booking_alert':
        return [
          ...commonFields,
          'staffName',
          'clientName',
          'appointmentDate',
          'appointmentTime',
          'serviceName',
          'viewAppointmentLink',
        ];

      case 'staff_cancellation_alert':
        return [
          ...commonFields,
          'staffName',
          'clientName',
          'appointmentDate',
          'appointmentTime',
          'serviceName',
          'viewScheduleLink',
        ];

      case 'daily_booking_summary':
        return [
          ...commonFields,
          'recipientName',
          'date',
          'totalAppointments',
          'totalRevenue',
          'appointments',
          'viewDashboardLink',
        ];

      default:
        return commonFields;
    }
  }
}

/**
 * Template Render Error
 */
export class TemplateRenderError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'TemplateRenderError';
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine();
