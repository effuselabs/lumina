/**
 * ComprehensiveCommunicationFactory - Orchestrates client communication, reviews, and loyalty systems
 */

import { faker } from '@faker-js/faker';
import { BaseFactory } from './base-factory';
import { ClientCommunicationFactory } from './client-communication-factory';
import { LoyaltyProgramFactory } from './loyalty-program-factory';
import { MarketingCampaignFactory } from './marketing-campaign-factory';

export interface CommunicationSystemResult {
    reviews: any[];
    communications: any[];
    loyaltyProgram: any;
    loyaltyMemberships: any[];
    loyaltyTransactions: any[];
    marketingCampaigns: any[];
    campaignRecipients: any[];
    metrics: {
        totalReviews: number;
        averageRating: number;
        totalCommunications: number;
        emailEngagementRate: number;
        smsEngagementRate: number;
        loyaltyParticipationRate: number;
        clientRetentionRate: number;
        averageLifetimeValue: number;
    };
}

export class ComprehensiveCommunicationFactory extends BaseFactory<any> {
    private clientCommunicationFactory: ClientCommunicationFactory;
    private loyaltyProgramFactory: LoyaltyProgramFactory;
    private marketingCampaignFactory: MarketingCampaignFactory;

    constructor(prisma: any, businessId: string) {
        super(prisma, businessId);
        this.clientCommunicationFactory = new ClientCommunicationFactory(prisma, businessId);
        this.loyaltyProgramFactory = new LoyaltyProgramFactory(prisma, businessId);
        this.marketingCampaignFactory = new MarketingCampaignFactory(prisma, businessId);
    }

    /**
     * Generate complete client communication and loyalty system
     */
    async generateCompleteSystem(): Promise<CommunicationSystemResult> {
        console.log('🚀 Starting comprehensive communication and loyalty system generation...');

        try {
            // Step 1: Generate loyalty program and memberships
            console.log('💎 Creating loyalty program...');
            const loyaltySystem = await this.loyaltyProgramFactory.generateLoyaltySystem();

            // Step 2: Generate marketing campaigns
            console.log('📧 Creating marketing campaigns...');
            const marketingSystem = await this.marketingCampaignFactory.generateMarketingSystem();

            // Step 3: Generate client reviews
            console.log('⭐ Generating client reviews...');
            const reviews = await this.clientCommunicationFactory.generateClientReviews({
                reviewRate: 0.18, // 18% of clients leave reviews
                responseRate: 0.10 // 10% response rate
            });

            // Step 4: Generate communication history
            console.log('💬 Creating communication history...');
            const communications = await this.clientCommunicationFactory.generateCommunicationHistory({
                emailEngagementRate: 0.28, // 28% email open rate
                smsEngagementRate: 0.87,   // 87% SMS open rate
                reviewRate: 0.18,
                responseRate: 0.10
            });

            // Step 5: Calculate comprehensive metrics
            console.log('📊 Calculating system metrics...');
            const metrics = await this.calculateSystemMetrics(
                reviews,
                communications,
                loyaltySystem.memberships
            );

            console.log('✅ Communication and loyalty system generation completed!');

            return {
                reviews,
                communications,
                loyaltyProgram: loyaltySystem.program,
                loyaltyMemberships: loyaltySystem.memberships,
                loyaltyTransactions: loyaltySystem.transactions,
                marketingCampaigns: marketingSystem.campaigns,
                campaignRecipients: marketingSystem.recipients,
                metrics
            };

        } catch (error) {
            console.error('❌ Error generating communication system:', error);
            throw error;
        }
    }

    /**
     * Calculate comprehensive system metrics
     */
    private async calculateSystemMetrics(
        reviews: any[],
        communications: any[],
        loyaltyMemberships: any[]
    ): Promise<any> {
        // Review metrics
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        // Communication metrics
        const totalCommunications = communications.length;
        const emailCommunications = communications.filter(c => c.type === 'EMAIL');
        const smsCommunications = communications.filter(c => c.type === 'SMS');

        const emailEngagementRate = emailCommunications.length > 0
            ? emailCommunications.filter(c => c.openedAt).length / emailCommunications.length
            : 0;

        const smsEngagementRate = smsCommunications.length > 0
            ? smsCommunications.filter(c => c.openedAt).length / smsCommunications.length
            : 0;

        // Loyalty metrics
        const totalClients = await this.prisma.client.count({
            where: { businessId: this.businessId }
        });

        const loyaltyParticipationRate = totalClients > 0
            ? loyaltyMemberships.length / totalClients
            : 0;

        // Client retention and lifetime value
        const retentionMetrics = await this.calculateRetentionMetrics();

        return {
            totalReviews,
            averageRating: Math.round(averageRating * 100) / 100,
            totalCommunications,
            emailEngagementRate: Math.round(emailEngagementRate * 100) / 100,
            smsEngagementRate: Math.round(smsEngagementRate * 100) / 100,
            loyaltyParticipationRate: Math.round(loyaltyParticipationRate * 100) / 100,
            clientRetentionRate: retentionMetrics.retentionRate,
            averageLifetimeValue: retentionMetrics.averageLifetimeValue
        };
    }

