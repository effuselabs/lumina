/**
 * Email Provider Configuration
 * 
 * Manages email provider configuration from environment variables.
 */

/**
 * Supported email providers
 */
export type EmailProviderType = 'resend' | 'sendgrid' | 'ses';

/**
 * Email configuration interface
 */
export interface EmailConfig {
  provider: EmailProviderType;
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;

  // Queue configuration
  queueEnabled: boolean;
  queueMaxDepth: number;
  queueProcessInterval: number;

  // Retry configuration
  maxRetryAttempts: number;
  retryBackoffMultiplier: number;

  // Rate limiting
  maxEmailsPerBusinessPerHour: number;
  maxEmailsPerBusinessPerDay: number;

  // Feature flags
  enableReminders: boolean;
  enableStaffNotifications: boolean;
  enableDailySummaries: boolean;

  // Testing
  testMode: boolean;
  testRecipientEmail?: string;
}

/**
 * Get email configuration from environment variables
 */
export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'resend') as EmailProviderType;
  
  // Get API key based on provider
  let apiKey = '';
  switch (provider) {
    case 'resend':
      apiKey = process.env.RESEND_API_KEY || '';
      break;
    case 'sendgrid':
      apiKey = process.env.SENDGRID_API_KEY || '';
      break;
    case 'ses':
      apiKey = process.env.AWS_SES_API_KEY || '';
      break;
  }

  return {
    provider,
    apiKey,
    fromEmail: process.env.EMAIL_FROM || 'noreply@uselumina.app',
    fromName: process.env.EMAIL_FROM_NAME || 'Lumina',
    replyToEmail: process.env.EMAIL_REPLY_TO,

    // Queue configuration
    queueEnabled: process.env.EMAIL_QUEUE_ENABLED !== 'false',
    queueMaxDepth: parseInt(process.env.EMAIL_QUEUE_MAX_DEPTH || '10000', 10),
    queueProcessInterval: parseInt(process.env.EMAIL_QUEUE_PROCESS_INTERVAL || '5000', 10),

    // Retry configuration
    maxRetryAttempts: parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS || '3', 10),
    retryBackoffMultiplier: parseInt(process.env.EMAIL_RETRY_BACKOFF_MULTIPLIER || '2', 10),

    // Rate limiting
    maxEmailsPerBusinessPerHour: parseInt(process.env.EMAIL_MAX_PER_BUSINESS_HOUR || '100', 10),
    maxEmailsPerBusinessPerDay: parseInt(process.env.EMAIL_MAX_PER_BUSINESS_DAY || '1000', 10),

    // Feature flags
    enableReminders: process.env.EMAIL_ENABLE_REMINDERS !== 'false',
    enableStaffNotifications: process.env.EMAIL_ENABLE_STAFF_NOTIFICATIONS !== 'false',
    enableDailySummaries: process.env.EMAIL_ENABLE_DAILY_SUMMARIES !== 'false',

    // Testing
    testMode: process.env.EMAIL_TEST_MODE === 'true',
    testRecipientEmail: process.env.EMAIL_TEST_RECIPIENT,
  };
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(config: EmailConfig): void {
  if (!config.apiKey) {
    throw new Error(`Email provider API key is required for ${config.provider}`);
  }

  if (!config.fromEmail) {
    throw new Error('Email from address is required');
  }

  if (config.maxRetryAttempts < 0 || config.maxRetryAttempts > 10) {
    throw new Error('Max retry attempts must be between 0 and 10');
  }

  if (config.queueMaxDepth < 100) {
    throw new Error('Queue max depth must be at least 100');
  }
}
