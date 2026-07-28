/**
 * ClientCommunicationFactory - Generates client reviews, communication history, and engagement metrics
 */

import { faker } from '@faker-js/faker';
import { BaseFactory } from './base-factory';
import { ValidationError, ValidationResult } from './types';

// Define types manually since Prisma client might not be updated
export interface ClientReview {
    id: string;
    businessId: string;
    clientId: string;
    appointmentId?: string;
    staffId?: string;
    rating: number;
    serviceRating?: number;
    staffRating?: number;
    comment?: string;
    serviceType?: string;
    isVerified: boolean;
    isPublic: boolean;
    businessResponse?: string;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CommunicationHistory {
    id: string;
    businessId: string;
    clientId: string;
    type: string;
    direction: string;
    channel: string;
    subject?: string;
    content: string;
    status: string;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    respondedAt?: Date;
    campaignId?: string;
    appointmentId?: string;
    automationType?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CommunicationConfiguration {
    emailEngagementRate: number;
    smsEngagementRate: number;
    reviewRate: number;
    responseRate: number;
}

export interface ReviewTemplate {
    rating: number;
    comments: string[];
    serviceTypes: string[];
}

export class ClientCommunicationFactory extends BaseFactory<any> {
    async generate(options?: any): Promise<any> {
        // Implementation for generating client communication data
        return this.generateClientReviews(options);
    }

    private readonly reviewTemplates: ReviewTemplate[] = [
        {
            rating: 5,
            comments: [
                "Absolutely amazing experience! Sarah did an incredible job with my color and cut. I've never felt more confident with my hair!",
                "Outstanding service from start to finish. The staff is so professional and talented. I'll definitely be back!",
                "Love my new look! The stylist really listened to what I wanted and delivered beyond my expectations.",
                "Best salon experience I've ever had. Clean, professional, and the results are perfect!",
                "Incredible attention to detail. My highlights look so natural and beautiful. Highly recommend!",
                "The whole team is amazing. Great atmosphere, skilled stylists, and fantastic results every time.",
                "Perfect cut and color! The stylist was so knowledgeable and gave great advice for my hair type.",
                "Exceeded all my expectations. The service was top-notch and I love how my hair turned out!"
            ],
            serviceTypes: ['Hair Cut & Style', 'Hair Color', 'Highlights', 'Balayage', 'Keratin Treatment']
        },
        {
            rating: 4,
            comments: [
                "Really happy with my haircut! The stylist was skilled and friendly. Just wish the wait time was shorter.",
                "Great service overall. My color turned out beautiful, though it took a bit longer than expected.",
                "Love the results! The staff was professional and the salon has a nice atmosphere.",
                "Good experience. The stylist did exactly what I asked for. Will come back for sure.",
                "Very pleased with my new style. The consultation was thorough and helpful.",
                "Nice salon with talented stylists. The price was fair for the quality of service.",
                "Happy with my cut and style. The staff was friendly and accommodating."
            ],
            serviceTypes: ['Hair Cut', 'Blowout', 'Hair Styling', 'Facial', 'Manicure']
        },
        {
            rating: 3,
            comments: [
                "Decent service. The cut was okay but not exactly what I was hoping for.",
                "Average experience. The staff was nice but the results were just okay.",
                "It was fine. Nothing spectacular but not bad either. Might try someone else next time.",
                "The service was professional but I expected more for the price.",
                "Okay experience. The stylist was nice but didn't seem to understand what I wanted."
            ],
            serviceTypes: ['Hair Cut', 'Basic Styling', 'Shampoo & Blowout']
        },
        {
            rating: 2,
            comments: [
                "Not happy with the results. The cut was uneven and not what I asked for.",
                "Disappointing experience. The color didn't turn out right and had to be fixed elsewhere.",
                "Poor service. Long wait time and the stylist seemed rushed.",
                "Not satisfied with my haircut. It's shorter than I wanted and looks choppy."
            ],
            serviceTypes: ['Hair Cut', 'Hair Color']
        },
        {
            rating: 1,
            comments: [
                "Terrible experience. My hair was damaged and I had to go elsewhere to fix it.",
                "Worst salon experience ever. Unprofessional staff and poor results.",
                "Completely ruined my hair. Would not recommend to anyone."
            ],
            serviceTypes: ['Hair Color', 'Chemical Treatment']
        }
    ];

    private readonly communicationTemplates = {
        EMAIL: {
            APPOINTMENT_REMINDER: {
                subject: "Appointment Reminder - Tomorrow at {{time}}",
                content: "Hi {{firstName}}, this is a friendly reminder about your appointment tomorrow at {{time}} with {{stylist}}. We look forward to seeing you!"
            },
            APPOINTMENT_CONFIRMATION: {
                subject: "Appointment Confirmed - {{date}} at {{time}}",
                content: "Hi {{firstName}}, your appointment has been confirmed for {{date}} at {{time}} with {{stylist}}. Please arrive 10 minutes early."
            },
            FOLLOW_UP: {
                subject: "How was your recent visit?",
                content: "Hi {{firstName}}, we hope you love your new look! We'd appreciate your feedback about your recent visit."
            },
            BIRTHDAY_GREETING: {
                subject: "Happy Birthday! Special offer inside 🎉",
                content: "Happy Birthday {{firstName}}! Celebrate with 20% off any service this month. Use code BIRTHDAY20."
            },
            PROMOTIONAL: {
                subject: "Special Offer - Limited Time Only!",
                content: "Hi {{firstName}}, don't miss our special promotion! Book now and save on your favorite services."
            },
            REVIEW_REQUEST: {
                subject: "We'd love your feedback!",
                content: "Hi {{firstName}}, thank you for choosing us! Please take a moment to share your experience with a review."
            }
        },
        SMS: {
            APPOINTMENT_REMINDER: {
                content: "Hi {{firstName}}! Reminder: appointment tomorrow at {{time}} with {{stylist}}. See you then!"
            },
            APPOINTMENT_CONFIRMATION: {
                content: "Hi {{firstName}}! Your appointment is confirmed for {{date}} at {{time}} with {{stylist}}."
            },
            FOLLOW_UP: {
                content: "Hi {{firstName}}! Thanks for visiting us. We hope you love your new look! 💇‍♀️"
            },
            BIRTHDAY_GREETING: {
                content: "Happy Birthday {{firstName}}! 🎉 Enjoy 20% off any service this month with code BIRTHDAY20."
            },
            PROMOTIONAL: {
                content: "Hi {{firstName}}! Special offer: 25% off highlights this week only. Book now!"
            },
            REVIEW_REQUEST: {
                content: "Hi {{firstName}}! Thanks for your visit yesterday. We'd love your feedback: {{reviewLink}}"
            }
        }
    };

    private readonly defaultConfig: CommunicationConfiguration = {
        emailEngagementRate: 0.25, // 25% open rate
        smsEngagementRate: 0.85,   // 85% open rate
        reviewRate: 0.15,          // 15% of clients leave reviews
        responseRate: 0.08         // 8% response rate to communications
    };

    /**
     * Generate client reviews for completed appointments
     */
    async generateClientReviews(config?: Partial<CommunicationConfiguration>): Promise<any[]> {
        const configuration = { ...this.defaultConfig, ...config };

        // Get completed appointments from the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const completedAppointments = await this.prisma.appointment.findMany({
            where: {
                businessId: this.businessId,
                status: 'COMPLETED',
                startTime: {
                    gte: sixMonthsAgo
                }
            },
            include: {
                client: true,
                staff: true,
                services: {
                    include: {
                        service: true
                    }
                }
            }
        });

        const reviews: any[] = [];

        for (const appointment of completedAppointments) {
            // Only some clients leave reviews
            if (!faker.datatype.boolean({ probability: configuration.reviewRate })) {
                continue;
            }

            // Determine review rating (weighted toward positive)
            const ratingWeights = [0.02, 0.03, 0.10, 0.35, 0.50]; // 1-5 stars
            const rating = faker.helpers.weightedArrayElement([
                { weight: ratingWeights[0], value: 1 },
                { weight: ratingWeights[1], value: 2 },
                { weight: ratingWeights[2], value: 3 },
                { weight: ratingWeights[3], value: 4 },
                { weight: ratingWeights[4], value: 5 }
            ]);

            // Get appropriate review template
            const template = this.reviewTemplates.find(t => t.rating === rating) || this.reviewTemplates[4];

            // Generate service-specific ratings
            const serviceRating = Math.max(1, rating + faker.number.int({ min: -1, max: 1 }));
            const staffRating = Math.max(1, rating + faker.number.int({ min: -1, max: 1 }));

            // Select comment and service type
            const comment = faker.helpers.arrayElement(template.comments);
            const serviceType = appointment.services.length > 0
                ? appointment.services[0].service.name
                : faker.helpers.arrayElement(template.serviceTypes);

            // Determine if business responded (higher chance for lower ratings)
            const shouldRespond = rating <= 3
                ? faker.datatype.boolean({ probability: 0.8 })
                : faker.datatype.boolean({ probability: 0.3 });

            let businessResponse: string | undefined;
            let respondedAt: Date | undefined;

            if (shouldRespond) {
                businessResponse = this.generateBusinessResponse(rating);
                respondedAt = new Date(appointment.startTime);
                respondedAt.setDate(respondedAt.getDate() + faker.number.int({ min: 1, max: 7 }));
            }

            // Create review date (1-14 days after appointment)
            const reviewDate = new Date(appointment.startTime);
            reviewDate.setDate(reviewDate.getDate() + faker.number.int({ min: 1, max: 14 }));

            const reviewData = {
                businessId: this.businessId,
                clientId: appointment.clientId!,
                appointmentId: appointment.id,
                staffId: appointment.staffId,
                rating: rating,
                serviceRating: serviceRating,
                staffRating: staffRating,
                comment: comment,
                serviceType: serviceType,
                isVerified: true,
                isPublic: rating >= 3, // Only show 3+ star reviews publicly
                businessResponse: businessResponse,
                respondedAt: respondedAt,
                createdAt: reviewDate,
                updatedAt: respondedAt || reviewDate
            };

            try {
                const review = await this.prisma.$executeRaw`
                    INSERT INTO client_reviews (
                        id, "businessId", "clientId", "appointmentId", "staffId",
                        rating, "serviceRating", "staffRating", comment, "serviceType",
                        "isVerified", "isPublic", "businessResponse", "respondedAt",
                        "createdAt", "updatedAt"
                    ) VALUES (
                        ${faker.string.uuid()}, ${reviewData.businessId}, ${reviewData.clientId}, 
                        ${reviewData.appointmentId}, ${reviewData.staffId}, ${reviewData.rating},
                        ${reviewData.serviceRating}, ${reviewData.staffRating}, ${reviewData.comment},
                        ${reviewData.serviceType}, ${reviewData.isVerified}, ${reviewData.isPublic},
                        ${reviewData.businessResponse}, ${reviewData.respondedAt}, 
                        ${reviewData.createdAt}, ${reviewData.updatedAt}
                    )
                `;

                reviews.push(reviewData);
            } catch (error) {
                console.warn(`Failed to create review for appointment ${appointment.id}:`, error);
            }
        }

        return reviews;
    }

