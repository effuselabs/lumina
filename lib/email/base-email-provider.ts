/**
 * Base Email Provider Implementation
 *
 * Abstract base class providing common functionality for all email providers.
 * Includes error handling, logging, and validation logic.
 */

import {
  BatchSendResult,
  DeliveryStatus,
  EmailMessage,
  EmailProvider,
  EmailProviderError,
  EmailProviderErrorCode,
  ProviderLimits,
  SendResult,
} from './types';

/**
 * Abstract base class for email providers
 */
export abstract class BaseEmailProvider implements EmailProvider {
  protected readonly providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * Send a single email message
   * Includes validation and error handling
   */
  async send(email: EmailMessage): Promise<SendResult> {
    try {
      // Validate email before sending
      this.validateEmail(email);

      // Log send attempt
      this.logSendAttempt(email);

      // Call provider-specific implementation
      const result = await this.sendEmail(email);

      // Log result
      this.logSendResult(email, result);

      return result;
    } catch (error) {
      return this.handleSendError(email, error);
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBatch(emails: EmailMessage[]): Promise<BatchSendResult> {
    const results: SendResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const email of emails) {
      const result = await this.send(email);
      results.push(result);

      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    return {
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Validate email message before sending
   */
  protected validateEmail(email: EmailMessage): void {
    // Validate recipient email
    if (!email.to || !this.isValidEmail(email.to)) {
      throw new EmailProviderError(
        `Invalid recipient email: ${email.to}`,
        EmailProviderErrorCode.INVALID_RECIPIENT,
        { email: email.to }
      );
    }

    // Validate sender email
    if (!email.from || !this.isValidEmail(email.from)) {
      throw new EmailProviderError(
        `Invalid sender email: ${email.from}`,
        EmailProviderErrorCode.INVALID_SENDER,
        { email: email.from }
      );
    }

    // Validate subject
    if (!email.subject || email.subject.trim().length === 0) {
      throw new EmailProviderError(
        'Email subject is required',
        EmailProviderErrorCode.INVALID_CONTENT,
        { messageId: email.id }
      );
    }

    // Validate content
    if (
      (!email.html || email.html.trim().length === 0) &&
      (!email.text || email.text.trim().length === 0)
    ) {
      throw new EmailProviderError(
        'Email must have either HTML or text content',
        EmailProviderErrorCode.INVALID_CONTENT,
        { messageId: email.id }
      );
    }

    // Validate message size
    const messageSize = this.calculateMessageSize(email);
    const limits = this.getProviderLimits();
    if (messageSize > limits.maxMessageSize) {
      throw new EmailProviderError(
        `Message size ${messageSize} exceeds limit ${limits.maxMessageSize}`,
        EmailProviderErrorCode.MESSAGE_TOO_LARGE,
        { messageSize, limit: limits.maxMessageSize }
      );
    }
  }

  /**
   * Validate email address format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Calculate approximate message size in bytes
   */
  protected calculateMessageSize(email: EmailMessage): number {
    const htmlSize = email.html ? Buffer.byteLength(email.html, 'utf8') : 0;
    const textSize = email.text ? Buffer.byteLength(email.text, 'utf8') : 0;
    const subjectSize = Buffer.byteLength(email.subject, 'utf8');
    return htmlSize + textSize + subjectSize;
  }

  /**
   * Log send attempt
   */
  protected logSendAttempt(email: EmailMessage): void {
    console.log(`[${this.providerName}] Sending email`, {
      messageId: email.id,
      businessId: email.businessId,
      to: email.to,
      subject: email.subject,
      templateType: email.templateType,
      attemptCount: email.attemptCount,
    });
  }

  /**
   * Log send result
   */
  protected logSendResult(email: EmailMessage, result: SendResult): void {
    if (result.success) {
      console.log(`[${this.providerName}] Email sent successfully`, {
        messageId: email.id,
        providerMessageId: result.messageId,
      });
    } else {
      console.error(`[${this.providerName}] Email send failed`, {
        messageId: email.id,
        error: result.error,
      });
    }
  }

  /**
   * Handle send errors
   */
  protected handleSendError(email: EmailMessage, error: unknown): SendResult {
    console.error(`[${this.providerName}] Email send error`, {
      messageId: email.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof EmailProviderError) {
      return {
        success: false,
        error: error.message,
        providerResponse: error.details,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }

  /**
   * Provider-specific email sending implementation
   * Must be implemented by concrete providers
   */
  protected abstract sendEmail(email: EmailMessage): Promise<SendResult>;

  /**
   * Get delivery status for a specific message
   * Must be implemented by concrete providers
   */
  abstract getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;

  /**
   * Track delivery status for a message
   * Must be implemented by concrete providers
   */
  abstract trackDelivery(messageId: string): Promise<void>;

  /**
   * Get provider-specific limits
   * Must be implemented by concrete providers
   */
  abstract getProviderLimits(): ProviderLimits;

  /**
   * Check if the provider is healthy and operational
   * Must be implemented by concrete providers
   */
  abstract healthCheck(): Promise<boolean>;
}
