/**
 * Rate limiting specifically for public booking endpoints
 * Implements more restrictive limits for unauthenticated users
 */

import { NextRequest } from 'next/server';

// Rate limiting configuration for public booking
interface PublicRateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string;
  message?: string;
}

// Rate limit result
interface PublicRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// In-memory store for development (should use Redis in production)
class PublicBookingMemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;

    const existing = this.store.get(key);

    if (!existing || existing.resetTime <= now) {
      // Create new window
      const record = { count: 1, resetTime };
      this.store.set(key, record);
      return record;
    } else {
      // Increment existing window
      existing.count++;
      return existing;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.store.forEach((value, key) => {
      if (value.resetTime <= now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));
  }
}

// Public booking rate limiter class
export class PublicBookingRateLimiter {
  private store: PublicBookingMemoryStore;
  private config: Required<PublicRateLimitConfig>;

  constructor(config: PublicRateLimitConfig) {
    this.store = new PublicBookingMemoryStore();
    this.config = {
      keyGenerator: req => this.getClientIdentifier(req),
      message: 'Too many requests, please try again later.',
      ...config,
    };

    // Cleanup expired entries every 2 minutes
    setInterval(() => this.store.cleanup(), 2 * 60 * 1000);
  }

  async checkLimit(req: NextRequest): Promise<PublicRateLimitResult> {
    const key = this.config.keyGenerator(req);
    const { count, resetTime } = await this.store.increment(
      key,
      this.config.windowMs
    );

    const remaining = Math.max(0, this.config.maxRequests - count);
    const success = count <= this.config.maxRequests;

    return {
      success,
      limit: this.config.maxRequests,
      remaining,
      resetTime: new Date(resetTime),
      retryAfter: success
        ? undefined
        : Math.ceil((resetTime - Date.now()) / 1000),
    };
  }

  async resetLimit(req: NextRequest): Promise<void> {
    const key = this.config.keyGenerator(req);
    await this.store.reset(key);
  }

