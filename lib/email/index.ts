/**
 * Email System Index
 * Central export point for all email-related functionality
 */

// Template Engine
export {
  TemplateEngine,
  templateEngine,
  TemplateRenderError,
  type RenderedEmail,
  type BusinessBranding,
} from './template-engine';

// Templates
export {
  type EmailTemplateType,
  type TemplateData,
  bookingConfirmationHtml,
  bookingConfirmationText,
  type BookingConfirmationData,
  appointmentReminderHtml,
  appointmentReminderText,
  type AppointmentReminderData,
  cancellationNotificationHtml,
  cancellationNotificationText,
  type CancellationNotificationData,
  staffBookingAlertHtml,
  staffBookingAlertText,
  staffCancellationAlertHtml,
  staffCancellationAlertText,
  dailyBookingSummaryHtml,
  dailyBookingSummaryText,
  type StaffBookingAlertData,
  type StaffCancellationAlertData,
  type DailyBookingSummaryData,
} from './templates';

// Business Branding
export {
  getBusinessBranding,
  getLuminaBranding,
  applyBrandingToHtml,
  validateBranding,
  mergeBrandingWithDefaults,
  hasCustomBranding,
  BusinessBrandingError,
} from './business-branding';

// Template Repository
export {
  TemplateRepository,
  templateRepository,
  TemplateRepositoryError,
  type EmailTemplate,
  type CreateEmailTemplateInput,
  type UpdateEmailTemplateInput,
} from './template-repository';

// Email Provider
export {
  BaseEmailProvider,
} from './base-email-provider';

export {
  ResendEmailProvider,
  type ResendProviderConfig,
} from './resend-provider';

// Email Types
export * from './types';

// Retry Logic
export {
  retryWithBackoff,
  calculateRetryDelay,
  getNextRetryTime,
  shouldRetry,
  isRetryableError,
  createRetryMetadata,
  updateRetryMetadata,
  sleep,
  formatRetryDelay,
  getRetryStatistics,
  RETRY_SCHEDULE,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryMetadata,
  type RetryAttempt,
} from './retry-logic';

// Notification Service
export {
  NotificationService,
  notificationService,
  NotificationError,
  NotificationErrorCode,
  type NotificationResult,
  type AppointmentChanges,
  type NotificationFilters,
  type NotificationHistory,
  type NotificationServiceConfig,
} from './notification-service';

// Queue Manager
export {
  EmailQueueManager,
  emailQueueManager,
  QueueError,
  QueueErrorCode,
  type QueueMetrics,
  type QueueManagerConfig,
} from './queue-manager';

// Queue Worker
export {
  EmailQueueWorker,
  emailQueueWorker,
  type QueueWorkerConfig,
  type QueueWorkerStatus,
} from './queue-worker';

// Rate Limiter
export {
  EmailRateLimiter,
  emailRateLimiter,
  RateLimiterError,
  RateLimiterErrorCode,
  type RateLimitConfig,
  type RateLimitStatus,
} from './rate-limiter';

// Monitoring
export {
  EmailQueueMonitor,
  emailQueueMonitor,
  AlertSeverity,
  type Alert,
  type MonitoringThresholds,
} from './monitoring';

// Notification Repository
export {
  NotificationRepository,
  notificationRepository,
  NotificationRepositoryError,
  NotificationRepositoryErrorCode,
  type CreateNotificationInput,
  type NotificationStatus,
  type Notification,
  type NotificationFilters as RepositoryNotificationFilters,
  type DateRange,
  type DeliveryStats,
  type NotificationMetrics,
} from './notification-repository';

// Reminder Scheduler
export {
  ReminderScheduler,
  reminderScheduler,
  ReminderSchedulerError,
  ReminderSchedulerErrorCode,
  type ReminderConfig,
  type ReminderScheduleResult,
} from './reminder-scheduler';
