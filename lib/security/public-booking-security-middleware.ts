/**
 * Comprehensive security middleware for public booking endpoints
 * Combines CSRF protection, rate limiting, input sanitization, and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    auditPublicBooking,
    PublicBookingAuditEvent
} from './public-booking-audit';
import { addCSRFTokenToResponse, validatePublicBookingCSRF } from './public-booking-csrf';
import {
    publicBookingAbuseDetector,
    publicBookingRateLimiters,
    publicBookingSecurityHeaders,
    withPublicBookingRateLimit
} from './public-booking-rate-limiter';
import {
    sanitizeBookingRequestData,
    sanitizeClientBookingData
} from './public-booking-sanitizer';

// Security validation result
interface SecurityValidationResult {
    success: boolean;
    response?: NextResponse;
    sanitizedData?: any;
    businessId?: string;
    violations?: string[];
}

// Security middleware configuration
interface SecurityMiddlewareConfig {
    requireCSRF: boolean;
    rateLimiter: 'general' | 'availability' | 'clientLookup' | 'bookingCreation' | 'strict';
    sanitizeInput: boolean;
    validateBusiness: boolean;
    auditEvent: PublicBookingAuditEvent;
    checkAbuse: boolean;
}

export class PublicBookingSecurityMiddleware {
    /**
     * Apply comprehensive security validation to public booking request
     */
    async validateRequest(
        req: NextRequest,
        config: SecurityMiddlewareConfig,
        businessId?: string
    ): Promise<SecurityValidationResult> {
        const startTime = Date.now();
        let violations: string[] = [];

        try {
            // 1. Business context validation
            if (config.validateBusiness && businessId) {
                const businessValidation = await this.validateBusinessAccess(businessId, req);
                if (!businessValidation.success) {
                    return businessValidation;
                }
            }

            // 2. Rate limiting
            const rateLimitResult = await this.applyRateLimit(req, config.rateLimiter);
            if (!rateLimitResult.success) {
                // Log rate limit violation
                if (businessId) {
                    await auditPublicBooking.securityViolation(
                        businessId,
                        req,
                        PublicBookingAuditEvent.RATE_LIMIT_EXCEEDED,
                        { rateLimiter: config.rateLimiter },
                        ['RATE_LIMITED']
                    );
                }
                return rateLimitResult;
            }

            // 3. CSRF protection (for state-changing operations)
            if (config.requireCSRF) {
                const csrfResult = await this.validateCSRF(req);
                if (!csrfResult.success) {
                    // Log CSRF violation
                    if (businessId) {
                        await auditPublicBooking.securityViolation(
                            businessId,
                            req,
                            PublicBookingAuditEvent.CSRF_VALIDATION_FAILED,
                            { method: req.method },
                            ['CSRF_FAILED']
                        );
                    }
                    return csrfResult;
                }
            }

            // 4. Abuse detection
            if (config.checkAbuse) {
                const abuseResult = await this.checkForAbuse(req, businessId);
                if (!abuseResult.success) {
                    return abuseResult;
                }
            }

            // 5. Input sanitization (for requests with body)
            let sanitizedData: any = undefined;
            if (config.sanitizeInput && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
                const sanitizationResult = await this.sanitizeInput(req, businessId);
                if (!sanitizationResult.success) {
                    return sanitizationResult;
                }
                sanitizedData = sanitizationResult.sanitizedData;
                violations = sanitizationResult.violations || [];
            }

            // 6. Audit logging
            const responseTime = Date.now() - startTime;
            if (businessId) {
                await auditPublicBooking.businessAccess(
                    businessId,
                    req,
                    responseTime,
                    {
                        event: config.auditEvent,
                        violations: violations.length > 0 ? violations : undefined,
                        securityChecks: {
                            csrf: config.requireCSRF,
                            rateLimit: config.rateLimiter,
                            sanitization: config.sanitizeInput,
                            abuseDetection: config.checkAbuse,
                        },
                    }
                );
            }

            return {
                success: true,
                sanitizedData,
                businessId,
                violations,
            };

        } catch (error) {
            console.error('Security middleware error:', error);

            // Log security error
            if (businessId) {
                await auditPublicBooking.securityViolation(
                    businessId,
                    req,
                    PublicBookingAuditEvent.ERROR_OCCURRED,
                    {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        securityMiddleware: true,
                    },
                    ['SECURITY_ERROR']
                );
            }

            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: {
                            type: 'SECURITY_ERROR',
                            message: 'Security validation failed',
                            userMessage: 'We encountered a security issue. Please try again.',
                        },
                    },
                    {
                        status: 500,
                        headers: publicBookingSecurityHeaders,
                    }
                ),
            };
        }
    }

    /**
     * Create secure response with proper headers and CSRF token
     */
    createSecureResponse(
        data: any,
        req: NextRequest,
        options: {
            status?: number;
            cacheControl?: string;
            addCSRFToken?: boolean;
        } = {}
    ): NextResponse {
        const {
            status = 200,
            cacheControl = 'no-cache, no-store, must-revalidate',
            addCSRFToken = false,
        } = options;

        let response = NextResponse.json(data, {
            status,
            headers: {
                ...publicBookingSecurityHeaders,
                'Cache-Control': cacheControl,
            },
        });

        // Add CSRF token if requested
        if (addCSRFToken) {
            response = addCSRFTokenToResponse(response, req);
        }

        return response;
    }

    /**
     * Validate business access for public booking
     */
    private async validateBusinessAccess(
        businessId: string,
        req: NextRequest
    ): Promise<SecurityValidationResult> {
        try {
            // Validate business ID format
            const businessIdSchema = z.string().cuid('Invalid business ID format');
            const validationResult = businessIdSchema.safeParse(businessId);

            if (!validationResult.success) {
                return {
                    success: false,
                    response: NextResponse.json(
                        {
                            error: {
                                type: 'INVALID_BUSINESS_ID',
                                message: 'Invalid business ID format',
                                userMessage: 'The booking link appears to be invalid.',
                            },
                        },
                        {
                            status: 400,
                            headers: publicBookingSecurityHeaders,
                        }
                    ),
                };
            }

            // Check if business exists and has public booking enabled
            const { prisma } = await import('@/lib/prisma');
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                    bookingEnabled: true,
                    onlineBooking: true,
                },
            });

            if (!business) {
                return {
                    success: false,
                    response: NextResponse.json(
                        {
                            error: {
                                type: 'BUSINESS_NOT_FOUND',
                                message: 'Business not found',
                                userMessage: 'The business you are looking for could not be found.',
                            },
                        },
                        {
                            status: 404,
                            headers: publicBookingSecurityHeaders,
                        }
                    ),
                };
            }

            if (!business.isActive) {
                return {
                    success: false,
                    response: NextResponse.json(
                        {
                            error: {
                                type: 'BUSINESS_INACTIVE',
                                message: 'Business is inactive',
                                userMessage: 'This business is currently unavailable.',
                            },
                        },
                        {
                            status: 403,
                            headers: publicBookingSecurityHeaders,
                        }
                    ),
                };
            }

            if (!business.bookingEnabled || !business.onlineBooking) {
                return {
                    success: false,
                    response: NextResponse.json(
                        {
                            error: {
                                type: 'BOOKING_DISABLED',
                                message: 'Online booking is disabled',
                                userMessage: 'Online booking is currently unavailable for this business.',
                            },
                        },
                        {
                            status: 403,
                            headers: publicBookingSecurityHeaders,
                        }
                    ),
                };
            }

            return { success: true, businessId };

        } catch (error) {
            console.error('Business validation error:', error);
            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: {
                            type: 'SYSTEM_ERROR',
                            message: 'System error during business validation',
                            userMessage: 'We are experiencing technical difficulties. Please try again.',
                        },
                    },
                    {
                        status: 500,
                        headers: publicBookingSecurityHeaders,
                    }
                ),
            };
        }
    }

    /**
     * Apply rate limiting
     */
    private async applyRateLimit(
        req: NextRequest,
        limiterType: SecurityMiddlewareConfig['rateLimiter']
    ): Promise<SecurityValidationResult> {
        const rateLimiter = publicBookingRateLimiters[limiterType];
        const result = await withPublicBookingRateLimit(req, rateLimiter);

        if (!result.success) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: {
                            type: 'RATE_LIMIT_EXCEEDED',
                            message: 'Rate limit exceeded',
                            userMessage: 'Too many requests. Please wait before trying again.',
                        },
                    },
                    {
                        status: 429,
                        headers: {
                            ...publicBookingSecurityHeaders,
                            ...result.headers,
                        },
                    }
                ),
            };
        }

        return { success: true };
    }

    /**
     * Validate CSRF token
     */
    private async validateCSRF(req: NextRequest): Promise<SecurityValidationResult> {
        const csrfResult = await validatePublicBookingCSRF(req);

        if (csrfResult) {
            return {
                success: false,
                response: csrfResult,
            };
        }

        return { success: true };
    }

    /**
     * Check for suspicious activity
     */
    private async checkForAbuse(
        req: NextRequest,
        businessId?: string
    ): Promise<SecurityValidationResult> {
        try {
            const requestBody = req.method !== 'GET' ? await req.clone().json().catch(() => null) : null;
            const isSuspicious = publicBookingAbuseDetector.detectSuspiciousActivity(req, requestBody);

            if (isSuspicious) {
                // Log suspicious activity
                if (businessId) {
                    await auditPublicBooking.securityViolation(
                        businessId,
                        req,
                        PublicBookingAuditEvent.SUSPICIOUS_ACTIVITY_DETECTED,
                        {
                            requestBody: requestBody ? 'present' : 'none',
                            userAgent: req.headers.get('user-agent'),
                        },
                        ['SUSPICIOUS_ACTIVITY']
                    );
                }

                return {
                    success: false,
                    response: NextResponse.json(
                        {
                            error: {
                                type: 'SUSPICIOUS_ACTIVITY',
                                message: 'Suspicious activity detected',
                                userMessage: 'Your request appears suspicious. Please contact us directly if you need assistance.',
                            },
                        },
                        {
                            status: 403,
                            headers: publicBookingSecurityHeaders,
                        }
                    ),
                };
            }

            return { success: true };

        } catch (error) {
            console.error('Abuse detection error:', error);
            return { success: true }; // Don't block on abuse detection errors
        }
    }

    /**
     * Sanitize input data
     */
    private async sanitizeInput(
        req: NextRequest,
        businessId?: string
    ): Promise<SecurityValidationResult & { sanitizedData?: any; violations?: string[] }> {
        try {
            const body = await req.clone().json();
            let sanitizationResult: { sanitized: any; violations: string[] };

            // Determine sanitization type based on endpoint
            const url = new URL(req.url);
            const pathname = url.pathname;

            if (pathname.includes('/book')) {
                // Booking request sanitization
                sanitizationResult = sanitizeBookingRequestData(body);
            } else if (pathname.includes('/client-lookup')) {
                // Client lookup sanitization
                sanitizationResult = sanitizeClientBookingData(body);
            } else {
                // Generic sanitization
                sanitizationResult = sanitizeClientBookingData(body);
            }

            // Log sanitization violations
            if (sanitizationResult.violations.length > 0 && businessId) {
                await auditPublicBooking.inputSanitization(
                    businessId,
                    req,
                    {
                        field: 'request_body',
                        originalValue: '[REDACTED]',
                        sanitizedValue: '[REDACTED]',
                        violations: sanitizationResult.violations,
                    }
                );
            }

            // Check if violations are critical (block request)
            const criticalViolations = sanitizationResult.violations.filter(v =>
                v.includes('suspicious') || v.includes('invalid format') || v.includes('required')
            );

            if (criticalViolations.length > 0) {
                return {
                    success: false,
                    response: NextResponse.json(
                        {
                            error: {
                                type: 'VALIDATION_ERROR',
                                message: 'Input validation failed',
                                userMessage: 'Please check your input and try again.',
                                violations: criticalViolations,
                            },
                        },
                        {
                            status: 400,
                            headers: publicBookingSecurityHeaders,
                        }
                    ),
                };
            }

            return {
                success: true,
                sanitizedData: sanitizationResult.sanitized,
                violations: sanitizationResult.violations,
            };

        } catch (error) {
            console.error('Input sanitization error:', error);
            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: {
                            type: 'SANITIZATION_ERROR',
                            message: 'Input sanitization failed',
                            userMessage: 'Invalid request format. Please try again.',
                        },
                    },
                    {
                        status: 400,
                        headers: publicBookingSecurityHeaders,
                    }
                ),
            };
        }
    }
}

