import { headers } from 'next/headers';
// Node's built-in UUID generator. This module previously imported `uuid`,
// which was never declared in package.json — it resolved only because
// nodemailer happened to pull it in transitively, so removing nodemailer
// broke the build. randomUUID has no dependency and is v4 by definition.
import { randomUUID as uuidv4 } from 'crypto';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface RequestSecurityContext {
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  timestamp: Date;
  method: string;
  url: string;
  referer?: string;
  origin?: string;
}

/**
 * Extract security context from server-side headers (for API routes)
 */
export async function extractServerSecurityContext(): Promise<RequestSecurityContext> {
  const headersList = await headers();
  const requestId = headersList.get('x-request-id') || uuidv4();

  return {
    ipAddress: extractServerClientIP(headersList),
    userAgent: headersList.get('user-agent') || undefined,
    requestId,
    timestamp: new Date(),
    method: headersList.get('x-method') || 'UNKNOWN',
    url: headersList.get('x-url') || 'UNKNOWN',
    referer: headersList.get('referer') || undefined,
    origin: headersList.get('origin') || undefined,
  };
}

/**
 * Extract client IP address from server-side headers
 */
function extractServerClientIP(headersList: Headers): string | undefined {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headersList.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const remoteAddr = headersList.get('remote-addr');
  if (remoteAddr) {
    return remoteAddr;
  }

  return undefined;
}

/**
 * Create security metadata object for logging
 */
export function createSecurityMetadata(
  securityContext: RequestSecurityContext,
  additionalData?: Record<string, any>
): Record<string, any> {
  return {
    ipAddress: securityContext.ipAddress,
    userAgent: securityContext.userAgent,
    requestId: securityContext.requestId,
    timestamp: securityContext.timestamp,
    method: securityContext.method,
    url: sanitizeUrl(securityContext.url),
    referer: securityContext.referer,
    origin: securityContext.origin,
    ...additionalData,
  };
}

/**
 * Sanitize URL for logging (remove sensitive query parameters)
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove sensitive query parameters
    const sensitiveParams = [
      'token',
      'password',
      'secret',
      'key',
      'auth',
      'session',
      'jwt',
      'api_key',
      'access_token',
    ];

    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original but truncated
    return url.length > 200 ? url.substring(0, 200) + '...' : url;
  }
}

/**
 * Rate limiting helper
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if request should be rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];

    // Filter out old requests
    const recentRequests = existingRequests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return true;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const existingRequests = this.requests.get(identifier) || [];
    const recentRequests = existingRequests.filter(time => time > windowStart);

    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Clear old entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);

      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// ============================================================================
// GLOBAL RATE LIMITER INSTANCES
// ============================================================================

// General API rate limiter
const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

// Strict rate limiter for sensitive operations
const strictRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

// Authentication rate limiter
const authRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes

// Cleanup rate limiters every 5 minutes
setInterval(() => {
  apiRateLimiter.cleanup();
  strictRateLimiter.cleanup();
  authRateLimiter.cleanup();
}, 300000);
