import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import type { ReactElement } from 'react';

interface EmailOptions {
    to: string | string[];
    subject: string;
    react?: ReactElement;
    html?: string;
    text?: string;
    from?: string;
}

interface EmailResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}

class EmailSender {
    private transporter: nodemailer.Transporter | null = null;
    private initialized = false;

    constructor() {
        this.initializeTransporter();
    }

    private async initializeTransporter() {
        if (this.initialized) return;

        try {
            const isDevelopment = process.env.NODE_ENV === 'development';

            if (isDevelopment) {
                // Use Ethereal Email for development testing
                const testAccount = await nodemailer.createTestAccount();

                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });

                console.log('Development email account created:', testAccount.user);
            } else {
                // Production email configuration
                this.transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.EMAIL_PORT || '587'),
                    secure: process.env.EMAIL_SECURE === 'true',
                    auth: {
                        user: process.env.EMAIL_USER || '',
                        pass: process.env.EMAIL_PASS || '',
                    },
                });
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
        }
    }

    async send(options: EmailOptions): Promise<EmailResult> {
        await this.initializeTransporter();

        if (!this.transporter) {
            return { success: false, error: 'Email service not initialized' };
        }

        try {
            let htmlContent = options.html;
            let textContent = options.text;

            // Render React component if provided
            if (options.react) {
                htmlContent = await render(options.react);

                // Generate text version if not provided
                if (!textContent) {
                    textContent = this.htmlToText(htmlContent);
                }
            }

            const info = await this.transporter.sendMail({
                from: options.from || process.env.EMAIL_FROM || 'noreply@uselumina.com',
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: textContent,
                html: htmlContent,
            });

            // Get preview URL for development
            const previewUrl = process.env.NODE_ENV === 'development'
                ? nodemailer.getTestMessageUrl(info) || undefined
                : undefined;

            if (previewUrl) {
                console.log('Email preview URL:', previewUrl);
            }

            return {
                success: true,
                messageId: info.messageId,
                previewUrl,
            };
        } catch (error) {
            console.error('Failed to send email:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private htmlToText(html: string): string {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/&amp;/g, '&') // Replace HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    async verifyConnection(): Promise<boolean> {
        await this.initializeTransporter();

        if (!this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('Email service verification failed:', error);
            return false;
        }
    }
}

// Create singleton instance
const emailSender = new EmailSender();

// Export the main send function
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
    return emailSender.send(options);
}

// Export the class for advanced usage
export { EmailSender };
export type { EmailOptions, EmailResult };

