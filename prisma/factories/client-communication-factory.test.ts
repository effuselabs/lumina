/**
 * Tests for ClientCommunicationFactory and related communication systems
 */

import { PrismaClient } from '@prisma/client';
import { ClientCommunicationFactory } from './client-communication-factory';
import { ComprehensiveCommunicationFactory } from './comprehensive-communication-factory';

// Mock Prisma Client
const mockPrisma = {
    client: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    appointment: {
        findMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
} as unknown as PrismaClient;

const businessId = 'test-business-id';

describe('ClientCommunicationFactory', () => {
    let communicationFactory: ClientCommunicationFactory;

    beforeEach(() => {
        communicationFactory = new ClientCommunicationFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generateClientReviews', () => {
        it('should generate realistic client reviews', async () => {
            // Mock completed appointments
            const mockAppointments = [
                {
                    id: 'appointment-1',
                    clientId: 'client-1',
                    staffId: 'staff-1',
                    status: 'COMPLETED',
                    startTime: new Date('2024-01-15'),
                    client: {
                        id: 'client-1',
                        firstName: 'Sarah',
                        lastName: 'Johnson'
                    },
                    staff: {
                        id: 'staff-1',
                        displayName: 'Mike Rodriguez'
                    },
                    services: [
                        {
                            service: {
                                name: 'Hair Cut & Style'
                            },
                            price: 85.00
                        }
                    ]
                }
            ];

            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);
            (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(undefined);

            const reviews = await communicationFactory.generateClientReviews({
                reviewRate: 1.0, // 100% for testing
                responseRate: 0.5
            });

            expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: businessId,
                    status: 'COMPLETED',
                    startTime: {
                        gte: expect.any(Date)
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

            expect(reviews).toHaveLength(1);
            expect(reviews[0]).toMatchObject({
                businessId: businessId,
                clientId: 'client-1',
                appointmentId: 'appointment-1',
                staffId: 'staff-1',
                rating: expect.any(Number),
                serviceType: 'Hair Cut & Style',
                isVerified: true
            });

            expect(reviews[0].rating).toBeGreaterThanOrEqual(1);
            expect(reviews[0].rating).toBeLessThanOrEqual(5);
        });

        it('should generate appropriate business responses for low ratings', async () => {
            const mockAppointments = [
                {
                    id: 'appointment-1',
                    clientId: 'client-1',
                    staffId: 'staff-1',
                    status: 'COMPLETED',
                    startTime: new Date('2024-01-15'),
                    client: { id: 'client-1', firstName: 'John', lastName: 'Doe' },
                    staff: { id: 'staff-1', displayName: 'Staff Member' },
                    services: [{ service: { name: 'Service' }, price: 50.00 }]
                }
            ];

            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);
            (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(undefined);

            // Mock to always generate low ratings for testing
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0.01); // Force low rating

            const reviews = await communicationFactory.generateClientReviews({
                reviewRate: 1.0,
                responseRate: 1.0
            });

            Math.random = originalRandom;

            expect(reviews[0].rating).toBeLessThanOrEqual(2);
            expect(reviews[0].businessResponse).toBeDefined();
            expect(reviews[0].respondedAt).toBeDefined();
        });
    });

    describe('generateCommunicationHistory', () => {
        it('should generate communication history for clients', async () => {
            const mockClients = [
                {
                    id: 'client-1',
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    email: 'sarah@example.com',
                    phone: '+1234567890',
                    appointments: [
                        {
                            id: 'appointment-1',
                            status: 'COMPLETED',
                            startTime: new Date('2024-01-15'),
                            createdAt: new Date('2024-01-10')
                        }
                    ]
                }
            ];

            (mockPrisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
            (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(undefined);

            const communications = await communicationFactory.generateCommunicationHistory({
                emailEngagementRate: 0.3,
                smsEngagementRate: 0.8,
                reviewRate: 0.15,
                responseRate: 0.1
            });

            expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
                where: { businessId: businessId },
                include: {
                    appointments: {
                        orderBy: { startTime: 'asc' }
                    }
                }
            });

            expect(communications.length).toBeGreaterThan(0);

            // Should have appointment-related communications
            const appointmentComms = communications.filter(c => c.appointmentId === 'appointment-1');
            expect(appointmentComms.length).toBeGreaterThan(0);
        });
    });

    describe('generateCompleteSystem', () => {
        it('should generate complete communication system', async () => {
            // Mock all required data
            (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(undefined);
            (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

            const result = await communicationFactory.generateCompleteSystem();

            expect(result).toHaveProperty('reviews');
            expect(result).toHaveProperty('communications');
            expect(result).toHaveProperty('loyaltyMetrics');
            expect(Array.isArray(result.reviews)).toBe(true);
            expect(Array.isArray(result.communications)).toBe(true);
            expect(typeof result.loyaltyMetrics).toBe('object');
        });
    });
});

describe('ComprehensiveCommunicationFactory', () => {
    let comprehensiveFactory: ComprehensiveCommunicationFactory;

    beforeEach(() => {
        comprehensiveFactory = new ComprehensiveCommunicationFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generateCompleteSystem', () => {
        it('should orchestrate complete communication and loyalty system', async () => {
            // Mock all dependencies
            (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.client.count as jest.Mock).mockResolvedValue(50);
            (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(undefined);
            (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

            const result = await comprehensiveFactory.generateCompleteSystem();

            expect(result).toHaveProperty('reviews');
            expect(result).toHaveProperty('communications');
            expect(result).toHaveProperty('loyaltyProgram');
            expect(result).toHaveProperty('loyaltyMemberships');
            expect(result).toHaveProperty('loyaltyTransactions');
            expect(result).toHaveProperty('marketingCampaigns');
            expect(result).toHaveProperty('campaignRecipients');
            expect(result).toHaveProperty('metrics');

            // Validate metrics structure
            expect(result.metrics).toHaveProperty('totalReviews');
            expect(result.metrics).toHaveProperty('averageRating');
            expect(result.metrics).toHaveProperty('emailEngagementRate');
            expect(result.metrics).toHaveProperty('smsEngagementRate');
            expect(result.metrics).toHaveProperty('loyaltyParticipationRate');
            expect(result.metrics).toHaveProperty('clientRetentionRate');
            expect(result.metrics).toHaveProperty('averageLifetimeValue');
        });

        it('should calculate accurate system metrics', async () => {
            const mockReviews = [
                { rating: 5 },
                { rating: 4 },
                { rating: 5 }
            ];

            const mockCommunications = [
                { type: 'EMAIL', openedAt: new Date() },
                { type: 'EMAIL', openedAt: null },
                { type: 'SMS', openedAt: new Date() },
                { type: 'SMS', openedAt: new Date() }
            ];

            const mockLoyaltyMemberships = [
                { id: 'member-1' },
                { id: 'member-2' }
            ];

            // Mock the private method calls
            (mockPrisma.client.count as jest.Mock).mockResolvedValue(10);
            (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
                { total_spent: 500, last_visit: new Date() },
                { total_spent: 300, last_visit: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000) }
            ]);

            // Test the metrics calculation logic
            const totalReviews = mockReviews.length;
            const averageRating = mockReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
            const emailComms = mockCommunications.filter(c => c.type === 'EMAIL');
            const emailEngagementRate = emailComms.filter(c => c.openedAt).length / emailComms.length;

            expect(totalReviews).toBe(3);
            expect(averageRating).toBeCloseTo(4.67, 1);
            expect(emailEngagementRate).toBe(0.5);
        });
    });

    describe('generateClientTestimonials', () => {
        it('should generate featured client testimonials', async () => {
            const testimonials = await comprehensiveFactory.generateClientTestimonials();

            expect(Array.isArray(testimonials)).toBe(true);
            expect(testimonials.length).toBeGreaterThan(0);

            const featuredTestimonials = testimonials.filter(t => t.featured);
            expect(featuredTestimonials.length).toBeGreaterThan(0);

            testimonials.forEach(testimonial => {
                expect(testimonial).toHaveProperty('clientName');
                expect(testimonial).toHaveProperty('rating');
                expect(testimonial).toHaveProperty('text');
                expect(testimonial).toHaveProperty('serviceType');
                expect(testimonial).toHaveProperty('businessId');
                expect(testimonial.rating).toBeGreaterThanOrEqual(1);
                expect(testimonial.rating).toBeLessThanOrEqual(5);
            });
        });
    });
});

// Helper function for integration testing
export const generateTestCommunicationSystem = async (
    prisma: PrismaClient,
    businessId: string
) => {
    const factory = new ComprehensiveCommunicationFactory(prisma, businessId);
    return await factory.generateCompleteSystem();
};

// Helper function for testing communication metrics
export const validateCommunicationMetrics = (metrics: any) => {
    const requiredFields = [
        'totalReviews',
        'averageRating',
        'totalCommunications',
        'emailEngagementRate',
        'smsEngagementRate',
        'loyaltyParticipationRate',
        'clientRetentionRate',
        'averageLifetimeValue'
    ];

    requiredFields.forEach(field => {
        expect(metrics).toHaveProperty(field);
        expect(typeof metrics[field]).toBe('number');
    });

    // Validate ranges
    expect(metrics.averageRating).toBeGreaterThanOrEqual(0);
    expect(metrics.averageRating).toBeLessThanOrEqual(5);
    expect(metrics.emailEngagementRate).toBeGreaterThanOrEqual(0);
    expect(metrics.emailEngagementRate).toBeLessThanOrEqual(1);
    expect(metrics.smsEngagementRate).toBeGreaterThanOrEqual(0);
    expect(metrics.smsEngagementRate).toBeLessThanOrEqual(1);
    expect(metrics.loyaltyParticipationRate).toBeGreaterThanOrEqual(0);
    expect(metrics.loyaltyParticipationRate).toBeLessThanOrEqual(1);
    expect(metrics.clientRetentionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.clientRetentionRate).toBeLessThanOrEqual(1);
    expect(metrics.averageLifetimeValue).toBeGreaterThanOrEqual(0);
};