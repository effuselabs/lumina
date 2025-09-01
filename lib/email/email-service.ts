import { render } from '@react-email/render'
import nodemailer from 'nodemailer'
import BookingConfirmationEmail from './templates/booking-confirmation'

interface EmailConfig {
    host: string
    port: number
    secure: boolean
    auth: {
        user: string
        pass: string
    }
}

interface BookingEmailData {
    customerName: string
    customerEmail: string
    businessName: string
    serviceName: string
    staffName: string
    appointmentDate: string
    appointmentTime: string
    duration: number
    price: number
    businessAddress?: string
    businessPhone?: string
    businessEmail?: string
    appointmentId: string
    notes?: string
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null

    constructor() {
        this.initializeTransporter()
    }

    private initializeTransporter() {
        // In development, use Ethereal Email for testing
        // In production, use your actual email service (SendGrid, AWS SES, etc.)
        const isDevelopment = process.env.NODE_ENV === 'development'

        if (isDevelopment) {
            // For development, we'll create a test account
            this.createTestAccount()
        } else {
            // Production email configuration
            const emailConfig: EmailConfig = {
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER || '',
                    pass: process.env.EMAIL_PASS || '',
                },
            }

            this.transporter = nodemailer.createTransport(emailConfig)
        }
    }

    private async createTestAccount() {
        try {
            // Create a test account for development
            const testAccount = await nodemailer.createTestAccount()

            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            })

            console.log('Test email account created:', testAccount.user)
        } catch (error) {
            console.error('Failed to create test email account:', error)
        }
    }

    async sendBookingConfirmation(data: BookingEmailData): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
        if (!this.transporter) {
            return { success: false, error: 'Email service not initialized' }
        }

        try {
            // Render the email template
            const emailHtml = await render(BookingConfirmationEmail(data))
            const emailText = `
Appointment Confirmed!

Your booking at ${data.businessName} has been successfully scheduled.

Appointment Details:
- Confirmation ID: ${data.appointmentId}
- Service: ${data.serviceName}
- Staff Member: ${data.staffName}
- Date: ${data.appointmentDate}
- Time: ${data.appointmentTime}
- Duration: ${this.formatDuration(data.duration)}
- Price: ${this.formatPrice(data.price)}
${data.notes ? `- Notes: ${data.notes}` : ''}

Business Information:
${data.businessName}
${data.businessAddress || ''}
${data.businessPhone ? `Phone: ${data.businessPhone}` : ''}
${data.businessEmail ? `Email: ${data.businessEmail}` : ''}

Important Information:
• Please arrive 5-10 minutes early for your appointment
• If you need to reschedule or cancel, please contact us as soon as possible
• Bring a valid ID and any relevant medical information if applicable

Thank you for choosing ${data.businessName}! We look forward to seeing you.
      `.trim()

            // Send the email
            const info = await this.transporter.sendMail({
                from: `"${data.businessName}" <${process.env.EMAIL_FROM || 'noreply@lumina.app'}>`,
                to: data.customerEmail,
                subject: `Appointment Confirmed - ${data.businessName}`,
                text: emailText,
                html: emailHtml,
            })

            // Get preview URL for development
            const previewUrl = process.env.NODE_ENV === 'development'
                ? nodemailer.getTestMessageUrl(info) || undefined
                : undefined

            if (previewUrl) {
                console.log('Preview URL:', previewUrl)
            }

            return {
                success: true,
                messageId: info.messageId,
                previewUrl,
            }
        } catch (error) {
            console.error('Failed to send booking confirmation email:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    private formatPrice(price: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price)
    }

    private formatDuration(minutes: number): string {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60

        if (hours > 0 && mins > 0) {
            return `${hours}h ${mins}m`
        } else if (hours > 0) {
            return `${hours}h`
        } else {
            return `${mins}m`
        }
    }

    async verifyConnection(): Promise<boolean> {
        if (!this.transporter) {
            return false
        }

        try {
            await this.transporter.verify()
            return true
        } catch (error) {
            console.error('Email service verification failed:', error)
            return false
        }
    }
}

// Export a singleton instance
export const emailService = new EmailService()
export default EmailService