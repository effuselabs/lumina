/**
 * Comprehensive tests for public booking security implementation
 * Tests CSRF protection, rate limiting, input sanitization, and audit logging
 */

import { prisma } from '@/lib/prisma';
import { PublicBookingAuditEvent, publicBookingAuditLogger } from '@/lib/security/public-booking-audit';
import { publicBookingCSRF } from '@/lib/security/public-booking-csrf';
import { publicBookingSanitizer } from '@/lib/security/public-booking-sanitizer';
import { publicBookingSecurityMiddleware } from '@/lib/security/public-booking-security-middleware';
import { NextRequest } from 'next/server';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn(),
        },
        publicBookingAuditLog: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
        },
    },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Public Booking Security', () => {
    const mockBusinessId = 'cltest123456789012345678';
    const mockBusiness = {
        id: mockBusinessId,
        name: 'Test Salon',
        isActive: true,
        bookingEnabled: true,
        onlineBooking: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        asMock(mockPrisma.business.findUnique).mockResolvedValue(mockBusiness as any);
        asMock(mockPrisma.publicBookingAuditLog.create).mockResolvedValue({} as any);
    });

    describe('CSRF Protection', () => {
        it('should generate valid CSRF token', () => {
            const token = publicBookingCSRF.generateToken('test-session');
            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
        });

        it('should validate correct CSRF token', () => {
            const token = publicBookingCSRF.generateToken('test-session');
            const isValid = publicBookingCSRF.validateToken(token, token);
            expect(isValid).toBe(true);
        });

        it('should reject invalid CSRF token', () => {
            const isValid = publicBookingCSRF.validateToken('invalid-token');
            expect(isValid).toBe(false);
        });

        it('should reject expired CSRF token', () => {
            // Mock Date.now to simulate expired token
            const originalNow = Date.now;
            Date.now = jest.fn(() => originalNow() - 2 * 60 * 60 * 1000); // 2 hours ago

            const token = publicBookingCSRF.generateToken('test-session');

            Date.now = originalNow; // Reset

            const isValid = publicBookingCSRF.validateToken(token);
            expect(isValid).toBe(false);
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize client data correctly', () => {
            const dirtyData = {
                firstName: '<script>alert("xss")</script>John',
                lastName: 'Doe<img src=x onerror=alert(1)>',
                email: 'JOHN.DOE@EXAMPLE.COM',
                phone: '+1 (555) 123-4567',
                notes: 'Some notes with <b>HTML</b> tags',
                marketingOptIn: true,
            };

            const result = publicBookingSanitizer.sanitizeClientData(dirtyData);

            expect(result.sanitized.firstName).toBe('John');
            expect(result.sanitized.lastName).toBe('Doe');
            expect(result.sanitized.email).toBe('john.doe@example.com');
            expect(result.sanitized.phone).toBe('+1 (555) 123-4567');
            expect(result.sanitized.notes).toBe('Some notes with HTML tags');
            expect(result.sanitized.marketingOptIn).toBe(true);
        });

        it('should detect suspicious email patterns', () => {
            const suspiciousData = {
                firstName: 'Test',
                lastName: 'User',
                email: 'test123@tempmail.com',
                phone: '5551234567',
            };

            const result = publicBookingSanitizer.sanitizeClientData(suspiciousData);
            expect(result.violations).toContain('Email appears to be suspicious or temporary');
        });

        it('should validate service IDs format', () => {
            const bookingData = {
                services: ['invalid-id', 'cltest123456789012345678'],
                staffId: 'cltest123456789012345678',
                timeSlot: {
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    staffId: 'cltest123456789012345678',
                },
                client: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '5551234567',
                    marketingOptIn: false,
                },
            };

            const result = publicBookingSanitizer.sanitizeBookingData(bookingData);
            expect(result.violations.some((v: any) => v.includes('invalid format'))).toBe(true);
        });

        it('should limit number of services', () => {
            const bookingData = {
                services: Array(10).fill('cltest123456789012345678'), // Too many services
                staffId: 'cltest123456789012345678',
                timeSlot: {
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    staffId: 'cltest123456789012345678',
                },
                client: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '5551234567',
                    marketingOptIn: false,
                },
            };

            const result = publicBookingSanitizer.sanitizeBookingData(bookingData);
            expect(result.violations).toContain('Maximum 5 services allowed per booking');
            expect(result.sanitized.services).toHaveLength(5);
        });
    });

    describe('Audit Logging', () => {
        it('should log business access event', async () => {
            const mockRequest = new NextRequest('https://example.com/api/public/booking/test', {
                method: 'GET',
                headers: {
                    'x-forwarded-for': '192.168.1.1',
                    'user-agent': 'Mozilla/5.0 Test Browser',
                },
            });

            await publicBookingAuditLogger.logBusinessAccess(
                mockBusinessId,
                mockRequest,
                150,
                { servicesCount: 5 }
            );

            expect(mockPrisma.publicBookingAuditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    event: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    businessId: mockBusinessId,
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0 Test Browser',
                    responseTime: 150,
                    eventData: { servicesCount: 5 },
                    riskScore: expect.any(Number),
                    riskLevel: expect.any(String),
                }),
            });
        });

        it('should log booking completion with correct risk score', async () => {
            const mockRequest = new NextRequest('https://example.com/api/public/booking/test/book', {
                method: 'POST',
                headers: {
                    'x-forwarded-for': '192.168.1.1',
                    'user-agent': 'Mozilla/5.0 Test Browser',
                },
            });

            await publicBookingAuditLogger.logBookingCompleted(
                mockBusinessId,
                mockRequest,
                {
                    appointmentId: 'cltest123456789012345678',
                    clientId: 'cltest123456789012345678',
                    serviceIds: ['cltest123456789012345678'],
                    staffId: 'cltest123456789012345678',
                    totalAmount: 100,
                    isNewClient: true,
                },
                200
            );

            expect(mockPrisma.publicBookingAuditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    event: PublicBookingAuditEvent.BOOKING_COMPLETED,
                    businessId: mockBusinessId,
                    appointmentId: 'cltest123456789012345678',
                    clientId: 'cltest123456789012345678',
                    responseTime: 200,
                    riskLevel: 'LOW', // Successful booking should be low risk
                }),
            });
        });

        it('should log security violations with high risk score', async () => {
            const mockRequest = new NextRequest('https://example.com/api/public/booking/test', {
                method: 'POST',
                headers: {
                    'x-forwarded-for': '192.168.1.1',
                    'user-agent': 'Mozilla/5.0 Test Browser',
                },
            });

            await publicBookingAuditLogger.logSecurityViolation(
                mockBusinessId,
                mockRequest,
                PublicBookingAuditEvent.CSRF_VALIDATION_FAILED,
                { method: 'POST' },
                ['CSRF_FAILED']
            );

            expect(mockPrisma.publicBookingAuditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    event: PublicBookingAuditEvent.CSRF_VALIDATION_FAILED,
                    businessId: mockBusinessId,
                    securityFlags: ['CSRF_FAILED'],
                    riskLevel: 'HIGH', // Security violations should be high risk
                }),
            });
        });
    });

    describe('Security Middleware Integration', () => {
        it('should validate business context for GET requests', async () => {
            const mockRequest = new NextRequest(`https://example.com/api/public/booking/${mockBusinessId}`, {
                method: 'GET',
                headers: {
                    'x-forwarded-for': '192.168.1.1',
                    'user-agent': 'Mozilla/5.0 Test Browser',
                },
            });

            const result = await publicBookingSecurityMiddleware.validateRequest(
                mockRequest,
                {
                    requireCSRF: false,
                    rateLimiter: 'general',
                    sanitizeInput: false,
                    validateBusiness: true,
                    auditEvent: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    checkAbuse: true,
                },
                mockBusinessId
            );

            expect(result.success).toBe(true);
            expect(result.businessId).toBe(mockBusinessId);
        });

        it('should reject requests for inactive business', async () => {
            asMock(mockPrisma.business.findUnique).mockResolvedValue({
                ...mockBusiness,
                isActive: false,
            } as any);

            const mockRequest = new NextRequest(`https://example.com/api/public/booking/${mockBusinessId}`, {
                method: 'GET',
            });

            const result = await publicBookingSecurityMiddleware.validateRequest(
                mockRequest,
                {
                    requireCSRF: false,
                    rateLimiter: 'general',
                    sanitizeInput: false,
                    validateBusiness: true,
                    auditEvent: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    checkAbuse: false,
                },
                mockBusinessId
            );

            expect(result.success).toBe(false);
            expect(result.response?.status).toBe(403);
        });

        it('should reject requests for business with booking disabled', async () => {
            asMock(mockPrisma.business.findUnique).mockResolvedValue({
                ...mockBusiness,
                bookingEnabled: false,
            } as any);

            const mockRequest = new NextRequest(`https://example.com/api/public/booking/${mockBusinessId}`, {
                method: 'GET',
            });

            const result = await publicBookingSecurityMiddleware.validateRequest(
                mockRequest,
                {
                    requireCSRF: false,
                    rateLimiter: 'general',
                    sanitizeInput: false,
                    validateBusiness: true,
                    auditEvent: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    checkAbuse: false,
                },
                mockBusinessId
            );

            expect(result.success).toBe(false);
            expect(result.response?.status).toBe(403);
        });

        it('should create secure response with proper headers', () => {
            const mockRequest = new NextRequest('https://example.com/test', {
                method: 'GET',
            });

            const response = publicBookingSecurityMiddleware.createSecureResponse(
                { message: 'test' },
                mockRequest,
                {
                    status: 200,
                    addCSRFToken: true,
                }
            );

            expect(response.status).toBe(200);
            expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
            expect(response.headers.get('X-Frame-Options')).toBe('DENY');
            expect(response.headers.get('X-CSRF-Token')).toBeTruthy();
        });
    });

    describe('Business Context Validation', () => {
        it('should validate correct business ID format', async () => {
            const mockRequest = new NextRequest(`https://example.com/api/public/booking/${mockBusinessId}`, {
                method: 'GET',
            });

            const result = await publicBookingSecurityMiddleware.validateRequest(
                mockRequest,
                {
                    requireCSRF: false,
                    rateLimiter: 'general',
                    sanitizeInput: false,
                    validateBusiness: true,
                    auditEvent: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    checkAbuse: false,
                },
                mockBusinessId
            );

            expect(result.success).toBe(true);
        });

        it('should reject invalid business ID format', async () => {
            const invalidBusinessId = 'invalid-id';
            const mockRequest = new NextRequest(`https://example.com/api/public/booking/${invalidBusinessId}`, {
                method: 'GET',
            });

            const result = await publicBookingSecurityMiddleware.validateRequest(
                mockRequest,
                {
                    requireCSRF: false,
                    rateLimiter: 'general',
                    sanitizeInput: false,
                    validateBusiness: true,
                    auditEvent: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    checkAbuse: false,
                },
                invalidBusinessId
            );

            expect(result.success).toBe(false);
            expect(result.response?.status).toBe(400);
        });

        it('should reject non-existent business', async () => {
            asMock(mockPrisma.business.findUnique).mockResolvedValue(null);

            const mockRequest = new NextRequest(`https://example.com/api/public/booking/${mockBusinessId}`, {
                method: 'GET',
            });

            const result = await publicBookingSecurityMiddleware.validateRequest(
                mockRequest,
                {
                    requireCSRF: false,
                    rateLimiter: 'general',
                    sanitizeInput: false,
                    validateBusiness: true,
                    auditEvent: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
                    checkAbuse: false,
                },
                mockBusinessId
            );

            expect(result.success).toBe(false);
            expect(result.response?.status).toBe(404);
        });
    });
});

