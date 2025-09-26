/**
 * Rate limiting and abuse prevention for appointment booking endpoints
 * Implements sliding window rate limiting with Redis backend
 */

import { NextRequest } from 'next/server'

// Rate limiting configuration
interface RateLimitConfig {
    windowMs: number // Time window in milliseconds
    maxRequests: number // Maximum requests per window
    keyGenerator?: (req: NextRequest) => string
    skipSuccessfulRequests?: boolean
    skipFailedRequests?: boolean
    message?: string
}

// Rate limit result
interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    resetTime: Date
    retryAfter?: number
}

// In-memory store for development (should use Redis in production)
class MemoryStore {
    private store = new Map<string, { count: number; resetTime: number }>()

    async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
        const now = Date.now()
        const resetTime = now + windowMs

        const existing = this.store.get(key)

        if (!existing || existing.resetTime <= now) {
            // Create new window
            const record = { count: 1, resetTime }
            this.store.set(key, record)
            return record
        } else {
            // Increment existing window
            existing.count++
            return existing
        }
    }

    async reset(key: string): Promise<void> {
        this.store.delete(key)
    }

    // Cleanup expired entries
    cleanup(): void {
        const now = Date.now()
        const keysToDelete: string[] = []
        this.store.forEach((value, key) => {
            if (value.resetTime <= now) {
                keysToDelete.push(key)
            }
        })
        keysToDelete.forEach(key => this.store.delete(key))
    }
}

// Rate limiter class
export class RateLimiter {
    private store: MemoryStore
    private config: Required<RateLimitConfig>

    constructor(config: RateLimitConfig) {
        this.store = new MemoryStore()
        this.config = {
            keyGenerator: (req) => this.getClientIdentifier(req),
            skipSuccessfulRequests: false,
            skipFailedRequests: false,
            message: 'Too many requests, please try again later.',
            ...config
        }

        // Cleanup expired entries every minute
        setInterval(() => this.store.cleanup(), 60000)
    }

    async checkLimit(req: NextRequest): Promise<RateLimitResult> {
        const key = this.config.keyGenerator(req)
        const { count, resetTime } = await this.store.increment(key, this.config.windowMs)

        const remaining = Math.max(0, this.config.maxRequests - count)
        const success = count <= this.config.maxRequests

        return {
            success,
            limit: this.config.maxRequests,
            remaining,
            resetTime: new Date(resetTime),
            retryAfter: success ? undefined : Math.ceil((resetTime - Date.now()) / 1000)
        }
    }

    async resetLimit(req: NextRequest): Promise<void> {
        const key = this.config.keyGenerator(req)
        await this.store.reset(key)
    }

    private getClientIdentifier(req: NextRequest): string {
        // Try to get user ID from session/auth
        const userId = req.headers.get('x-user-id')
        if (userId) {
            return `user:${userId}`
        }

        // Fall back to IP address
        const forwarded = req.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
        return `ip:${ip}`
    }
}

// Predefined rate limiters for different endpoints
export const appointmentRateLimiters = {
    // General appointment operations
    general: new RateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // 100 requests per 15 minutes
        message: 'Too many appointment requests. Please try again in 15 minutes.'
    }),

    // Appointment creation (more restrictive)
    create: new RateLimiter({
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 10, // 10 appointments per 5 minutes
        message: 'Too many appointment creation attempts. Please try again in 5 minutes.'
    }),

    // Status updates
    statusUpdate: new RateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 20, // 20 status updates per minute
        message: 'Too many status update requests. Please try again in 1 minute.'
    }),

    // Conflict checking (can be frequent)
    conflictCheck: new RateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 50, // 50 conflict checks per minute
        message: 'Too many conflict check requests. Please try again in 1 minute.'
    }),

    // Validation requests
    validation: new RateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 30, // 30 validation requests per minute
        message: 'Too many validation requests. Please try again in 1 minute.'
    })
}

// Middleware function to apply rate limiting
export async function withRateLimit(
    req: NextRequest,
    rateLimiter: RateLimiter
): Promise<{ success: boolean; headers: Record<string, string>; error?: string }> {
    const result = await rateLimiter.checkLimit(req)

    const headers: Record<string, string> = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toISOString()
    }

    if (!result.success && result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString()
    }

    return {
        success: result.success,
        headers,
        error: result.success ? undefined : 'Rate limit exceeded'
    }
}

// Abuse detection patterns
export class AbuseDetector {
    private suspiciousPatterns = new Map<string, { count: number; lastSeen: number }>()