  private getClientIdentifier(req: NextRequest): string {
    // For public endpoints, primarily use IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';

    // Add user agent hash for additional uniqueness without storing PII
    const userAgent = req.headers.get('user-agent') || '';
    const userAgentHash = this.simpleHash(userAgent);

    return `public:${ip}:${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Predefined rate limiters for public booking endpoints
export const publicBookingRateLimiters = {
  // General public booking requests (business info, services)
  general: new PublicBookingRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // 50 requests per 15 minutes per IP
    message: 'Too many booking requests. Please wait before trying again.',
  }),

  // Availability checks (more permissive as these are frequent)
  availability: new PublicBookingRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute per IP
    message: 'Too many availability requests. Please wait a moment.',
  }),

  // Client lookup (moderate restrictions)
  clientLookup: new PublicBookingRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20, // 20 requests per 5 minutes per IP
    message:
      'Too many client lookup requests. Please wait before trying again.',
  }),

  // Booking creation (most restrictive)
  bookingCreation: new PublicBookingRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 bookings per 5 minutes per IP
    message: 'Too many booking attempts. Please wait before trying again.',
  }),

  // Strict rate limiter for suspicious activity
  strict: new PublicBookingRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per 15 minutes per IP
    message: 'Request limit exceeded. Please wait before trying again.',
  }),
};

// Middleware function to apply public booking rate limiting
export async function withPublicBookingRateLimit(
  req: NextRequest,
  rateLimiter: PublicBookingRateLimiter
): Promise<{
  success: boolean;
  headers: Record<string, string>;
  error?: string;
}> {
  const result = await rateLimiter.checkLimit(req);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toISOString(),
  };

  if (!result.success && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return {
    success: result.success,
    headers,
    error: result.success ? undefined : 'Rate limit exceeded',
  };
}

// Enhanced abuse detection for public booking
export class PublicBookingAbuseDetector {
  private suspiciousPatterns = new Map<
    string,
    {
      count: number;
      lastSeen: number;
      patterns: string[];
    }
  >();

  // Detect suspicious booking patterns for public endpoints
  detectSuspiciousActivity(req: NextRequest, data?: any): boolean {
    const clientId = this.getClientIdentifier(req);
    const now = Date.now();

    // Get or create pattern tracking
    let pattern = this.suspiciousPatterns.get(clientId);
    if (!pattern) {
      pattern = { count: 0, lastSeen: now, patterns: [] };
      this.suspiciousPatterns.set(clientId, pattern);
    }

    // Reset if more than 1 hour has passed
    if (now - pattern.lastSeen > 60 * 60 * 1000) {
      pattern.count = 0;
      pattern.patterns = [];
    }

    pattern.count++;
    pattern.lastSeen = now;

    // Pattern 1: Too many requests in short time
    if (pattern.count > 20) {
      // More than 20 requests in 1 hour
      pattern.patterns.push('HIGH_FREQUENCY');
      return true;
    }

    // Pattern 2: Suspicious data patterns (if data provided)
    if (data) {
      if (this.hasSuspiciousDataPatterns(data)) {
        pattern.patterns.push('SUSPICIOUS_DATA');
        return true;
      }
    }

    // Pattern 3: Rapid sequential requests (less than 1 second apart)
    const rapidRequestThreshold = 1000; // 1 second
    if (pattern.count > 1 && now - pattern.lastSeen < rapidRequestThreshold) {
      pattern.patterns.push('RAPID_REQUESTS');
      return true;
    }

    return false;
  }

  private hasSuspiciousDataPatterns(data: any): boolean {
    // Check for suspicious email patterns
    if (data.email && this.isSuspiciousEmail(data.email)) {
      return true;
    }

    // Check for suspicious names
    if (data.firstName && this.isSuspiciousName(data.firstName)) {
      return true;
    }

    if (data.lastName && this.isSuspiciousName(data.lastName)) {
      return true;
    }

    // Check for suspicious booking patterns
    if (
      data.services &&
      Array.isArray(data.services) &&
      data.services.length > 5
    ) {
      return true; // Too many services
    }

    return false;
  }

  private isSuspiciousEmail(email: string): boolean {
    const suspiciousPatterns = [
      /^[a-z]+\d+@/i, // Simple pattern like "user123@"
      /test|spam|fake|temp|throwaway/i, // Common spam keywords
      /\+.*\+/i, // Multiple plus signs
      /\.{2,}/i, // Multiple consecutive dots
      /^.{1,2}@/i, // Very short local part
      /[0-9]{10,}@/i, // Long number sequences
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  private isSuspiciousName(name: string): boolean {
    const suspiciousPatterns = [
      /^[a-z]+\d+$/i, // Name with numbers like "john123"
      /test|fake|spam/i, // Common fake name keywords
      /^.{1,2}$/i, // Very short names
      /[^a-zA-Z\s\-']/i, // Contains non-name characters
      /(.)\1{4,}/i, // Repeated characters (aaaaa)
    ];

    return suspiciousPatterns.some(pattern => pattern.test(name));
  }

  private getClientIdentifier(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';

    const userAgent = req.headers.get('user-agent') || '';
    const userAgentHash = this.simpleHash(userAgent);

    return `public:${ip}:${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Clean up old patterns
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const keysToDelete: string[] = [];
    this.suspiciousPatterns.forEach((pattern, key) => {
      if (now - pattern.lastSeen > oneHour) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.suspiciousPatterns.delete(key));
  }
}

// Global public booking abuse detector instance
export const publicBookingAbuseDetector = new PublicBookingAbuseDetector();

// Cleanup abuse patterns every hour
setInterval(() => publicBookingAbuseDetector.cleanup(), 60 * 60 * 1000);

// Security headers specifically for public booking endpoints
export const publicBookingSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Robots-Tag': 'noindex, nofollow', // Prevent indexing of booking endpoints
};