// Global instance
export const publicBookingSecurityMiddleware = new PublicBookingSecurityMiddleware();

/**
 * Convenience function for applying security to GET requests
 */
export async function securePublicBookingGET(
    req: NextRequest,
    businessId: string,
    auditEvent: PublicBookingAuditEvent = PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED
): Promise<SecurityValidationResult> {
    return publicBookingSecurityMiddleware.validateRequest(req, {
        requireCSRF: false,
        rateLimiter: 'general',
        sanitizeInput: false,
        validateBusiness: true,
        auditEvent,
        checkAbuse: true,
    }, businessId);
}

/**
 * Convenience function for applying security to POST requests
 */
export async function securePublicBookingPOST(
    req: NextRequest,
    businessId: string,
    options: {
        rateLimiter?: SecurityMiddlewareConfig['rateLimiter'];
        auditEvent?: PublicBookingAuditEvent;
    } = {}
): Promise<SecurityValidationResult> {
    const {
        rateLimiter = 'bookingCreation',
        auditEvent = PublicBookingAuditEvent.BOOKING_INITIATED,
    } = options;

    return publicBookingSecurityMiddleware.validateRequest(req, {
        requireCSRF: true,
        rateLimiter,
        sanitizeInput: true,
        validateBusiness: true,
        auditEvent,
        checkAbuse: true,
    }, businessId);
}

/**
 * Create secure response with proper security headers
 */
export function createSecurePublicBookingResponse(
    data: any,
    req: NextRequest,
    options: {
        status?: number;
        cacheControl?: string;
        addCSRFToken?: boolean;
    } = {}
): NextResponse {
    return publicBookingSecurityMiddleware.createSecureResponse(data, req, options);
}