    /**
     * Generate communication history for clients
     */
    async generateCommunicationHistory(config?: Partial<CommunicationConfiguration>): Promise<any[]> {
        const configuration = { ...this.defaultConfig, ...config };

        // Get all clients
        const clients = await this.prisma.client.findMany({
            where: { businessId: this.businessId },
            include: {
                appointments: {
                    orderBy: { startTime: 'asc' }
                }
            }
        });

        const communications: any[] = [];

        for (const client of clients) {
            // Generate communication history for each client
            const clientCommunications = await this.generateClientCommunications(
                client,
                configuration
            );
            communications.push(...clientCommunications);
        }

        return communications;
    }

    /**
     * Generate communication history for a specific client
     */
    private async generateClientCommunications(
        client: any,
        config: CommunicationConfiguration
    ): Promise<any[]> {
        const communications: any[] = [];

        // Generate appointment-related communications
        for (const appointment of client.appointments) {
            // Appointment confirmation (sent when booked)
            const confirmationDate = new Date(appointment.createdAt);
            communications.push(await this.createCommunication({
                clientId: client.id,
                appointmentId: appointment.id,
                type: 'EMAIL',
                direction: 'OUTBOUND',
                channel: 'EMAIL',
                automationType: 'APPOINTMENT_CONFIRMATION',
                createdAt: confirmationDate,
                config
            }));

            // Appointment reminder (sent 1 day before)
            const reminderDate = new Date(appointment.startTime);
            reminderDate.setDate(reminderDate.getDate() - 1);

            if (reminderDate > appointment.createdAt) {
                communications.push(await this.createCommunication({
                    clientId: client.id,
                    appointmentId: appointment.id,
                    type: 'SMS',
                    direction: 'OUTBOUND',
                    channel: 'SMS',
                    automationType: 'APPOINTMENT_REMINDER',
                    createdAt: reminderDate,
                    config
                }));
            }

            // Follow-up communication (for completed appointments)
            if (appointment.status === 'COMPLETED') {
                const followUpDate = new Date(appointment.startTime);
                followUpDate.setDate(followUpDate.getDate() + 1);

                communications.push(await this.createCommunication({
                    clientId: client.id,
                    appointmentId: appointment.id,
                    type: 'EMAIL',
                    direction: 'OUTBOUND',
                    channel: 'EMAIL',
                    automationType: 'FOLLOW_UP',
                    createdAt: followUpDate,
                    config
                }));

                // Review request (3 days after appointment)
                const reviewRequestDate = new Date(appointment.startTime);
                reviewRequestDate.setDate(reviewRequestDate.getDate() + 3);

                communications.push(await this.createCommunication({
                    clientId: client.id,
                    appointmentId: appointment.id,
                    type: 'SMS',
                    direction: 'OUTBOUND',
                    channel: 'SMS',
                    automationType: 'REVIEW_REQUEST',
                    createdAt: reviewRequestDate,
                    config
                }));
            }
        }

        // Generate birthday communications
        if (faker.datatype.boolean({ probability: 0.8 })) {
            const birthdayDate = faker.date.recent({ days: 365 });
            communications.push(await this.createCommunication({
                clientId: client.id,
                type: 'EMAIL',
                direction: 'OUTBOUND',
                channel: 'EMAIL',
                automationType: 'BIRTHDAY_GREETING',
                createdAt: birthdayDate,
                config
            }));
        }

        // Generate promotional communications
        const promoCount = faker.number.int({ min: 2, max: 6 });
        for (let i = 0; i < promoCount; i++) {
            const promoDate = faker.date.recent({ days: 180 });
            const promoType = faker.helpers.arrayElement(['EMAIL', 'SMS']);

            communications.push(await this.createCommunication({
                clientId: client.id,
                type: promoType,
                direction: 'OUTBOUND',
                channel: promoType,
                automationType: 'PROMOTIONAL',
                createdAt: promoDate,
                config
            }));
        }

        return communications;
    }

