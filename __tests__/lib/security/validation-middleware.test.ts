/**
 * Unit tests for validation middleware
 */

// Mock Next.js server components before importing
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Map(),
    })),
  },
}));

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  ValidationMiddleware,
  appointmentValidators,
  validateAppointmentRequest,
} from '../../../lib/security/validation-middleware';

// Mock dependencies
jest.mock('@/lib/security/rate-limiter', () => ({
  appointmentRateLimiters: {
    general: { checkLimit: jest.fn() },
    create: { checkLimit: jest.fn() },
    statusUpdate: { checkLimit: jest.fn() },
    conflictCheck: { checkLimit: jest.fn() },
    validation: { checkLimit: jest.fn() },
  },
  withRateLimit: jest.fn(),
  abuseDetector: {
    detectSuspiciousBooking: jest.fn(),
  },
  InputSanitizer: {
    sanitizeString: jest.fn(str => str),
    sanitizeNotes: jest.fn(str => str),
    sanitizeClientInfo: jest.fn(info => info),
    validateBusinessContext: jest.fn(() => true),
  },
  CSRFProtection: {
    validateToken: jest.fn(() => true),
  },
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
  },
}));

jest.mock('@/lib/monitoring/availability-logger', () => ({
  availabilityLogger: {
    log: jest.fn(),
  },
  LogLevel: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL',
  },
}));

// Mock NextRequest
function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    ...options.headers,
  });

  const url = new URL(options.url || 'http://localhost:3000/api/appointments');

  const mockRequest = {
    method: options.method || 'POST',
    url: options.url || 'http://localhost:3000/api/appointments',
    headers,
    text: jest.fn().mockResolvedValue(JSON.stringify(options.body || {})),
    ip: '127.0.0.1',
    nextUrl: {
      searchParams: url.searchParams,
    },
  } as unknown as NextRequest;

  return mockRequest;
}