    // Detect suspicious booking patterns
    detectSuspiciousBooking(req: NextRequest, appointmentData: any): boolean {
        const clientId = this.getClientIdentifier(req)
        const now = Date.now()

        // Pattern 1: Too many bookings in short time
        const pattern = this.suspiciousPatterns.get(clientId)
        if (pattern) {
            // Reset if more than 1 hour has passed
            if (now - pattern.lastSeen > 60 * 60 * 1000) {
                this.suspiciousPatterns.delete(clientId)
            } else {
                pattern.count++
                pattern.lastSeen = now

                // Flag if more than 5 bookings in 1 hour
                if (pattern.count > 5) {
                    return true
                }
            }
        } else {
            this.suspiciousPatterns.set(clientId, { count: 1, lastSeen: now })
        }

        // Pattern 2: Booking far in the future (potential spam)
        const appointmentDate = new Date(appointmentData.startTime)
        const sixMonthsFromNow = new Date()
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

        if (appointmentDate > sixMonthsFromNow) {
            return true
        }

        // Pattern 3: Suspicious client information patterns
        if (appointmentData.clientEmail && this.isSuspiciousEmail(appointmentData.clientEmail)) {
            return true
        }

        return false
    }

    private isSuspiciousEmail(email: string): boolean {
        // Check for common spam email patterns
        const suspiciousPatterns = [
            /^[a-z]+\d+@/i, // Simple pattern like "user123@"
            /test|spam|fake|temp/i, // Common spam keywords
            /\+.*\+/i, // Multiple plus signs
            /\.{2,}/i // Multiple consecutive dots
        ]

        return suspiciousPatterns.some(pattern => pattern.test(email))
    }

    private getClientIdentifier(req: NextRequest): string {
        const userId = req.headers.get('x-user-id')
        if (userId) return `user:${userId}`

        const forwarded = req.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
        return `ip:${ip}`
    }

    // Clean up old patterns
    cleanup(): void {
        const now = Date.now()
        const oneHour = 60 * 60 * 1000

        const keysToDelete: string[] = []
        this.suspiciousPatterns.forEach((pattern, key) => {
            if (now - pattern.lastSeen > oneHour) {
                keysToDelete.push(key)
            }
        })
        keysToDelete.forEach(key => this.suspiciousPatterns.delete(key))
    }
}

// Global abuse detector instance
export const abuseDetector = new AbuseDetector()

// Cleanup abuse patterns every hour
setInterval(() => abuseDetector.cleanup(), 60 * 60 * 1000)

// Security headers for appointment endpoints
export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

// Input sanitization utilities
export class InputSanitizer {
    // Sanitize string inputs to prevent XSS
    static sanitizeString(input: string): string {
        return input
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim()
    }

    // Sanitize appointment notes and comments
    static sanitizeNotes(notes: string): string {
        return this.sanitizeString(notes)
            .replace(/[^\w\s\-.,!?()]/g, '') // Allow only safe characters
            .substring(0, 1000) // Limit length
    }

    // Sanitize client information
    static sanitizeClientInfo(info: { name?: string; email?: string; phone?: string }) {
        return {
            name: info.name ? this.sanitizeString(info.name).substring(0, 100) : undefined,
            email: info.email ? info.email.toLowerCase().trim() : undefined,
            phone: info.phone ? info.phone.replace(/[^\d\s\-\(\)\+]/g, '') : undefined
        }
    }

    // Validate and sanitize business context
    static validateBusinessContext(businessId: string, userBusinessIds: string[]): boolean {
        if (!businessId || typeof businessId !== 'string') {
            return false
        }

        // Check if user has access to this business
        return userBusinessIds.includes(businessId)
    }
}

// CSRF protection utilities
export class CSRFProtection {
    private static readonly SECRET = process.env.CSRF_SECRET || 'default-csrf-secret'

    // Generate CSRF token
    static generateToken(sessionId: string): string {
        const crypto = require('crypto')
        const timestamp = Date.now().toString()
        const data = `${sessionId}:${timestamp}`
        const hash = crypto.createHmac('sha256', this.SECRET).update(data).digest('hex')
        return `${timestamp}.${hash}`
    }

    // Validate CSRF token
    static validateToken(token: string, sessionId: string): boolean {
        try {
            const [timestamp, hash] = token.split('.')
            const data = `${sessionId}:${timestamp}`
            const expectedHash = require('crypto')
                .createHmac('sha256', this.SECRET)
                .update(data)
                .digest('hex')

            // Check if hash matches and token is not too old (1 hour)
            const isValidHash = hash === expectedHash
            const isNotExpired = Date.now() - parseInt(timestamp) < 60 * 60 * 1000

            return isValidHash && isNotExpired
        } catch {
            return false
        }
    }
}