    /**
     * Create a single communication record
     */
    private async createCommunication(params: {
        clientId: string;
        appointmentId?: string;
        campaignId?: string;
        type: string;
        direction: string;
        channel: string;
        automationType?: string;
        createdAt: Date;
        config: CommunicationConfiguration;
    }): Promise<any> {
        const template = this.getCommunicationTemplate(params.type, params.automationType);

        // Determine engagement based on channel
        const engagementRate = params.type === 'EMAIL'
            ? params.config.emailEngagementRate
            : params.config.smsEngagementRate;

        const isDelivered = faker.datatype.boolean({ probability: 0.95 });
        const isOpened = isDelivered && faker.datatype.boolean({ probability: engagementRate });
        const isClicked = isOpened && faker.datatype.boolean({ probability: 0.12 }); // 12% CTR of opens
        const isResponded = isOpened && faker.datatype.boolean({ probability: params.config.responseRate });

        let deliveredAt: Date | undefined;
        let openedAt: Date | undefined;
        let clickedAt: Date | undefined;
        let respondedAt: Date | undefined;

        if (isDelivered) {
            deliveredAt = new Date(params.createdAt);
            deliveredAt.setMinutes(deliveredAt.getMinutes() + faker.number.int({ min: 1, max: 30 }));

            if (isOpened) {
                openedAt = new Date(deliveredAt);
                openedAt.setMinutes(openedAt.getMinutes() + faker.number.int({ min: 5, max: 1440 }));

                if (isClicked) {
                    clickedAt = new Date(openedAt);
                    clickedAt.setMinutes(clickedAt.getMinutes() + faker.number.int({ min: 1, max: 60 }));
                }

                if (isResponded) {
                    respondedAt = new Date(openedAt);
                    respondedAt.setHours(respondedAt.getHours() + faker.number.int({ min: 1, max: 48 }));
                }
            }
        }

        const communicationData = {
            id: faker.string.uuid(),
            businessId: this.businessId,
            clientId: params.clientId,
            type: params.type,
            direction: params.direction,
            channel: params.channel,
            subject: template.subject,
            content: template.content,
            status: isDelivered ? 'DELIVERED' : 'FAILED',
            deliveredAt: deliveredAt,
            openedAt: openedAt,
            clickedAt: clickedAt,
            respondedAt: respondedAt,
            campaignId: params.campaignId,
            appointmentId: params.appointmentId,
            automationType: params.automationType,
            createdAt: params.createdAt,
            updatedAt: respondedAt || clickedAt || openedAt || deliveredAt || params.createdAt
        };

        try {
            await this.prisma.$executeRaw`
                INSERT INTO communication_history (
                    id, "businessId", "clientId", type, direction, channel,
                    subject, content, status, "deliveredAt", "openedAt", "clickedAt",
                    "respondedAt", "campaignId", "appointmentId", "automationType",
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${communicationData.id}, ${communicationData.businessId}, ${communicationData.clientId},
                    ${communicationData.type}::"CommunicationType", ${communicationData.direction}::"CommunicationDirection", 
                    ${communicationData.channel}::"CommunicationChannel", ${communicationData.subject}, 
                    ${communicationData.content}, ${communicationData.status}::"CommunicationStatus",
                    ${communicationData.deliveredAt}, ${communicationData.openedAt}, ${communicationData.clickedAt},
                    ${communicationData.respondedAt}, ${communicationData.campaignId}, ${communicationData.appointmentId},
                    ${communicationData.automationType}::"AutomationType", ${communicationData.createdAt}, ${communicationData.updatedAt}
                )
            `;
        } catch (error) {
            console.warn(`Failed to create communication record:`, error);
        }

        return communicationData;
    }

