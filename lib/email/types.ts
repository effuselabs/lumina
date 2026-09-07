/**
 * Email Provider Types and Interfaces
 *
 * Defines the core types and interfaces for the email notification system.
 */

/**
 * Email template types supported by the notification system
 */
export type EmailTemplateType =
  | 'booking_confirmation'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_2h'
  | 'cancellation_notification'
  | 'modification_notification'
  | 'staff_booking_alert'
  | 'staff_cancellation_alert'
  | 'daily_booking_summary';

/**
 * Email message structure for sending emails
 */
export interface EmailMessage {
  id: string;
  businessId: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  templateType: EmailTemplateType;
  metadata: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: Date;
  createdAt: Date;
}

/**
 * Result of sending a single email
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerResponse?: any;
}

/**
 * Result of sending multiple emails in batch
 */
export interface BatchSendResult {
  totalSent: number;
  totalFailed: number;
  results: SendResult[];
}

/**
 * Email delivery status tracking
 */
export interface DeliveryStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'complained';
  timestamp: Date;
  error?: string;
}

/**
 * Provider-specific rate limits and constraints
 */
export interface ProviderLimits {
  maxRecipientsPerMessage: number;
  maxMessagesPerSecond: number;
  maxMessagesPerDay: number;
  maxMessageSize: number;
}

/**
 * Email provider interface that all providers must implement
 */
export interface EmailProvider {
  /**
   * Send a single email message
   */
  send(email: EmailMessage): Promise<SendResult>;

  /**
   * Send multiple emails in batch
   */
  sendBatch(emails: EmailMessage[]): Promise<BatchSendResult>;

  /**
   * Get delivery status for a specific message
   */
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;

  /**
   * Track delivery status for a message
   */
  trackDelivery(messageId: string): Promise<void>;

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Get provider-specific limits
   */
  getProviderLimits(): ProviderLimits;

  /**
   * Check if the provider is healthy and operational
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Email provider error codes
 */
export enum EmailProviderErrorCode {
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  INVALID_SENDER = 'INVALID_SENDER',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  INVALID_CONTENT = 'INVALID_CONTENT',
}

/**
 * Custom error class for email provider errors
 */
export class EmailProviderError extends Error {
  constructor(
    message: string,
    public code: EmailProviderErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'EmailProviderError';
  }
}
