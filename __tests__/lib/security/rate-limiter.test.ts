/**
 * Unit tests for rate limiting and abuse prevention
 */

import {
  AbuseDetector,
  CSRFProtection,
  InputSanitizer,
  RateLimiter,
  appointmentRateLimiters,
  withRateLimit,
} from '@/lib/security/rate-limiter';
import { NextRequest } from 'next/server';

// Mock NextRequest
function createMockRequest(
  options: {
    ip?: string;
    userId?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const headers = new Headers({
    'x-user-id': options.userId || '',
    'x-forwarded-for': options.ip || '127.0.0.1',
    ...options.headers,
  });

  return {
    headers,
    ip: options.ip || '127.0.0.1',
    url: 'http://localhost:3000/api/appointments',
  } as NextRequest;
}

describe('RateLimiter', () => {
  describe('Basic rate limiting', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 5,
      });

      const req = createMockRequest();

      // First request should succeed
      const result1 = await limiter.checkLimit(req);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);

      // Second request should succeed
      const result2 = await limiter.checkLimit(req);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 2,
      });

      const req = createMockRequest();

      // First two requests should succeed
      await limiter.checkLimit(req);
      await limiter.checkLimit(req);

      // Third request should be blocked
      const result = await limiter.checkLimit(req);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use different limits for different clients', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      const req1 = createMockRequest({ ip: '192.168.1.1' });
      const req2 = createMockRequest({ ip: '192.168.1.2' });

      // Exhaust limit for first client
      await limiter.checkLimit(req1);
      await limiter.checkLimit(req1);
      const result1 = await limiter.checkLimit(req1);
      expect(result1.success).toBe(false);

      // Second client should still have full limit
      const result2 = await limiter.checkLimit(req2);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should prefer user ID over IP for identification', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      const req1 = createMockRequest({ ip: '192.168.1.1', userId: 'user-123' });
      const req2 = createMockRequest({ ip: '192.168.1.2', userId: 'user-123' });

      // Both requests have same user ID, should share limit
      await limiter.checkLimit(req1);
      await limiter.checkLimit(req2);
      const result = await limiter.checkLimit(req1);
      expect(result.success).toBe(false);
    });
  });

  describe('withRateLimit middleware', () => {
    it('should return success headers when within limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const req = createMockRequest();
      const result = await withRateLimit(req, limiter);

      expect(result.success).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('5');
      expect(result.headers['X-RateLimit-Remaining']).toBe('4');
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return error headers when limit exceeded', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      const req = createMockRequest();

      // Exhaust limit
      await limiter.checkLimit(req);

      const result = await withRateLimit(req, limiter);

      expect(result.success).toBe(false);
      expect(result.headers['X-RateLimit-Remaining']).toBe('0');
      expect(result.headers['Retry-After']).toBeDefined();
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('Predefined rate limiters', () => {
    it('should have different limits for different operations', () => {
      expect(appointmentRateLimiters.general).toBeDefined();
      expect(appointmentRateLimiters.create).toBeDefined();
      expect(appointmentRateLimiters.statusUpdate).toBeDefined();
      expect(appointmentRateLimiters.conflictCheck).toBeDefined();
      expect(appointmentRateLimiters.validation).toBeDefined();
    });
  });
});

describe('AbuseDetector', () => {
  let detector: AbuseDetector;

  beforeEach(() => {
    detector = new AbuseDetector();
  });

  describe('Suspicious booking detection', () => {
    it('should detect too many bookings in short time', () => {
      const req = createMockRequest({ ip: '192.168.1.1' });
      const appointmentData = {
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        clientEmail: 'test@example.com',
      };

      // First 5 bookings should be fine
      for (let i = 0; i < 5; i++) {
        const result = detector.detectSuspiciousBooking(req, appointmentData);
        expect(result).toBe(false);
      }

      // 6th booking should be flagged
      const result = detector.detectSuspiciousBooking(req, appointmentData);
      expect(result).toBe(true);
    });

    it('should detect bookings too far in future', () => {
      const req = createMockRequest();
      const appointmentData = {
        startTime: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000), // 8 months from now
        clientEmail: 'test@example.com',
      };

      const result = detector.detectSuspiciousBooking(req, appointmentData);
      expect(result).toBe(true);
    });

    it('should detect suspicious email patterns', () => {
      const req = createMockRequest();
      const suspiciousEmails = [
        'user123@example.com',
        'test@spam.com',
        'fake@temp.com',
        'user+test+spam@example.com',
        'user..test@example.com',
      ];

      suspiciousEmails.forEach((email: any) => {
        const appointmentData = {
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          clientEmail: email,
        };

        const result = detector.detectSuspiciousBooking(req, appointmentData);
        expect(result).toBe(true);
      });
    });

    it('should not flag legitimate bookings', () => {
      const req = createMockRequest();
      const appointmentData = {
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        clientEmail: 'john.doe@example.com',
      };

      const result = detector.detectSuspiciousBooking(req, appointmentData);
      expect(result).toBe(false);
    });
  });
});