    /**
     * Generate complete client communication and loyalty system
     */
    async generateCompleteSystem(): Promise<{
        reviews: any[];
        communications: any[];
        loyaltyMetrics: any;
    }> {
        console.log('🔄 Generating client reviews...');
        const reviews = await this.generateClientReviews();

        console.log('📧 Generating communication history...');
        const communications = await this.generateCommunicationHistory();

        console.log('📊 Calculating loyalty metrics...');
        const loyaltyMetrics = await this.calculateLoyaltyMetrics();

        return {
            reviews,
            communications,
            loyaltyMetrics
        };
    }

    /**
     * Calculate client retention and lifetime value metrics
     */
    private async calculateLoyaltyMetrics(): Promise<any> {
        // Get client appointment data for metrics
        const clientMetrics = await this.prisma.$queryRaw`
            SELECT 
                c.id as client_id,
                c."firstName",
                c."lastName",
                COUNT(a.id) as total_appointments,
                COUNT(CASE WHEN a.status = 'COMPLETED' THEN 1 END) as completed_appointments,
                MIN(a."startTime") as first_visit,
                MAX(a."startTime") as last_visit,
                SUM(CASE WHEN a.status = 'COMPLETED' THEN 
                    (SELECT SUM(price) FROM appointment_services WHERE "appointmentId" = a.id)
                    ELSE 0 END) as total_spent,
                AVG(CASE WHEN a.status = 'COMPLETED' THEN 
                    (SELECT SUM(price) FROM appointment_services WHERE "appointmentId" = a.id)
                    ELSE NULL END) as average_ticket
            FROM clients c
            LEFT JOIN appointments a ON c.id = a."clientId"
            WHERE c."businessId" = ${this.businessId}
            GROUP BY c.id, c."firstName", c."lastName"
            HAVING COUNT(a.id) > 0
        `;

        // Calculate retention rates
        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const retentionMetrics = {
            totalClients: (clientMetrics as any[]).length,
            activeClients: (clientMetrics as any[]).filter((c: any) =>
                new Date(c.last_visit) > threeMonthsAgo
            ).length,
            loyalClients: (clientMetrics as any[]).filter((c: any) =>
                c.completed_appointments >= 3
            ).length,
            averageLifetimeValue: (clientMetrics as any[]).reduce((sum: number, c: any) =>
                sum + (Number(c.total_spent) || 0), 0
            ) / (clientMetrics as any[]).length,
            averageTicketSize: (clientMetrics as any[]).reduce((sum: number, c: any) =>
                sum + (Number(c.average_ticket) || 0), 0
            ) / (clientMetrics as any[]).length,
            retentionRate: (clientMetrics as any[]).filter((c: any) =>
                new Date(c.last_visit) > sixMonthsAgo
            ).length / (clientMetrics as any[]).length
        };

        return retentionMetrics;
    }

