import { prisma } from '@/lib/prisma';
import { ClientService } from '@/lib/services/client-service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  publicBookingRateLimiters,
  publicBookingSecurityHeaders,
  withPublicBookingRateLimit,
} from '../../../../../../lib/security/public-booking-rate-limiter';

// Using dedicated public booking rate limiters

// Validation schema for client lookup
const clientLookupSchema = z
  .object({
    email: z.string().email('Invalid email format').optional(),
    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .optional(),
  })
  .refine(data => data.email || data.phone, {
    message: 'Either email or phone number is required',
    path: ['email', 'phone'],
  });

// Error types
enum ClientLookupErrorType {
  BUSINESS_NOT_FOUND = 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE = 'BUSINESS_INACTIVE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

class ClientLookupError extends Error {
  type: ClientLookupErrorType;
  userMessage: string;
  suggestions?: string[];

  constructor(
    type: ClientLookupErrorType,
    message: string,
    userMessage: string,
    suggestions?: string[]
  ) {
    super(message);
    this.type = type;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
    this.name = 'ClientLookupError';
  }
}

const CLIENT_LOOKUP_ERROR_STATUS: Record<ClientLookupErrorType, number> = {
  [ClientLookupErrorType.BUSINESS_NOT_FOUND]: 404,
  [ClientLookupErrorType.BUSINESS_INACTIVE]: 403,
  [ClientLookupErrorType.VALIDATION_ERROR]: 400,
  // A server-side failure is not the caller's fault. Reporting it as 400 sent
  // the booking form down its "you typed something wrong" path for a bug that
  // no amount of retyping could fix.
  [ClientLookupErrorType.SYSTEM_ERROR]: 500,
};

/*
 * Serialize explicitly rather than passing the Error to NextResponse.json.
 * `message` and `name` are non-enumerable on Error, so they vanish silently in
 * JSON — and `message` is the internal detail we do not want to leak anyway.
 */
function serializeClientLookupError(error: ClientLookupError) {
  return {
    type: error.type,
    userMessage: error.userMessage,
    suggestions: error.suggestions,
  };
}

// Business context validation
async function validateBusinessForClientLookup(businessId: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        bookingEnabled: true,
        onlineBooking: true,
      },
    });

    if (!business) {
      throw new ClientLookupError(
        ClientLookupErrorType.BUSINESS_NOT_FOUND,
        'Business not found',
        'The business you are looking for could not be found.',
        ['Please check the booking link and try again']
      );
    }

    if (!business.bookingEnabled || !business.onlineBooking) {
      throw new ClientLookupError(
        ClientLookupErrorType.BUSINESS_INACTIVE,
        'Booking disabled for business',
        'Online booking is currently unavailable for this business.',
        ['Please call the business directly']
      );
    }

    return business;
  } catch (error) {
    if (error instanceof ClientLookupError) {
      throw error;
    }

    throw new ClientLookupError(
      ClientLookupErrorType.SYSTEM_ERROR,
      'System error during business validation',
      'We are experiencing technical difficulties. Please try again.',
      ['Try refreshing the page']
    );
  }
}

/*
 * Look up an existing client.
 *
 * Returns whether a client matched and nothing else. This route is
 * unauthenticated by necessity — it serves the public booking page — so it must
 * not hand back the matched client's name, email or phone, which is what it did
 * before: anyone could type a phone number and be shown whose it was.
 */
async function lookupClient(
  businessId: string,
  email?: string,
  phone?: string
): Promise<{ clientExists: boolean }> {
  try {
    return await ClientService.lookupClient({
      businessId,
      email,
      phone,
    });
  } catch (error) {
    console.error('Error during client lookup:', error);
    throw new ClientLookupError(
      ClientLookupErrorType.SYSTEM_ERROR,
      'Error during client lookup',
      'We could not check your information. Please try again.',
      [
        'Try entering your information again',
        'Continue as a new client if the problem persists',
      ]
    );
  }
}

// POST /api/public/booking/[businessId]/client-lookup
export async function POST(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await withPublicBookingRateLimit(
      request,
      publicBookingRateLimiters.clientLookup
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            message:
              'Too many client lookup requests. Please wait before trying again.',
            userMessage:
              'Too many lookup requests. Please wait before trying again.',
            suggestions: ['Wait a moment before trying again'],
          },
        },
        {
          status: 429,
          headers: {
            ...publicBookingSecurityHeaders,
            ...rateLimitResult.headers,
          },
        }
      );
    }

    // Validate business context
    await validateBusinessForClientLookup(params.businessId);

    // Parse and validate request body
    const body = await request.json();

    // Sanitize input data
    const sanitizedBody = {
      email: body.email ? body.email.toLowerCase().trim() : undefined,
      phone: body.phone
        ? body.phone.replace(/[^\d\s\-\(\)\+]/g, '')
        : undefined,
    };

    const validatedData = clientLookupSchema.parse(sanitizedBody);

    // Look up client
    const result = await lookupClient(
      params.businessId,
      validatedData.email,
      validatedData.phone
    );

    return NextResponse.json(result, {
      headers: {
        ...publicBookingSecurityHeaders,
        ...rateLimitResult.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Don't cache client data
      },
    });
  } catch (error) {
    console.error('Error in client lookup endpoint:', error);

    if (error instanceof ClientLookupError) {
      return NextResponse.json(
        { error: serializeClientLookupError(error) },
        {
          status: CLIENT_LOOKUP_ERROR_STATUS[error.type],
          headers: publicBookingSecurityHeaders,
        }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            type: ClientLookupErrorType.VALIDATION_ERROR,
            message: 'Invalid client information',
            userMessage:
              'Please check your email or phone number and try again.',
            suggestions: [
              'Verify your email address format',
              'Ensure phone number is complete',
            ],
            details: error.errors,
          },
        },
        {
          status: 400,
          headers: publicBookingSecurityHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        error: {
          type: ClientLookupErrorType.SYSTEM_ERROR,
          message: 'Internal server error',
          userMessage:
            'We are experiencing technical difficulties. Please try again.',
          suggestions: [
            'Try refreshing the page',
            'Continue as a new client if the problem persists',
          ],
        },
      },
      {
        status: 500,
        headers: publicBookingSecurityHeaders,
      }
    );
  }
}