describe('InputSanitizer', () => {
  describe('String sanitization', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('alert("xss")Hello World');
    });

    it('should remove javascript protocols', () => {
      const input = 'javascript:alert("xss")';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss") Hello';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('Hello');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('Notes sanitization', () => {
    it('should sanitize and limit length', () => {
      const longInput = 'a'.repeat(1500) + '<script>alert("xss")</script>';
      const result = InputSanitizer.sanitizeNotes(longInput);
      expect(result.length).toBeLessThanOrEqual(1000);
      expect(result).not.toContain('<script>');
    });

    it('should allow safe characters in notes', () => {
      const input = 'Client prefers morning appointments. Call before 9 AM!';
      const result = InputSanitizer.sanitizeNotes(input);
      expect(result).toBe(input);
    });
  });

  describe('Client info sanitization', () => {
    it('should sanitize all client fields', () => {
      const input = {
        name: '<script>John Doe</script>',
        email: '  JOHN@EXAMPLE.COM  ',
        phone: '+1 (555) 123-4567 ext. 123',
      };

      const result = InputSanitizer.sanitizeClientInfo(input);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('+1 (555) 123-4567  123');
    });

    it('should handle undefined fields', () => {
      const input = { name: 'John Doe' };
      const result = InputSanitizer.sanitizeClientInfo(input);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it('should limit name length', () => {
      const input = { name: 'a'.repeat(150) };
      const result = InputSanitizer.sanitizeClientInfo(input);
      expect(result.name?.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Business context validation', () => {
    it('should validate business access', () => {
      const businessId = 'biz-123';
      const userBusinessIds = ['biz-123', 'biz-456'];

      const result = InputSanitizer.validateBusinessContext(
        businessId,
        userBusinessIds
      );
      expect(result).toBe(true);
    });

    it('should reject unauthorized business access', () => {
      const businessId = 'biz-789';
      const userBusinessIds = ['biz-123', 'biz-456'];

      const result = InputSanitizer.validateBusinessContext(
        businessId,
        userBusinessIds
      );
      expect(result).toBe(false);
    });

    it('should reject invalid business ID', () => {
      const result1 = InputSanitizer.validateBusinessContext('', ['biz-123']);
      const result2 = InputSanitizer.validateBusinessContext(null as any, [
        'biz-123',
      ]);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });
});

describe('CSRFProtection', () => {
  describe('Token generation and validation', () => {
    it('should generate valid tokens', () => {
      const sessionId = 'session-123';
      const token = CSRFProtection.generateToken(sessionId);

      expect(token).toBeDefined();
      expect(token).toContain('.');

      const isValid = CSRFProtection.validateToken(token, sessionId);
      expect(isValid).toBe(true);
    });

    it('should reject tokens for different sessions', () => {
      const token = CSRFProtection.generateToken('session-123');
      const isValid = CSRFProtection.validateToken(token, 'session-456');

      expect(isValid).toBe(false);
    });

    it('should reject malformed tokens', () => {
      const isValid1 = CSRFProtection.validateToken(
        'invalid-token',
        'session-123'
      );
      const isValid2 = CSRFProtection.validateToken('', 'session-123');

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
    });

    it('should reject expired tokens', () => {
      // Mock an old timestamp (2 hours ago)
      const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000;
      const crypto = require('crypto');
      const sessionId = 'session-123';
      const data = `${sessionId}:${oldTimestamp}`;
      const hash = crypto
        .createHmac('sha256', process.env.CSRF_SECRET || 'default-csrf-secret')
        .update(data)
        .digest('hex');
      const expiredToken = `${oldTimestamp}.${hash}`;

      const isValid = CSRFProtection.validateToken(expiredToken, sessionId);
      expect(isValid).toBe(false);
    });
  });
});