    private getCommunicationTemplate(type: string, automationType?: string): { subject?: string; content: string } {
        const templates = this.communicationTemplates[type as keyof typeof this.communicationTemplates];

        if (automationType && templates[automationType as keyof typeof templates]) {
            return templates[automationType as keyof typeof templates] as { subject?: string; content: string };
        }

        // Default template
        return {
            subject: "Message from Lumina Salon",
            content: "Thank you for being a valued client!"
        };
    }

    private generateBusinessResponse(rating: number): string {
        const responses = {
            1: [
                "We sincerely apologize for your disappointing experience. Please contact us directly so we can make this right and ensure this doesn't happen again.",
                "Thank you for your feedback. We take all concerns seriously and would like to discuss how we can improve. Please reach out to us directly.",
                "We're sorry to hear about your experience. Your feedback is valuable and we'd appreciate the opportunity to address your concerns personally."
            ],
            2: [
                "Thank you for your honest feedback. We're sorry we didn't meet your expectations and would love the chance to provide you with a better experience.",
                "We appreciate you taking the time to share your thoughts. We're always working to improve and would welcome the opportunity to exceed your expectations next time.",
                "Your feedback helps us grow. We'd like to discuss your experience further and see how we can better serve you in the future."
            ],
            3: [
                "Thank you for your review! We're glad you had a decent experience and we're always working to make every visit exceptional.",
                "We appreciate your feedback and are committed to continuously improving our services. We hope to exceed your expectations on your next visit!",
                "Thanks for choosing us! We value your input and are always striving to provide the best possible experience for our clients."
            ],
            4: [
                "Thank you so much for the positive review! We're thrilled you had a great experience and look forward to seeing you again soon.",
                "We're so happy you enjoyed your visit! Thank you for taking the time to share your experience with others.",
                "Thank you for the wonderful feedback! We're delighted that you're pleased with your service and can't wait to welcome you back."
            ],
            5: [
                "Wow, thank you for this amazing review! We're absolutely thrilled that you had such a fantastic experience. You made our day!",
                "Thank you so much for the glowing review! We're over the moon that you love your results and had such a wonderful time with us.",
                "This review just made our whole team smile! Thank you for sharing your experience and for being such an amazing client."
            ]
        };

        const ratingResponses = responses[rating as keyof typeof responses] || responses[3];
        return faker.helpers.arrayElement(ratingResponses);
    }

    protected validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data.businessId) {
            errors.push({
                field: 'businessId',
                message: 'Business ID is required',
                code: 'REQUIRED_FIELD'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}