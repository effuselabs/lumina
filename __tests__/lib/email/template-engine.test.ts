/**
 * Unit Tests for TemplateEngine
 *
 * Tests the email template rendering engine including:
 * - Template rendering with various data
 * - Business branding application
 * - Fallback to default templates
 * - Variable substitution
 * - HTML to plain text conversion
 * - Template validation
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import {
  TemplateEngine,
  TemplateRenderError,
  type BusinessBranding,
} from '@/lib/email/template-engine';
import type {
  BookingConfirmationData,
  AppointmentReminderData,
  CancellationNotificationData,
} from '@/lib/email/templates';

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;

  beforeEach(() => {
    templateEngine = new TemplateEngine();
  });

  describe('Template Rendering', () => {
    const mockBookingData: BookingConfirmationData = {
      businessName: 'Test Salon',
      businessAddress: '123 Main St, Test City, TS 12345',
      businessPhone: '+1234567890',
      businessLogoUrl: 'https://example.com/logo.png',
      primaryColor: '#FFD25A',
      clientName: 'John Doe',
      appointmentDate: 'Monday, December 1, 2024',
      appointmentTime: '10:00 AM',
      serviceName: 'Haircut',
      servicePrice: '50.00',
      staffName: 'Jane Smith',
      cancellationLink: 'https://example.com/cancel/123',
    };

    it('should render booking confirmation template successfully', async () => {
      const result = await templateEngine.render(
        'booking_confirmation',
        mockBookingData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('Test Salon');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Haircut');
      expect(result.html).toContain('Jane Smith');
      expect(result.text).toContain('Test Salon');
      expect(result.text).toContain('John Doe');
      expect(result.subject).toContain('Booking Confirmed');
      expect(result.subject).toContain('Test Salon');
    });

    it('should render appointment reminder template successfully', async () => {
      const mockReminderData: AppointmentReminderData = {
        ...mockBookingData,
        reminderType: '24h',
        rescheduleLink: 'https://example.com/reschedule/123',
      };

      const result = await templateEngine.render(
        'appointment_reminder_24h',
        mockReminderData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('Test Salon');
      expect(result.html).toContain('John Doe');
      expect(result.text).toContain('reminder');
      expect(result.subject).toContain('Reminder');
      expect(result.subject).toContain('Tomorrow');
    });

    it('should render 2h reminder with correct subject', async () => {
      const mockReminderData: AppointmentReminderData = {
        ...mockBookingData,
        reminderType: '2h',
        rescheduleLink: 'https://example.com/reschedule/123',
      };

      const result = await templateEngine.render(
        'appointment_reminder_2h',
        mockReminderData
      );

      expect(result).toBeDefined();
      expect(result.subject).toContain('in 2 Hours');
    });

    it('should render cancellation notification template successfully', async () => {
      const mockCancellationData: CancellationNotificationData = {
        ...mockBookingData,
        cancellationReason: 'Client requested',
        rebookLink: 'https://example.com/book/123',
      };

      const result = await templateEngine.render(
        'cancellation_notification',
        mockCancellationData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('Test Salon');
      expect(result.html).toContain('cancelled');
      expect(result.text).toContain('cancelled');
      expect(result.subject).toContain('Cancelled');
    });

    it('should throw error for unknown template type', async () => {
      await expect(
        templateEngine.render('unknown_template' as any, mockBookingData)
      ).rejects.toThrow(TemplateRenderError);
    });

    it('should throw error for modification notification (not implemented)', async () => {
      await expect(
        templateEngine.render('modification_notification', mockBookingData)
      ).rejects.toThrow(TemplateRenderError);
    });
  });

  describe('Business Branding', () => {
    const mockBookingData: BookingConfirmationData = {
      businessName: 'Test Salon',
      businessAddress: '123 Main St',
      clientName: 'John Doe',
      appointmentDate: 'Monday, December 1, 2024',
      appointmentTime: '10:00 AM',
      serviceName: 'Haircut',
      servicePrice: '50.00',
      staffName: 'Jane Smith',
      cancellationLink: 'https://example.com/cancel/123',
    };

    const mockBranding: BusinessBranding = {
      businessId: 'business-123',
      businessName: 'Branded Salon',
      logoUrl: 'https://example.com/branded-logo.png',
      primaryColor: '#FF5733',
      secondaryColor: '#33FF57',
      accentColor: '#3357FF',
    };

    it('should apply business branding to template', async () => {
      const result = await templateEngine.render(
        'booking_confirmation',
        mockBookingData,
        mockBranding
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('#FF5733'); // Primary color
    });

    it('should use default values when branding not provided', async () => {
      const result = await templateEngine.render(
        'booking_confirmation',
        mockBookingData
      );

      expect(result).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should override template data with branding values', async () => {
      const dataWithColor: BookingConfirmationData = {
        ...mockBookingData,
        primaryColor: '#000000', // This should be overridden
        businessLogoUrl: 'https://example.com/old-logo.png', // This should be overridden
      };

      const result = await templateEngine.render(
        'booking_confirmation',
        dataWithColor,
        mockBranding
      );

      expect(result).toBeDefined();
      // Branding should override the data values
      expect(result.html).toContain('#FF5733'); // Branding primary color
    });
  });

  describe('Variable Substitution', () => {
    it('should substitute variables in content', async () => {
      const mockData: BookingConfirmationData = {
        businessName: 'Test Salon',
        businessAddress: '123 Main St',
        clientName: 'John Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut & Styling',
        servicePrice: '75.00',
        staffName: 'Jane Smith',
        cancellationLink: 'https://example.com/cancel/123',
      };

      const result = await templateEngine.render(
        'booking_confirmation',
        mockData
      );

      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Haircut & Styling');
      expect(result.html).toContain('75.00');
      expect(result.text).toContain('John Doe');
      expect(result.text).toContain('Haircut & Styling');
    });

    it('should handle missing variables gracefully', async () => {
      const incompleteData: Partial<BookingConfirmationData> = {
        businessName: 'Test Salon',
        clientName: 'John Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        servicePrice: '50.00',
        staffName: 'Jane Smith',
        cancellationLink: 'https://example.com/cancel/123',
        // Missing businessAddress, businessPhone, businessLogoUrl
      };

      const result = await templateEngine.render(
        'booking_confirmation',
        incompleteData as BookingConfirmationData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('John Doe');
      expect(result.text).toContain('John Doe');
    });

    it('should handle special characters in variables', async () => {
      const dataWithSpecialChars: BookingConfirmationData = {
        businessName: 'Test & Co. Salon',
        businessAddress: '123 Main St',
        clientName: 'John "Johnny" Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut & Styling',
        servicePrice: '50.00',
        staffName: 'Jane Smith',
        cancellationLink: 'https://example.com/cancel/123',
      };

      const result = await templateEngine.render(
        'booking_confirmation',
        dataWithSpecialChars
      );

      // Should render successfully with special characters
      expect(result.html).toContain('Test');
      expect(result.html).toContain('John');
      expect(result.html).toContain('Haircut');
      expect(result.text).toContain('Test & Co');
      expect(result.text).toContain('John "Johnny" Doe');
    });
  });

  describe('HTML to Plain Text Conversion', () => {
    it('should convert HTML to plain text', () => {
      const html = `
        <html>
          <body>
            <h1>Welcome</h1>
            <p>This is a test email.</p>
            <p>It has multiple paragraphs.</p>
            <a href="https://example.com">Click here</a>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </body>
        </html>
      `;

      const text = templateEngine.generatePlainTextFromHtml(html);

      expect(text).toContain('Welcome');
      expect(text).toContain('This is a test email');
      expect(text).toContain('Click here');
      expect(text).toContain('• Item 1');
      expect(text).toContain('• Item 2');
      expect(text).not.toContain('<html>');
      expect(text).not.toContain('<p>');
      expect(text).not.toContain('<a');
    });

    it('should remove style and script tags', () => {
      const html = `
        <html>
          <head>
            <style>body { color: red; }</style>
            <script>alert('test');</script>
          </head>
          <body>
            <p>Content</p>
          </body>
        </html>
      `;

      const text = templateEngine.generatePlainTextFromHtml(html);

      expect(text).toContain('Content');
      expect(text).not.toContain('color: red');
      expect(text).not.toContain('alert');
      expect(text).not.toContain('<style>');
      expect(text).not.toContain('<script>');
    });

    it('should convert links to text with URLs', () => {
      const html =
        '<p>Visit <a href="https://example.com">our website</a> for more info.</p>';

      const text = templateEngine.generatePlainTextFromHtml(html);

      expect(text).toContain('our website');
      expect(text).toContain('https://example.com');
    });

    it('should decode HTML entities', () => {
      const html = '<p>Price: $50 &amp; up. It&#39;s &quot;great&quot;!</p>';

      const text = templateEngine.generatePlainTextFromHtml(html);

      expect(text).toContain('$50 & up');
      expect(text).toContain("It's");
      expect(text).toContain('"great"');
    });

    it('should normalize whitespace', () => {
      const html = `
        <p>Line 1</p>
        
        
        <p>Line 2</p>
        <p>Line    3    with    spaces</p>
      `;

      const text = templateEngine.generatePlainTextFromHtml(html);

      expect(text).not.toContain('   '); // No triple spaces
      expect(text).toContain('Line 1');
      expect(text).toContain('Line 2');
      expect(text).toContain('Line 3 with spaces');
    });
  });

  describe('Template Validation', () => {
    it('should validate template data has all required fields', () => {
      const completeData: BookingConfirmationData = {
        businessName: 'Test Salon',
        businessAddress: '123 Main St',
        clientName: 'John Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        servicePrice: '50.00',
        staffName: 'Jane Smith',
        cancellationLink: 'https://example.com/cancel/123',
      };

      const result = templateEngine.validateTemplateData(
        'booking_confirmation',
        completeData
      );

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const incompleteData: Partial<BookingConfirmationData> = {
        businessName: 'Test Salon',
        clientName: 'John Doe',
        // Missing many required fields
      };

      const result = templateEngine.validateTemplateData(
        'booking_confirmation',
        incompleteData
      );

      expect(result.valid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
      expect(result.missingFields).toContain('appointmentDate');
      expect(result.missingFields).toContain('appointmentTime');
      expect(result.missingFields).toContain('serviceName');
    });

    it('should validate reminder template required fields', () => {
      const incompleteData: Partial<AppointmentReminderData> = {
        businessName: 'Test Salon',
        clientName: 'John Doe',
        // Missing reminderType and other fields
      };

      const result = templateEngine.validateTemplateData(
        'appointment_reminder_24h',
        incompleteData
      );

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('reminderType');
      expect(result.missingFields).toContain('rescheduleLink');
      expect(result.missingFields).toContain('cancellationLink');
    });

    it('should validate cancellation template required fields', () => {
      const incompleteData: Partial<CancellationNotificationData> = {
        businessName: 'Test Salon',
        clientName: 'John Doe',
        // Missing rebookLink and other fields
      };

      const result = templateEngine.validateTemplateData(
        'cancellation_notification',
        incompleteData
      );

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('rebookLink');
    });

    it('should handle empty string values as missing', () => {
      const dataWithEmptyStrings: BookingConfirmationData = {
        businessName: 'Test Salon',
        businessAddress: '',
        clientName: 'John Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        servicePrice: '50.00',
        staffName: 'Jane Smith',
        cancellationLink: 'https://example.com/cancel/123',
      };

      const result = templateEngine.validateTemplateData(
        'booking_confirmation',
        dataWithEmptyStrings
      );

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('businessAddress');
    });
  });

  describe('Error Handling', () => {
    it('should throw TemplateRenderError with details', async () => {
      try {
        await templateEngine.render('unknown_template' as any, {});
        fail('Should have thrown TemplateRenderError');
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateRenderError);
        expect((error as TemplateRenderError).message).toContain(
          'Failed to render template'
        );
      }
    });

    it('should handle rendering errors gracefully', async () => {
      // Pass invalid data that might cause rendering issues
      const invalidData = null as any;

      await expect(
        templateEngine.render('booking_confirmation', invalidData)
      ).rejects.toThrow(TemplateRenderError);
    });
  });

  describe('Staff Notification Templates', () => {
    it('should render staff booking alert template', async () => {
      const mockStaffData = {
        businessName: 'Test Salon',
        staffName: 'Jane Smith',
        clientName: 'John Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        viewAppointmentLink: 'https://example.com/appointments/123',
      };

      const result = await templateEngine.render(
        'staff_booking_alert',
        mockStaffData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('John Doe');
      expect(result.subject).toContain('New Booking Alert');
    });

    it('should render staff cancellation alert template', async () => {
      const mockStaffData = {
        businessName: 'Test Salon',
        staffName: 'Jane Smith',
        clientName: 'John Doe',
        appointmentDate: 'Monday, December 1, 2024',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        viewScheduleLink: 'https://example.com/schedule',
      };

      const result = await templateEngine.render(
        'staff_cancellation_alert',
        mockStaffData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('cancelled');
      expect(result.subject).toContain('Cancelled');
    });

    it('should render daily booking summary template', async () => {
      const mockSummaryData = {
        businessName: 'Test Salon',
        recipientName: 'Jane Smith',
        date: 'Monday, December 1, 2024',
        totalAppointments: 5,
        totalRevenue: '350.00',
        appointments: [
          {
            time: '10:00 AM',
            clientName: 'John Doe',
            serviceName: 'Haircut',
            price: '50.00',
          },
          {
            time: '11:00 AM',
            clientName: 'Jane Doe',
            serviceName: 'Styling',
            price: '75.00',
          },
        ],
        viewDashboardLink: 'https://example.com/dashboard',
      };

      const result = await templateEngine.render(
        'daily_booking_summary',
        mockSummaryData
      );

      expect(result).toBeDefined();
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('5');
      expect(result.html).toContain('350.00');
      expect(result.subject).toContain('Daily Booking Summary');
    });
  });
});