describe('ValidationMiddleware', () => {
  const {
    withRateLimit,
    abuseDetector,
    InputSanitizer,
    CSRFProtection,
  } = require('@/lib/security/rate-limiter');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue({ success: true, headers: {} });
    abuseDetector.detectSuspiciousBooking.mockReturnValue(false);
    InputSanitizer.sanitizeString.mockImplementation((str: string) => str);
    InputSanitizer.sanitizeNotes.mockImplementation((str: string) => str);
    InputSanitizer.sanitizeClientInfo.mockImplementation((info: any) => info);
    CSRFProtection.validateToken.mockReturnValue(true);
  });

  describe('Basic validation', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0),
    });

    it('should validate correct data', async () => {
      const req = createMockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });
    });

    it('should reject invalid data', async () => {
      const req = createMockRequest({
        body: {
          name: '',
          email: 'invalid-email',
          age: -5,
        },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors?.[0].field).toBe('name');
      expect(result.errors?.[1].field).toBe('email');
      expect(result.errors?.[2].field).toBe('age');
    });

    it('should handle invalid JSON', async () => {
      const req = createMockRequest();
      req.text = jest.fn().mockResolvedValue('invalid json');

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('INVALID_JSON');
    });

    it('should handle empty body', async () => {
      const req = createMockRequest();
      req.text = jest.fn().mockResolvedValue('');

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Rate limiting', () => {
    const testSchema = z.object({ test: z.string() });

    it('should apply rate limiting when specified', async () => {
      const req = createMockRequest({ body: { test: 'value' } });

      await ValidationMiddleware.validateRequest(req, testSchema, {
        rateLimiter: 'create',
      });

      expect(withRateLimit).toHaveBeenCalled();
    });

    it('should reject when rate limit exceeded', async () => {
      withRateLimit.mockResolvedValue({
        success: false,
        headers: {},
        error: 'Rate limit exceeded',
      });

      const req = createMockRequest({ body: { test: 'value' } });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          rateLimiter: 'create',
        }
      );

      expect(result.success).toBe(false);
      expect(result.rateLimitExceeded).toBe(true);
    });

    it('should skip rate limiting when not specified', async () => {
      const req = createMockRequest({ body: { test: 'value' } });

      await ValidationMiddleware.validateRequest(req, testSchema);

      expect(withRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('Authentication validation', () => {
    const testSchema = z.object({ test: z.string() });

    it('should require authentication when specified', async () => {
      const req = createMockRequest({ body: { test: 'value' } });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireAuth: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.errors?.[0].code).toBe('MISSING_AUTH');
    });

    it('should accept valid authentication', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer token123' },
        body: { test: 'value' },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireAuth: true,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should accept session ID as authentication', async () => {
      const req = createMockRequest({
        headers: { 'x-session-id': 'session123' },
        body: { test: 'value' },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireAuth: true,
        }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Business context validation', () => {
    const testSchema = z.object({ test: z.string() });

    it('should require business context when specified', async () => {
      const req = createMockRequest({ body: { test: 'value' } });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireBusinessContext: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.errors?.[0].code).toBe('MISSING_BUSINESS_CONTEXT');
    });

    it('should accept valid business context in body', async () => {
      const req = createMockRequest({
        body: { businessId: 'biz-123', test: 'value' },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireBusinessContext: true,
        }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('CSRF validation', () => {
    const testSchema = z.object({ test: z.string() });

    it('should require CSRF token when specified', async () => {
      const req = createMockRequest({ body: { test: 'value' } });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireCSRF: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.errors?.[0].code).toBe('MISSING_CSRF');
    });

    it('should validate CSRF token', async () => {
      const req = createMockRequest({
        headers: {
          'x-csrf-token': 'token123',
          'x-session-id': 'session123',
        },
        body: { test: 'value' },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireCSRF: true,
        }
      );

      expect(result.success).toBe(true);
      expect(CSRFProtection.validateToken).toHaveBeenCalledWith(
        'token123',
        'session123'
      );
    });

    it('should reject invalid CSRF token', async () => {
      CSRFProtection.validateToken.mockReturnValue(false);

      const req = createMockRequest({
        headers: {
          'x-csrf-token': 'invalid-token',
          'x-session-id': 'session123',
        },
        body: { test: 'value' },
      });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          requireCSRF: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('INVALID_CSRF');
    });
  });

  describe('Abuse detection', () => {
    const testSchema = z.object({ test: z.string() });

    it('should check for abuse when specified', async () => {
      const req = createMockRequest({ body: { test: 'value' } });

      await ValidationMiddleware.validateRequest(req, testSchema, {
        checkAbuse: true,
      });

      expect(abuseDetector.detectSuspiciousBooking).toHaveBeenCalled();
    });

    it('should reject suspicious activity', async () => {
      abuseDetector.detectSuspiciousBooking.mockReturnValue(true);

      const req = createMockRequest({ body: { test: 'value' } });

      const result = await ValidationMiddleware.validateRequest(
        req,
        testSchema,
        {
          checkAbuse: true,
        }
      );

      expect(result.success).toBe(false);
      expect(result.securityViolation).toBe(true);
      expect(result.errors?.[0].code).toBe('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('Input sanitization', () => {
    const testSchema = z.object({
      name: z.string(),
      notes: z.string(),
      clientName: z.string().optional(),
    });

    it('should sanitize input when specified', async () => {
      const req = createMockRequest({
        body: {
          name: '<script>alert("xss")</script>John',
          notes: 'Some notes with <script>',
          clientName: 'Client Name',
        },
      });

      await ValidationMiddleware.validateRequest(req, testSchema, {
        sanitizeInput: true,
      });

      expect(InputSanitizer.sanitizeString).toHaveBeenCalled();
      expect(InputSanitizer.sanitizeNotes).toHaveBeenCalled();
      expect(InputSanitizer.sanitizeClientInfo).toHaveBeenCalled();
    });

    it('should skip sanitization when not specified', async () => {
      const req = createMockRequest({
        body: { name: 'John', notes: 'Notes' },
      });

      await ValidationMiddleware.validateRequest(req, testSchema, {
        sanitizeInput: false,
      });

      expect(InputSanitizer.sanitizeString).not.toHaveBeenCalled();
    });
  });

  describe('Response creation', () => {
    it('should create success response', () => {
      const result = { success: true, data: { test: 'value' } };
      const response = ValidationMiddleware.createValidationResponse(result);

      expect(response.status).toBe(200);
    });

    it('should create error response', () => {
      const result = {
        success: false,
        errors: [{ field: 'test', message: 'Invalid', code: 'INVALID' }],
      };
      const response = ValidationMiddleware.createValidationResponse(result);

      expect(response.status).toBe(400);
    });

    it('should include security headers', () => {
      const result = { success: true, data: {} };
      const response = ValidationMiddleware.createValidationResponse(result);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});

describe('validateAppointmentRequest', () => {
  const { withRateLimit } = require('@/lib/security/rate-limiter');

  beforeEach(() => {
    withRateLimit.mockResolvedValue({ success: true, headers: {} });
  });

  const testSchema = z.object({ businessId: z.string(), test: z.string() });

  it('should apply default security options', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer token' },
      body: { businessId: 'biz-123', test: 'value' },
    });

    const result = await validateAppointmentRequest(req, testSchema);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ businessId: 'biz-123', test: 'value' });
  });

  it('should return response for validation failure', async () => {
    const req = createMockRequest({ body: { test: 'value' } }); // Missing auth

    const result = await validateAppointmentRequest(req, testSchema);

    expect(result.success).toBe(false);
    expect(result.response).toBeDefined();
  });
});

describe('appointmentValidators', () => {
  const { withRateLimit } = require('@/lib/security/rate-limiter');
  const testSchema = z.object({ test: z.string() });

  beforeEach(() => {
    withRateLimit.mockResolvedValue({ success: true, headers: {} });
  });

  it('should have create validator with strict security', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer token',
        'x-csrf-token': 'csrf-token',
        'x-session-id': 'session-id',
      },
      body: { businessId: 'biz-123', test: 'value' },
    });

    const result = await appointmentValidators.create(req, testSchema);
    expect(result.success).toBe(true);
  });

  it('should have update validator with moderate security', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer token' },
      body: { businessId: 'biz-123', test: 'value' },
    });

    const result = await appointmentValidators.update(req, testSchema);
    expect(result.success).toBe(true);
  });

  it('should have status update validator', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer token' },
      body: { businessId: 'biz-123', test: 'value' },
    });

    const result = await appointmentValidators.statusUpdate(req, testSchema);
    expect(result.success).toBe(true);
  });

  it('should have conflict check validator with minimal security', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer token' },
      body: { businessId: 'biz-123', test: 'value' },
    });

    const result = await appointmentValidators.conflictCheck(req, testSchema);
    expect(result.success).toBe(true);
  });

  it('should have validation endpoint validator', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer token' },
      body: { businessId: 'biz-123', test: 'value' },
    });

    const result = await appointmentValidators.validate(req, testSchema);
    expect(result.success).toBe(true);
  });
});