    /**
     * Calculate client retention and lifetime value metrics
     */
    private async calculateRetentionMetrics(): Promise<{
        retentionRate: number;
        averageLifetimeValue: number;
    }> {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const clientMetrics = await this.prisma.$queryRaw<any[]>`
            SELECT 
                c.id,
                COUNT(a.id) as total_appointments,
                MAX(a."startTime") as last_visit,
                SUM(CASE WHEN a.status = 'COMPLETED' THEN 
                    (SELECT SUM(price) FROM appointment_services WHERE "appointmentId" = a.id)
                    ELSE 0 END) as total_spent
            FROM clients c
            LEFT JOIN appointments a ON c.id = a."clientId"
            WHERE c."businessId" = ${this.businessId}
            GROUP BY c.id
            HAVING COUNT(a.id) > 0
        `;

        const activeClients = clientMetrics.filter((client: any) =>
            new Date(client.last_visit) > sixMonthsAgo
        );

        const retentionRate = clientMetrics.length > 0
            ? activeClients.length / clientMetrics.length
            : 0;

        const averageLifetimeValue = clientMetrics.length > 0
            ? clientMetrics.reduce((sum: number, client: any) =>
                sum + (Number(client.total_spent) || 0), 0
            ) / clientMetrics.length
            : 0;

        return {
            retentionRate: Math.round(retentionRate * 100) / 100,
            averageLifetimeValue: Math.round(averageLifetimeValue * 100) / 100
        };
    }

    /**
     * Generate sample client feedback and testimonials
     */
    async generateClientTestimonials(): Promise<any[]> {
        const testimonials = [
            {
                clientName: "Sarah M.",
                rating: 5,
                text: "I've been coming to Lumina for over a year now and I'm always impressed with the quality of service. My stylist really understands my hair and always delivers exactly what I'm looking for!",
                serviceType: "Hair Cut & Color",
                featured: true
            },
            {
                clientName: "Jennifer L.",
                rating: 5,
                text: "The best salon experience I've ever had! The staff is so professional and talented. I always leave feeling like a million bucks!",
                serviceType: "Full Service Package",
                featured: true
            },
            {
                clientName: "Maria R.",
                rating: 5,
                text: "Love the loyalty program! I've earned so many points and the rewards are fantastic. Plus, the service is always top-notch.",
                serviceType: "Highlights & Style",
                featured: false
            },
            {
                clientName: "Amanda K.",
                rating: 4,
                text: "Great salon with skilled stylists. The atmosphere is relaxing and I always enjoy my visits. Highly recommend!",
                serviceType: "Facial & Manicure",
                featured: false
            },
            {
                clientName: "Lisa T.",
                rating: 5,
                text: "The team at Lumina is amazing! They really care about their clients and it shows in everything they do. I wouldn't go anywhere else!",
                serviceType: "Keratin Treatment",
                featured: true
            }
        ];

        return testimonials.map(testimonial => ({
            ...testimonial,
            id: faker.string.uuid(),
            businessId: this.businessId,
            createdAt: faker.date.recent({ days: 90 }),
            isPublic: true,
            isVerified: true
        }));
    }

    /**
     * Generate communication preferences for clients
     */
    async updateClientCommunicationPreferences(): Promise<void> {
        const clients = await this.prisma.client.findMany({
            where: { businessId: this.businessId }
        });

        for (const client of clients) {
            // 90% opt-in for email, 95% opt-in for SMS
            const emailMarketing = faker.datatype.boolean({ probability: 0.90 });
            const smsMarketing = faker.datatype.boolean({ probability: 0.95 });

            await this.prisma.client.update({
                where: { id: client.id },
                data: {
                    emailMarketing,
                    smsMarketing
                }
            });
        }
    }

    protected validate(data: any): any {
        return {
            isValid: true,
            errors: [],
            warnings: []
        };
    }
}