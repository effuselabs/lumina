/**
 * Email Templates Index
 * Exports all email templates and their data types
 */

export * from './booking-confirmation';
export * from './appointment-reminder';
export * from './cancellation-notification';
export * from './staff-notifications';

export type EmailTemplateType =
  | 'booking_confirmation'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_2h'
  | 'cancellation_notification'
  | 'modification_notification'
  | 'staff_booking_alert'
  | 'staff_cancellation_alert'
  | 'daily_booking_summary';

export type TemplateData =
  | import('./booking-confirmation').BookingConfirmationData
  | import('./appointment-reminder').AppointmentReminderData
  | import('./cancellation-notification').CancellationNotificationData
  | import('./staff-notifications').StaffBookingAlertData
  | import('./staff-notifications').StaffCancellationAlertData
  | import('./staff-notifications').DailyBookingSummaryData;
