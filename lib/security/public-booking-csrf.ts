/**
 * CSRF Protection specifically for public booking endpoints
 * Implements double-submit cookie pattern for stateless CSRF protection
 */

import { createHmac, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// CSRF configuration for public booking
interface PublicCSRFConfig {
  secret: string;
  tokenName: string;
  cookieName: string;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  };
}

// Default CSRF configuration.
//
// `secret` is deliberately absent: reading it here would bind it at import
// time, so `next build` would bake in whatever was present in CI — usually
// nothing — and the running server would sign with a different key than it
// validates against. Resolved lazily in `getSecret()` instead.
const defaultConfig: Omit<PublicCSRFConfig, 'secret'> = {
  tokenName: 'x-csrf-token',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: false, // Must be accessible to JavaScript for public forms
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/api/public/booking',
  },
};

const DEVELOPMENT_CSRF_SECRET = 'lumina-development-public-booking-csrf';

export class PublicBookingCSRFProtection {
  private config: Omit<PublicCSRFConfig, 'secret'> & { secret?: string };
  private resolvedSecret?: string;

  constructor(config?: Partial<PublicCSRFConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Resolve the signing secret on first use, not at import.
   *
   * Outside development a missing secret is fatal: silently falling back to a
   * public constant would let anyone mint valid tokens, which is worse than a
   * loud failure at the first booking attempt.
   */
  private getSecret(): string {
    if (this.resolvedSecret) {
      return this.resolvedSecret;
    }

    const secret =
      this.config.secret ??
      process.env.PUBLIC_BOOKING_CSRF_SECRET ??
      process.env.NEXTAUTH_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'PUBLIC_BOOKING_CSRF_SECRET (or NEXTAUTH_SECRET) must be set in production'
        );
      }
      this.resolvedSecret = DEVELOPMENT_CSRF_SECRET;
      return this.resolvedSecret;
    }

    this.resolvedSecret = secret;
    return this.resolvedSecret;
  }

  /**
   * Generate CSRF token for public booking
   */
  generateToken(sessionIdentifier?: string): string {
    // Use session identifier or generate random one
    const identifier = sessionIdentifier || this.generateSessionIdentifier();

    // Create timestamp for token expiration
    const timestamp = Date.now();

    // Create token payload
    const payload = `${identifier}:${timestamp}`;

    // Sign the payload
    const signature = this.signPayload(payload);

    // Combine payload and signature
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  /**
   * Validate CSRF token for public booking
   */
  validateToken(token: string, cookieToken?: string): boolean {
    try {
      // Decode token
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');

      if (parts.length !== 3) {
        return false;
      }

      const [identifier, timestamp, signature] = parts;
      const payload = `${identifier}:${timestamp}`;

      // Verify signature
      const expectedSignature = this.signPayload(payload);
      if (signature !== expectedSignature) {
        return false;
      }

      // Check token expiration
      const tokenTime = parseInt(timestamp, 10);
      const now = Date.now();
      const maxAge = this.config.cookieOptions.maxAge;

      if (now - tokenTime > maxAge) {
        return false;
      }

      // For double-submit cookie pattern, verify cookie matches token
      if (cookieToken && cookieToken !== token) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }

  /**
   * Create CSRF protection middleware for public booking
   */
  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      // Only protect state-changing methods
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return null;
      }

      // Get token from header
      const headerToken = req.headers.get(this.config.tokenName);

      // Get token from cookie
      const cookieToken = req.cookies.get(this.config.cookieName)?.value;

      // Validate token
      if (!headerToken || !this.validateToken(headerToken, cookieToken)) {
        return NextResponse.json(
          {
            error: {
              type: 'CSRF_TOKEN_INVALID',
              message: 'Invalid or missing CSRF token',
              userMessage:
                'Security validation failed. Please refresh the page and try again.',
            },
          },
          {
            status: 403,
            headers: {
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'DENY',
            },
          }
        );
      }

      return null;
    };
  }

  /**
   * Add CSRF token to response headers and cookies
   */
  addTokenToResponse(
    response: NextResponse,
    sessionIdentifier?: string
  ): NextResponse {
    const token = this.generateToken(sessionIdentifier);

    // Add token to cookie
    response.cookies.set(
      this.config.cookieName,
      token,
      this.config.cookieOptions
    );

    // Add token to header for client access
    response.headers.set('X-CSRF-Token', token);

    return response;
  }

  /**
   * Generate session identifier for CSRF token
   */
  private generateSessionIdentifier(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Sign payload with HMAC
   */
  private signPayload(payload: string): string {
    return createHmac('sha256', this.getSecret()).update(payload).digest('hex');
  }

  /**
   * Extract session identifier from request for consistent token generation
   */
  getSessionIdentifier(req: NextRequest): string {
    // Try to get from existing cookie first
    const existingToken = req.cookies.get(this.config.cookieName)?.value;

    if (existingToken && this.validateToken(existingToken)) {
      try {
        const decoded = Buffer.from(existingToken, 'base64url').toString();
        const [identifier] = decoded.split(':');
        return identifier;
      } catch {
        // Fall through to generate new identifier
      }
    }

    // Generate new identifier based on request characteristics
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Create deterministic but unique identifier
    return createHmac('sha256', this.getSecret())
      .update(`${ip}:${userAgent}:${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
  }
}

// Global instance for public booking CSRF protection
export const publicBookingCSRF = new PublicBookingCSRFProtection();

/**
 * Middleware function to validate CSRF for public booking endpoints
 */
export async function validatePublicBookingCSRF(
  req: NextRequest
): Promise<NextResponse | null> {
  return publicBookingCSRF.middleware()(req);
}

/**
 * Add CSRF token to public booking response
 */
export function addCSRFTokenToResponse(
  response: NextResponse,
  req: NextRequest
): NextResponse {
  const sessionIdentifier = publicBookingCSRF.getSessionIdentifier(req);
  return publicBookingCSRF.addTokenToResponse(response, sessionIdentifier);
}

/**
 * Generate CSRF token for client-side use
 */
export function generatePublicBookingCSRFToken(
  sessionIdentifier?: string
): string {
  return publicBookingCSRF.generateToken(sessionIdentifier);
}
