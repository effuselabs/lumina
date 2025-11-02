/**
 * Email Provider Factory
 * 
 * Factory for creating email provider instances based on configuration.
 * Supports multiple providers and testing modes.
 */

import { EmailProvider } from './types';
import { ResendEmailProvider } from './resend-provider';
import { EmailConfig, EmailProviderType } from './email-config';

/**
 * Email provider factory class
 */
export class EmailProviderFactory {
  private static instance: EmailProvider | null = null;

  /**
   * Create an email provider instance based on configuration
   */
  static createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'resend':
        return new ResendEmailProvider({
          apiKey: config.apiKey,
          fromEmail: config.fromEmail,
          fromName: config.fromName,
        });

      case 'sendgrid':
        throw new Error('SendGrid provider not yet implemented');

      case 'ses':
        throw new Error('AWS SES provider not yet implemented');

      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  /**
   * Get or create a singleton email provider instance
   */
  static getProvider(config: EmailConfig): EmailProvider {
    if (!this.instance) {
      this.instance = this.createProvider(config);
    }
    return this.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetProvider(): void {
    this.instance = null;
  }

  /**
   * Create a test provider with mock configuration
   */
  static createTestProvider(providerType: EmailProviderType = 'resend'): EmailProvider {
    const testConfig: EmailConfig = {
      provider: providerType,
      apiKey: 'test-api-key',
      fromEmail: 'test@example.com',
      fromName: 'Test Sender',
      queueEnabled: false,
      queueMaxDepth: 1000,
      queueProcessInterval: 5000,
      maxRetryAttempts: 3,
      retryBackoffMultiplier: 2,
      maxEmailsPerBusinessPerHour: 100,
      maxEmailsPerBusinessPerDay: 1000,
      enableReminders: true,
      enableStaffNotifications: true,
      enableDailySummaries: true,
      testMode: true,
      testRecipientEmail: 'test@example.com',
    };

    return this.createProvider(testConfig);
  }
}

/**
 * Get the default email provider instance
 */
export function getEmailProvider(config: EmailConfig): EmailProvider {
  return EmailProviderFactory.getProvider(config);
}

/**
 * Create a new email provider instance (non-singleton)
 */
export function createEmailProvider(config: EmailConfig): EmailProvider {
  return EmailProviderFactory.createProvider(config);
}
