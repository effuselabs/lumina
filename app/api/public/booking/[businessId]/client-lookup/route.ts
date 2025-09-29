import { prisma } from '@/lib/prisma';
import { InputSanitizer } from '@/lib/security/rate-limiter';
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

interface ClientData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredStaff?: string;
  notes?: string;
  isNewClient: boolean;
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

// Look up existing client using ClientService
async function lookupClient(
  businessId: string,
  email?: string,
  phone?: string
): Promise<{ clientExists: boolean; clientData?: Partial<ClientData> }> {
  try {
    const result = await ClientService.lookupClient({
      businessId,
      email,
      phone,
    });

    if (!result.clientExists || !result.clientData) {
      return {
        clientExists: false,
      };
    }

    // Return sanitized client data for prefilling
    return {
      clientExists: true,
      clientData: {
        firstName: InputSanitizer.sanitizeString(result.clientData.firstName),
        lastName: InputSanitizer.sanitizeString(result.clientData.lastName),
        email: result.clientData.email,
        phone: result.clientData.phone,
        notes: undefined, // Notes not included in lookup for privacy
        isNewClient: false,
      },
    };
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
        { error },
        {
          status:
            error.type === ClientLookupErrorType.BUSINESS_NOT_FOUND ? 404 : 400,
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
