/**
 * Resend Email Provider Implementation
 * 
 * Implements the EmailProvider interface using Resend as the email service.
 * Includes error handling, delivery tracking, and health checks.
 */

import { Resend } from 'resend';
import { BaseEmailProvider } from './base-email-provider';
import {
  EmailMessage,
  SendResult,
  DeliveryStatus,
  ProviderLimits,
  EmailProviderError,
  EmailProviderErrorCode,
} from './types';

/**
 * Resend email provider configuration
 */
export interface ResendProviderConfig {
  apiKey: string;
  fromEmail?: string;
  fromName?: string;
}

/**
 * Resend email provider implementation
 */
export class ResendEmailProvider extends BaseEmailProvider {
  private readonly resend: Resend;
  private readonly defaultFromEmail?: string;
  private readonly defaultFromName?: string;

  constructor(config: ResendProviderConfig) {
    super('Resend');
    
    if (!config.apiKey) {
      throw new EmailProviderError(
        'Resend API key is required',
        EmailProviderErrorCode.AUTHENTICATION_ERROR
      );
    }

    this.resend = new Resend(config.apiKey);
    this.defaultFromEmail = config.fromEmail;
    this.defaultFromName = config.fromName;
  }

  /**
   * Send email using Resend API
   */
  protected async sendEmail(email: EmailMessage): Promise<SendResult> {
    try {
      const fromAddress = email.from || this.defaultFromEmail;
      if (!fromAddress) {
        throw new EmailProviderError(
          'From email address is required',
          EmailProviderErrorCode.INVALID_SENDER
        );
      }

      // Prepare email data for Resend
      const emailData = {
        from: this.formatFromAddress(fromAddress),
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: 'businessId', value: email.businessId },
          { name: 'templateType', value: email.templateType },
          { name: 'messageId', value: email.id },
        ],
      };

      // Send email via Resend
      const response = await this.resend.emails.send(emailData);

      // Check for errors in response
      if ('error' in response && response.error) {
        throw new EmailProviderError(
          response.error.message || 'Resend API error',
          EmailProviderErrorCode.PROVIDER_ERROR,
          { response }
        );
      }

      // Extract message ID from successful response
      const messageId = 'data' in response && response.data ? response.data.id : undefined;

      return {
        success: true,
        messageId,
        providerResponse: response,
      };
    } catch (error) {
      // Handle Resend-specific errors
      if (error instanceof EmailProviderError) {
        throw error;
      }

      // Handle rate limiting
      if (this.isRateLimitError(error)) {
        throw new EmailProviderError(
          'Rate limit exceeded',
          EmailProviderErrorCode.RATE_LIMIT_EXCEEDED,
          { originalError: error }
        );
      }

      // Handle authentication errors
      if (this.isAuthenticationError(error)) {
        throw new EmailProviderError(
          'Authentication failed - invalid API key',
          EmailProviderErrorCode.AUTHENTICATION_ERROR,
          { originalError: error }
        );
      }

      // Generic provider error
      throw new EmailProviderError(
        error instanceof Error ? error.message : 'Unknown Resend error',
        EmailProviderErrorCode.PROVIDER_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get delivery status for a message
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    try {
      // Resend doesn't provide a direct status endpoint yet
      // This is a placeholder for when they add it
      // For now, we return a basic status
      return {
        messageId,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[Resend] Failed to get delivery status', {
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        messageId,
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Track delivery status for a message
   */
  async trackDelivery(messageId: string): Promise<void> {
    // Resend handles delivery tracking automatically
    // This method is a no-op for now
    console.log('[Resend] Tracking delivery for message', { messageId });
  }

  /**
   * Get Resend provider limits
   */
  getProviderLimits(): ProviderLimits {
    return {
      maxRecipientsPerMessage: 50,
      maxMessagesPerSecond: 10,
      maxMessagesPerDay: 100000,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
    };
  }

  /**
   * Check if Resend service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to send a test request to verify API key is valid
      // We'll use the domains endpoint as a lightweight check
      const response = await fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.resend.key}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[Resend] Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Format from address with optional name
   */
  private formatFromAddress(email: string): string {
    if (this.defaultFromName) {
      return `${this.defaultFromName} <${email}>`;
    }
    return email;
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('rate limit') ||
             error.message.toLowerCase().includes('too many requests');
    }
    return false;
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthenticationError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('unauthorized') ||
             error.message.toLowerCase().includes('invalid api key') ||
             error.message.toLowerCase().includes('authentication');
    }
    return false;
  }
}
