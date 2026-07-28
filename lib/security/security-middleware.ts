import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
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

export interface SecurityHeaders {
  'x-forwarded-for'?: string;
  'x-real-ip'?: string;
  'user-agent'?: string;
  referer?: string;
  origin?: string;
  'x-request-id'?: string;
}

// ============================================================================
// SECURITY MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Extract security context from Next.js request
 */
export function extractRequestSecurityContext(
  request: NextRequest
): RequestSecurityContext {
  const requestId = request.headers.get('x-request-id') || uuidv4();

  return {
    ipAddress: extractClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    requestId,
    timestamp: new Date(),
    method: request.method,
    url: request.url,
    referer: request.headers.get('referer') || undefined,
    origin: request.headers.get('origin') || undefined,
  };
}

/**
 * Extract security context from server-side headers (for API routes)
 */
export function extractServerSecurityContext(): RequestSecurityContext {
  const headersList = headers();
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
 * Extract client IP address from Next.js request
 */
export function extractClientIP(request: NextRequest): string | undefined {
  // Check various headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const remoteAddr = request.headers.get('remote-addr');
  if (remoteAddr) {
    return remoteAddr;
  }

  // Fallback to connection remote address (may not be available in all environments)
  return request.ip || undefined;
}

/**
 * Extract client IP address from server-side headers
 */
export function extractServerClientIP(
  headersList: Headers
): string | undefined {
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
export function sanitizeUrl(url: string): string {
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
 * Validate request origin for CSRF protection
 */
export function validateRequestOrigin(
  request: NextRequest,
  allowedOrigins: string[]
): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    return false;
  }

  // Check origin
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if request is from a suspicious source
 */
export function detectSuspiciousActivity(
  securityContext: RequestSecurityContext,
  previousRequests?: RequestSecurityContext[]
): {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number;
} {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check for missing user agent
  if (!securityContext.userAgent) {
    reasons.push('Missing user agent');
    riskScore += 20;
  }

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    'curl',
    'wget',
    'python-requests',
    'bot',
    'crawler',
    'spider',
  ];

  if (securityContext.userAgent) {
    const userAgentLower = securityContext.userAgent.toLowerCase();
    if (
      suspiciousUserAgents.some(pattern => userAgentLower.includes(pattern))
    ) {
      reasons.push('Suspicious user agent');
      riskScore += 30;
    }
  }

  // Check for rapid requests from same IP
  if (previousRequests && securityContext.ipAddress) {
    const recentRequests = previousRequests.filter(
      req =>
        req.ipAddress === securityContext.ipAddress &&
        req.timestamp.getTime() > Date.now() - 60000 // Last minute
    );

    if (recentRequests.length > 10) {
      reasons.push('High request frequency');
      riskScore += 40;
    }
  }

  // Check for missing referer on sensitive operations
  if (securityContext.method === 'POST' && !securityContext.referer) {
    reasons.push('Missing referer on POST request');
    riskScore += 15;
  }

  return {
    isSuspicious: riskScore >= 50,
    reasons,
    riskScore,
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
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
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

// Strict rate limiter for sensitive operations
export const strictRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

// Authentication rate limiter
export const authRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes

// Cleanup rate limiters every 5 minutes
setInterval(() => {
  apiRateLimiter.cleanup();
  strictRateLimiter.cleanup();
  authRateLimiter.cleanup();
}, 300000);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate security headers for responses
 */
export function generateSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  };
}

/**
 * Log security event for monitoring
 */
export function logSecurityEvent(
  event: string,
  securityContext: RequestSecurityContext,
  details?: Record<string, any>
): void {
  console.log('Security Event:', {
    event,
    timestamp: securityContext.timestamp,
    requestId: securityContext.requestId,
    ipAddress: securityContext.ipAddress,
    userAgent: securityContext.userAgent,
    method: securityContext.method,
    url: sanitizeUrl(securityContext.url),
    details,
  });
}
