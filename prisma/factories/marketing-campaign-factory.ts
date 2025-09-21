/**
 * MarketingCampaignFactory - Generates email and SMS marketing campaigns with engagement metrics
 */

import { faker } from '@faker-js/faker';
import { BaseFactory } from './base-factory';
import { ValidationError, ValidationResult } from './types';

// Define types manually since Prisma client might not be updated
export interface MarketingCampaign {
    id: string;
    businessId: string;
    name: string;
    description?: string;
    type: string;
    subject?: string;
    content: string;
    targetAudience: any;
    scheduledAt?: Date;
    sentAt?: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CampaignRecipient {
    id: string;
    campaignId: string;
    clientId?: string;
    email?: string;
    phone?: string;
    name?: string;
    deliveryStatus: string;
    deliveredAt?: Date;
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CampaignConfiguration {
    emailCampaigns: boolean;
    smsCampaigns: boolean;
    engagementRates: EngagementRates;
}

export interface EngagementRates {
    email: {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
    };
    sms: {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
    };
}

export interface CampaignTemplate {
    name: string;
    type: string;
    subject?: string;
    content: string;
    targetAudience: any;
    seasonal?: boolean;
}

export class MarketingCampaignFactory extends BaseFactory<MarketingCampaign> {
    private readonly campaignTemplates: CampaignTemplate[] = [
        // Email Campaigns
        {
            name: "Monthly Newsletter",
            type: 'EMAIL',
            subject: "Your Monthly Beauty Update from Lumina Salon",
            content: `
                <h2>What's New This Month</h2>
                <p>Dear {{firstName}},</p>
                <p>We hope you're having a wonderful month! Here's what's happening at Lumina Salon:</p>
                
                <h3>🌟 New Services</h3>
                <p>We're excited to introduce our new keratin smoothing treatment - perfect for managing frizz this season!</p>
                
                <h3>💄 Staff Spotlight</h3>
                <p>This month we're featuring Sarah, our master colorist who specializes in balayage and natural-looking highlights.</p>
                
                <h3>📅 Book Your Next Appointment</h3>
                <p>Don't forget to schedule your next visit. We recommend booking 6-8 weeks in advance for color services.</p>
                
                <p>Thank you for being a valued client!</p>
                <p>The Lumina Team</p>
            `,
            targetAudience: { allClients: true }
        },
        {
            name: "Appointment Reminder Campaign",
            type: 'EMAIL',
            subject: "Don't Forget - Your Appointment is Tomorrow!",
            content: `
                <h2>Appointment Reminder</h2>
                <p>Hi {{firstName}},</p>
                <p>This is a friendly reminder that you have an appointment scheduled for:</p>
                
                <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
                    <strong>Date:</strong> {{appointmentDate}}<br>
                    <strong>Time:</strong> {{appointmentTime}}<br>
                    <strong>Service:</strong> {{serviceName}}<br>
                    <strong>Stylist:</strong> {{stylistName}}
                </div>
                
                <p>Please arrive 10 minutes early. If you need to reschedule, please call us at least 24 hours in advance.</p>
                
                <p>We look forward to seeing you!</p>
            `,
            targetAudience: { hasUpcomingAppointment: true }
        },
        {
            name: "Holiday Special Promotion",
            type: 'EMAIL',
            subject: "🎄 Holiday Special - 25% Off Spa Packages",
            content: `
                <h2>Holiday Special Offer</h2>
                <p>Dear {{firstName}},</p>
                <p>The holidays are here, and we want to help you look and feel your best!</p>
                
                <h3>🎁 Special Holiday Offer</h3>
                <p><strong>25% OFF all spa packages</strong> when you book before December 20th!</p>
                
                <ul>
                    <li>Relaxation Package - Facial + Massage</li>
                    <li>Glamour Package - Hair + Makeup + Nails</li>
                    <li>Complete Wellness - Full spa day experience</li>
                </ul>
                
                <p>Use code: <strong>HOLIDAY25</strong> when booking online or mention this email when calling.</p>
                
                <p>Book now - appointments are filling up fast!</p>
            `,
            targetAudience: { allClients: true },
            seasonal: true
        },
        {
            name: "Win-Back Campaign",
            type: 'EMAIL',
            subject: "We Miss You! Come Back with 20% Off",
            content: `
                <h2>We Miss You!</h2>
                <p>Hi {{firstName}},</p>
                <p>It's been a while since your last visit, and we wanted to reach out to see how you're doing.</p>
                
                <p>We'd love to welcome you back with a special offer:</p>
                
                <div style="background: #ffe6e6; padding: 20px; text-align: center; margin: 20px 0;">
                    <h3>20% OFF your next service</h3>
                    <p>Valid for any service over $50</p>
                    <p>Code: <strong>WELCOME20</strong></p>
                </div>
                
                <p>Our team has been working on some exciting new services and techniques. We'd love to show you what's new!</p>
                
                <p>Hope to see you soon!</p>
            `,
            targetAudience: { lastVisit: { months: 6 } }
        },

        // SMS Campaigns
        {
            name: "Appointment Confirmation SMS",
            type: 'SMS',
            content: "Hi {{firstName}}! Your appointment is confirmed for {{date}} at {{time}} with {{stylist}}. Reply STOP to opt out.",
            targetAudience: { hasUpcomingAppointment: true }
        },
        {
            name: "Last Minute Availability",
            type: 'SMS',
            content: "Hi {{firstName}}! We have a last-minute opening today at {{time}}. Interested? Call us at {{phone}} or reply YES. Reply STOP to opt out.",
            targetAudience: { preferredClients: true }
        },
        {
            name: "Birthday Special SMS",
            type: 'SMS',
            content: "Happy Birthday {{firstName}}! 🎉 Celebrate with 15% off any service this month. Use code BIRTHDAY15. Reply STOP to opt out.",
            targetAudience: { birthdayMonth: true }
        },
        {
            name: "Flash Sale SMS",
            type: 'SMS',
            content: "⚡ FLASH SALE: 30% off nail services today only! Book now: {{bookingLink}} Reply STOP to opt out.",
            targetAudience: { nailClients: true }
        },
        {
            name: "Review Request SMS",
            type: 'SMS',
            content: "Hi {{firstName}}! Thanks for visiting us yesterday. We'd love your feedback: {{reviewLink}} Reply STOP to opt out.",
            targetAudience: { recentVisit: { days: 1 } }
        }
    ];

    private readonly defaultEngagementRates: EngagementRates = {
        email: {
            deliveryRate: 0.95,
            openRate: 0.25,
            clickRate: 0.03
        },
        sms: {
            deliveryRate: 0.98,
            openRate: 0.85,
            clickRate: 0.15
        }
    };

    async generate(options?: Partial<CampaignConfiguration>): Promise<MarketingCampaign> {
        const config = {
            emailCampaigns: true,
            smsCampaigns: true,
            engagementRates: this.defaultEngagementRates,
            ...options
        };

        // Select campaign template
        const template = this.selectCampaignTemplate(config);

        // Generate campaign dates
        const { scheduledAt, sentAt } = this.generateCampaignDates(template);

        // Determine campaign status
        const status = this.determineCampaignStatus(scheduledAt, sentAt);

        const campaignData = {
            businessId: this.businessId,
            name: template.name,
            description: this.generateCampaignDescription(template),
            type: template.type,
            subject: template.subject,
            content: template.content,
            targetAudience: template.targetAudience,
            scheduledAt: scheduledAt,
            sentAt: sentAt,
            status: status
        };

        const validation = this.validate(campaignData);
        if (!validation.isValid) {
            throw new Error(`Campaign validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        try {
            const campaignId = faker.string.uuid();
            await this.prisma.$executeRaw`
                INSERT INTO marketing_campaigns (
                    id, "businessId", name, description, type, subject, content,
                    "targetAudience", "scheduledAt", "sentAt", status, "createdAt", "updatedAt"
                ) VALUES (
                    ${campaignId}, ${campaignData.businessId}, ${campaignData.name},
                    ${campaignData.description}, ${campaignData.type}::"CampaignType", ${campaignData.subject},
                    ${campaignData.content}, ${JSON.stringify(campaignData.targetAudience)},
                    ${campaignData.scheduledAt}, ${campaignData.sentAt}, ${campaignData.status}::"CampaignStatus",
                    NOW(), NOW()
                )
            `;

            return {
                id: campaignId,
                ...campaignData,
                createdAt: new Date(),
                updatedAt: new Date()
            } as MarketingCampaign;
        } catch (error) {
            console.error('Failed to create marketing campaign:', error);
            throw error;
        }
    }

    /**
     * Generate recipients and engagement data for a campaign
     */
    async generateCampaignEngagement(
        campaignId: string,
        config?: Partial<CampaignConfiguration>
    ): Promise<CampaignRecipient[]> {
        const campaigns = await this.prisma.$queryRaw<MarketingCampaign[]>`
            SELECT * FROM marketing_campaigns WHERE id = ${campaignId}
        `;

        const campaign = campaigns[0];

        if (!campaign) {
            throw new Error(`Campaign with ID ${campaignId} not found`);
        }

        const engagementRates = config?.engagementRates || this.defaultEngagementRates;
        const recipients: CampaignRecipient[] = [];

        // Get target clients based on campaign audience
        const targetClients = await this.getTargetClients(campaign.targetAudience);

        for (const client of targetClients) {
            // Determine delivery status
            const rates = campaign.type === CampaignType.EMAIL
                ? engagementRates.email
                : engagementRates.sms;

            const isDelivered = faker.datatype.boolean({ probability: rates.deliveryRate });
            let deliveryStatus: string;
            let deliveredAt: Date | undefined;

            if (!isDelivered) {
                deliveryStatus = faker.helpers.arrayElement([
                    'FAILED',
                    'BOUNCED'
                ]);
            } else {
                deliveryStatus = 'DELIVERED';
                deliveredAt = campaign.sentAt || new Date();
            }

            // Determine engagement (only if delivered)
            let opened = false;
            let openedAt: Date | undefined;
            let clicked = false;
            let clickedAt: Date | undefined;

            if (deliveryStatus === 'DELIVERED') {
                opened = faker.datatype.boolean({ probability: rates.openRate });

                if (opened) {
                    openedAt = new Date(deliveredAt!);
                    openedAt.setMinutes(openedAt.getMinutes() + faker.number.int({ min: 5, max: 1440 }));

                    clicked = faker.datatype.boolean({ probability: rates.clickRate / rates.openRate });

                    if (clicked) {
                        clickedAt = new Date(openedAt);
                        clickedAt.setMinutes(clickedAt.getMinutes() + faker.number.int({ min: 1, max: 60 }));
                    }
                }
            }

            const recipientData = {
                campaignId: campaignId,
                clientId: client.id,
                email: campaign.type === 'EMAIL' ? client.email : undefined,
                phone: campaign.type === 'SMS' ? client.phone : undefined,
                name: `${client.firstName} ${client.lastName}`,
                deliveryStatus: deliveryStatus,
                deliveredAt: deliveredAt,
                opened: opened,
                openedAt: openedAt,
                clicked: clicked,
                clickedAt: clickedAt
            };

            const recipientId = faker.string.uuid();
            await this.prisma.$executeRaw`
                INSERT INTO campaign_recipients (
                    id, "campaignId", "clientId", email, phone, name,
                    "deliveryStatus", "deliveredAt", opened, "openedAt",
                    clicked, "clickedAt", "createdAt", "updatedAt"
                ) VALUES (
                    ${recipientId}, ${recipientData.campaignId}, ${recipientData.clientId},
                    ${recipientData.email}, ${recipientData.phone}, ${recipientData.name},
                    ${recipientData.deliveryStatus}::"DeliveryStatus", ${recipientData.deliveredAt},
                    ${recipientData.opened}, ${recipientData.openedAt}, ${recipientData.clicked},
                    ${recipientData.clickedAt}, NOW(), NOW()
                )
            `;

            const recipient = {
                id: recipientId,
                ...recipientData,
                createdAt: new Date(),
                updatedAt: new Date()
            } as CampaignRecipient;

            recipients.push(recipient);
        }

        return recipients;
    }

    /**
     * Generate a complete marketing campaign system
     */
    async generateMarketingSystem(): Promise<{
        campaigns: MarketingCampaign[];
        recipients: CampaignRecipient[];
    }> {
        const campaigns: MarketingCampaign[] = [];
        const recipients: CampaignRecipient[] = [];

        // Generate 10-15 campaigns over the past year
        const campaignCount = faker.number.int({ min: 10, max: 15 });

        for (let i = 0; i < campaignCount; i++) {
            const campaign = await this.generate();
            campaigns.push(campaign);

            // Generate recipients and engagement for sent campaigns
            if (campaign.status === 'SENT') {
                const campaignRecipients = await this.generateCampaignEngagement(campaign.id);
                recipients.push(...campaignRecipients);
            }
        }

        return { campaigns, recipients };
    }

    private selectCampaignTemplate(config: CampaignConfiguration): CampaignTemplate {
        let availableTemplates = [...this.campaignTemplates];

        // Filter based on configuration
        if (!config.emailCampaigns) {
            availableTemplates = availableTemplates.filter(t => t.type !== 'EMAIL');
        }

        if (!config.smsCampaigns) {
            availableTemplates = availableTemplates.filter(t => t.type !== 'SMS');
        }

        return faker.helpers.arrayElement(availableTemplates);
    }

    private generateCampaignDates(template: CampaignTemplate): {
        scheduledAt: Date | undefined;
        sentAt: Date | undefined;
    } {
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // 80% of campaigns are sent, 15% are scheduled for future, 5% are drafts
        const campaignType = faker.helpers.arrayElement([
            'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent',
            'scheduled', 'scheduled', 'scheduled',
            'draft', 'draft'
        ]);

        if (campaignType === 'draft') {
            return { scheduledAt: undefined, sentAt: undefined };
        }

        if (campaignType === 'scheduled') {
            const scheduledAt = faker.date.between({
                from: now,
                to: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
            });
            return { scheduledAt, sentAt: undefined };
        }

        // Sent campaign
        const sentAt = faker.date.between({ from: oneYearAgo, to: now });
        const scheduledAt = new Date(sentAt);
        scheduledAt.setHours(scheduledAt.getHours() - faker.number.int({ min: 1, max: 72 }));

        return { scheduledAt, sentAt };
    }

    private determineCampaignStatus(
        scheduledAt: Date | undefined,
        sentAt: Date | undefined
    ): string {
        if (!scheduledAt && !sentAt) {
            return 'DRAFT';
        }

        if (scheduledAt && !sentAt) {
            return 'SCHEDULED';
        }

        if (sentAt) {
            return 'SENT';
        }

        return 'DRAFT';
    }

    private generateCampaignDescription(template: CampaignTemplate): string {
        const descriptions: Record<string, string[]> = {
            'EMAIL': [
                "Monthly newsletter with salon updates and promotions",
                "Promotional email campaign for seasonal offers",
                "Automated appointment reminder email",
                "Re-engagement campaign for inactive clients",
                "Special occasion promotional email"
            ],
            'SMS': [
                "Appointment confirmation text message",
                "Last-minute availability notification",
                "Birthday special SMS campaign",
                "Flash sale text message promotion",
                "Post-appointment review request"
            ],
            'PUSH_NOTIFICATION': [
                "Push notification campaign",
                "Mobile app notification",
                "Real-time alert notification"
            ]
        };

        const typeDescriptions = descriptions[template.type];
        return faker.helpers.arrayElement(typeDescriptions);
    }

    private async getTargetClients(targetAudience: any): Promise<any[]> {
        // Simplified client targeting - in a real system this would be more sophisticated
        const allClients = await this.prisma.client.findMany({
            where: { businessId: this.businessId }
        });

        if (targetAudience.allClients) {
            return allClients;
        }

        if (targetAudience.preferredClients) {
            // Return top 30% of clients by appointment frequency
            return faker.helpers.arrayElements(allClients, Math.ceil(allClients.length * 0.3));
        }

        if (targetAudience.lastVisit) {
            // Return random subset for clients who haven't visited recently
            return faker.helpers.arrayElements(allClients, Math.ceil(allClients.length * 0.4));
        }

        if (targetAudience.hasUpcomingAppointment) {
            // Return random subset for appointment reminders
            return faker.helpers.arrayElements(allClients, Math.ceil(allClients.length * 0.2));
        }

        // Default to random subset
        return faker.helpers.arrayElements(allClients, Math.ceil(allClients.length * 0.6));
    }

    protected validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: 'Campaign name is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (!data.type) {
            errors.push({
                field: 'type',
                message: 'Campaign type is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (!data.content || data.content.trim().length === 0) {
            errors.push({
                field: 'content',
                message: 'Campaign content is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.type === 'EMAIL' && (!data.subject || data.subject.trim().length === 0)) {
            errors.push({
                field: 'subject',
                message: 'Email campaigns require a subject line',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.scheduledAt && data.sentAt && data.scheduledAt > data.sentAt) {
            errors.push({
                field: 'dates',
                message: 'Scheduled date cannot be after sent date',
                code: 'INVALID_VALUE'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}