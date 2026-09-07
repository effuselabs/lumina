/**
 * Enhanced validation middleware for appointment endpoints
 * Integrates Zod validation with security measures and sanitization
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import {
  LogLevel,
  availabilityLogger,
} from '../monitoring/availability-logger';
import {
  CSRFProtection,
  InputSanitizer,
  abuseDetector,
  appointmentRateLimiters,
  securityHeaders,
  withRateLimit,
} from './rate-limiter';

// Validation context for tracking
interface ValidationContext {
  endpoint: string;
  method: string;
  businessId?: string;
  userId?: string;
  sessionId?: string;
  clientIp?: string;
}

// Validation result
interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  rateLimitExceeded?: boolean;
  securityViolation?: boolean;
}

// Validation error details
interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Security validation options
interface SecurityOptions {
  requireAuth?: boolean;
  requireBusinessContext?: boolean;
  requireCSRF?: boolean;
  rateLimiter?:
    'general' | 'create' | 'statusUpdate' | 'conflictCheck' | 'validation';
  checkAbuse?: boolean;
  sanitizeInput?: boolean;
}

// Main validation middleware class
export class ValidationMiddleware {
  // Validate request with comprehensive security checks
  static async validateRequest<T>(
    req: NextRequest,
    schema: ZodSchema<T>,
    options: SecurityOptions = {}
  ): Promise<ValidationResult<T>> {
    const context = this.extractContext(req);

    try {
      // 1. Apply rate limiting
      if (options.rateLimiter) {
        const rateLimiter = appointmentRateLimiters[options.rateLimiter];
        const rateResult = await withRateLimit(req, rateLimiter);

        if (!rateResult.success) {
          this.logSecurityEvent('RATE_LIMIT_EXCEEDED', context, {
            rateLimiter: options.rateLimiter,
            error: rateResult.error,
          });

          return {
            success: false,
            rateLimitExceeded: true,
            errors: [
              {
                field: 'request',
                message: 'Rate limit exceeded. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
              },
            ],
          };
        }
      }

      // 2. Extract and parse request body
      let body: any;
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch (error) {
        return {
          success: false,
          errors: [
            {
              field: 'body',
              message: 'Invalid JSON format',
              code: 'INVALID_JSON',
            },
          ],
        };
      }

      // 3. Sanitize input if requested
      if (options.sanitizeInput) {
        body = this.sanitizeRequestBody(body);
      }

      // 4. Validate authentication if required
      if (options.requireAuth) {
        const authResult = await this.validateAuthentication(req, context);
        if (!authResult.success) {
          return authResult;
        }
      }

      // 5. Validate business context if required
      if (options.requireBusinessContext) {
        const businessResult = await this.validateBusinessContext(
          req,
          body,
          context
        );
        if (!businessResult.success) {
          return businessResult;
        }
      }

      // 6. Validate CSRF token if required
      if (options.requireCSRF) {
        const csrfResult = this.validateCSRF(req, context);
        if (!csrfResult.success) {
          return csrfResult;
        }
      }

      // 7. Check for abuse patterns if requested
      if (options.checkAbuse) {
        const abuseResult = this.checkAbusePatterns(req, body, context);
        if (!abuseResult.success) {
          return abuseResult;
        }
      }

      // 8. Validate against Zod schema
      const validationResult = schema.safeParse(body);

      if (!validationResult.success) {
        const errors = this.formatZodErrors(validationResult.error);

        this.logValidationFailure(context, errors);

        return {
          success: false,
          errors,
        };
      }

      // 9. Log successful validation
      this.logValidationSuccess(context);

      return {
        success: true,
        data: validationResult.data,
      };
    } catch (error) {
      this.logSecurityEvent('VALIDATION_ERROR', context, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        errors: [
          {
            field: 'request',
            message: 'Internal validation error',
            code: 'INTERNAL_ERROR',
          },
        ],
      };
    }
  }

  // Create validation response with security headers
  static createValidationResponse(
    result: ValidationResult,
    status: number = 400
  ): NextResponse {
    const response = NextResponse.json(
      {
        success: result.success,
        data: result.data,
        errors: result.errors,
        ...(result.rateLimitExceeded && { rateLimitExceeded: true }),
        ...(result.securityViolation && { securityViolation: true }),
      },
      { status: result.success ? 200 : status }
    );

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // Extract context from request
  private static extractContext(req: NextRequest): ValidationContext {
    const url = new URL(req.url);

    return {
      endpoint: url.pathname,
      method: req.method,
      userId: req.headers.get('x-user-id') || undefined,
      sessionId: req.headers.get('x-session-id') || undefined,
      clientIp: this.getClientIP(req),
    };
  }

  // Get client IP address
  private static getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    return forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  }

  // Sanitize request body
  private static sanitizeRequestBody(body: any): any {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized = { ...body };

    // Sanitize string fields
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        if (key.includes('notes') || key.includes('reason')) {
          sanitized[key] = InputSanitizer.sanitizeNotes(sanitized[key]);
        } else {
          sanitized[key] = InputSanitizer.sanitizeString(sanitized[key]);
        }
      }
    });

    // Sanitize client information
    if (
      sanitized.clientName ||
      sanitized.clientEmail ||
      sanitized.clientPhone
    ) {
      const sanitizedClient = InputSanitizer.sanitizeClientInfo({
        name: sanitized.clientName,
        email: sanitized.clientEmail,
        phone: sanitized.clientPhone,
      });

      Object.assign(sanitized, sanitizedClient);
    }

    return sanitized;
  }

  // Validate authentication
  private static async validateAuthentication(
    req: NextRequest,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const authHeader = req.headers.get('authorization');
    const sessionId = req.headers.get('x-session-id');

    if (!authHeader && !sessionId) {
      this.logSecurityEvent('MISSING_AUTHENTICATION', context);

      return {
        success: false,
        securityViolation: true,
        errors: [
          {
            field: 'authentication',
            message: 'Authentication required',
            code: 'MISSING_AUTH',
          },
        ],
      };
    }

    // In a real implementation, validate the token/session here
    // For now, we'll assume valid if present
    return { success: true };
  }

  // Validate business context
  private static async validateBusinessContext(
    req: NextRequest,
    body: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const businessId =
      body.businessId || req.nextUrl.searchParams.get('businessId');

    if (!businessId) {
      this.logSecurityEvent('MISSING_BUSINESS_CONTEXT', context);

      return {
        success: false,
        securityViolation: true,
        errors: [
          {
            field: 'businessId',
            message: 'Business context is required',
            code: 'MISSING_BUSINESS_CONTEXT',
          },
        ],
      };
    }

    // In a real implementation, validate user has access to this business
    // For now, we'll assume valid if present
    context.businessId = businessId;
    return { success: true };
  }

  // Validate CSRF token
  private static validateCSRF(
    req: NextRequest,
    context: ValidationContext
  ): ValidationResult {
    const csrfToken = req.headers.get('x-csrf-token');
    const sessionId = context.sessionId;

    if (!csrfToken || !sessionId) {
      this.logSecurityEvent('MISSING_CSRF_TOKEN', context);

      return {
        success: false,
        securityViolation: true,
        errors: [
          {
            field: 'csrf',
            message: 'CSRF token required',
            code: 'MISSING_CSRF',
          },
        ],
      };
    }

    if (!CSRFProtection.validateToken(csrfToken, sessionId)) {
      this.logSecurityEvent('INVALID_CSRF_TOKEN', context);

      return {
        success: false,
        securityViolation: true,
        errors: [
          {
            field: 'csrf',
            message: 'Invalid CSRF token',
            code: 'INVALID_CSRF',
          },
        ],
      };
    }

    return { success: true };
  }

  // Check for abuse patterns
  private static checkAbusePatterns(
    req: NextRequest,
    body: any,
    context: ValidationContext
  ): ValidationResult {
    const isSuspicious = abuseDetector.detectSuspiciousBooking(req, body);

    if (isSuspicious) {
      this.logSecurityEvent('SUSPICIOUS_ACTIVITY', context, {
        body: JSON.stringify(body),
      });

      return {
        success: false,
        securityViolation: true,
        errors: [
          {
            field: 'request',
            message: 'Suspicious activity detected',
            code: 'SUSPICIOUS_ACTIVITY',
          },
        ],
      };
    }

    return { success: true };
  }

  // Format Zod validation errors
  private static formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: 'received' in err ? (err as any).received : undefined,
    }));
  }

  // Log security events
  private static logSecurityEvent(
    event: string,
    context: ValidationContext,
    details?: Record<string, any>
  ): void {
    availabilityLogger.log(
      LogLevel.WARN,
      `Security event: ${event}`,
      { ...context, operation: 'security_validation' },
      {
        event,
        details,
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Log validation failure
  private static logValidationFailure(
    context: ValidationContext,
    errors: ValidationError[]
  ): void {
    availabilityLogger.log(
      LogLevel.INFO,
      'Validation failed',
      { ...context, operation: 'validation' },
      {
        errors,
        errorCount: errors.length,
      }
    );
  }

  // Log validation success
  private static logValidationSuccess(context: ValidationContext): void {
    availabilityLogger.log(LogLevel.DEBUG, 'Validation successful', {
      ...context,
      operation: 'validation',
    });
  }
}

// Convenience wrapper for appointment endpoint validation
export async function validateAppointmentRequest<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  options: SecurityOptions = {}
): Promise<{ success: boolean; data?: T; response?: NextResponse }> {
  const defaultOptions: SecurityOptions = {
    requireAuth: true,
    requireBusinessContext: true,
    sanitizeInput: true,
    checkAbuse: true,
    ...options,
  };

  const result = await ValidationMiddleware.validateRequest(
    req,
    schema,
    defaultOptions
  );

  if (!result.success) {
    return {
      success: false,
      response: ValidationMiddleware.createValidationResponse(result),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// Specific validators for different appointment operations
export const appointmentValidators = {
  // Create appointment with strict validation
  create: async (req: NextRequest, schema: ZodSchema) => {
    return validateAppointmentRequest(req, schema, {
      requireAuth: true,
      requireBusinessContext: true,
      requireCSRF: true,
      rateLimiter: 'create',
      sanitizeInput: true,
      checkAbuse: true,
    });
  },

  // Update appointment with moderate validation
  update: async (req: NextRequest, schema: ZodSchema) => {
    return validateAppointmentRequest(req, schema, {
      requireAuth: true,
      requireBusinessContext: true,
      rateLimiter: 'general',
      sanitizeInput: true,
      checkAbuse: false,
    });
  },

  // Status update with basic validation
  statusUpdate: async (req: NextRequest, schema: ZodSchema) => {
    return validateAppointmentRequest(req, schema, {
      requireAuth: true,
      requireBusinessContext: true,
      rateLimiter: 'statusUpdate',
      sanitizeInput: true,
      checkAbuse: false,
    });
  },

  // Conflict check with minimal validation (high frequency)
  conflictCheck: async (req: NextRequest, schema: ZodSchema) => {
    return validateAppointmentRequest(req, schema, {
      requireAuth: true,
      requireBusinessContext: true,
      rateLimiter: 'conflictCheck',
      sanitizeInput: false,
      checkAbuse: false,
    });
  },

  // Validation endpoint
  validate: async (req: NextRequest, schema: ZodSchema) => {
    return validateAppointmentRequest(req, schema, {
      requireAuth: true,
      requireBusinessContext: true,
      rateLimiter: 'validation',
      sanitizeInput: false,
      checkAbuse: false,
    });
  },
};

// Error response helper
export function createSecurityErrorResponse(
  message: string,
  code: string,
  status: number = 400
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
      },
    },
    { status }
  );

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