describe('Security Integration', () => {
    it('should handle complete security validation flow', async () => {
        const mockBusinessId = 'cltest123456789012345678';

        // Mock business exists and is active
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: mockBusinessId,
            name: 'Test Salon',
            isActive: true,
            bookingEnabled: true,
            onlineBooking: true,
        } as any);

        const mockRequest = new NextRequest(`https://example.com/api/public/booking/${mockBusinessId}/book`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '192.168.1.1',
                'user-agent': 'Mozilla/5.0 Test Browser',
            },
            body: JSON.stringify({
                services: ['cltest123456789012345678'],
                staffId: 'cltest123456789012345678',
                timeSlot: {
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    staffId: 'cltest123456789012345678',
                },
                client: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '5551234567',
                    marketingOptIn: false,
                },
            }),
        });

        const result = await publicBookingSecurityMiddleware.validateRequest(
            mockRequest,
            {
                requireCSRF: false, // Skip CSRF for this test
                rateLimiter: 'bookingCreation',
                sanitizeInput: true,
                validateBusiness: true,
                auditEvent: PublicBookingAuditEvent.BOOKING_INITIATED,
                checkAbuse: true,
            },
            mockBusinessId
        );

        expect(result.success).toBe(true);
        expect(result.sanitizedData).toBeDefined();
        expect(result.sanitizedData.client.firstName).toBe('John');
        expect(result.sanitizedData.client.email).toBe('john@example.com');

        // Verify audit logging was called
        expect(mockPrisma.publicBookingAuditLog.create).toHaveBeenCalled();
    });
});