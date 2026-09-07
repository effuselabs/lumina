import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  publicBookingRateLimiters,
  publicBookingSecurityHeaders,
  withPublicBookingRateLimit,
} from '../../../../../../lib/security/public-booking-rate-limiter';
import { RealTimeAvailabilityService } from '../../../../../../lib/services/real-time-availability-service';

// Using dedicated public booking rate limiters

// Validation schema for availability request
const availabilityQuerySchema = z.object({
  serviceIds: z.string().transform(val => val.split(',').filter(Boolean)),
  staffId: z.string().cuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  duration: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(480)), // Max 8 hours
});

// Error types
enum AvailabilityErrorType {
  BUSINESS_NOT_FOUND = 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE = 'BUSINESS_INACTIVE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_DATE = 'INVALID_DATE',
  NO_SERVICES = 'NO_SERVICES',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

class AvailabilityError extends Error {
  type: AvailabilityErrorType;
  userMessage: string;
  suggestions?: string[];

  constructor(
    type: AvailabilityErrorType,
    message: string,
    userMessage: string,
    suggestions?: string[]
  ) {
    super(message);
    this.type = type;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
    this.name = 'AvailabilityError';
  }
}

interface _TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  isAvailable: boolean;
  totalDuration: number;
  totalPrice: number;
  services: {
    id: string;
    name: string;
    duration: number;
    price: number;
  }[];
}

// Business context validation (simplified for availability)
async function validateBusinessForAvailability(businessId: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        bookingEnabled: true,
        onlineBooking: true,
        timezone: true,
      },
    });

    if (!business) {
      throw new AvailabilityError(
        AvailabilityErrorType.BUSINESS_NOT_FOUND,
        'Business not found',
        'The business you are looking for could not be found.',
        ['Please check the booking link and try again']
      );
    }

    if (!business.bookingEnabled || !business.onlineBooking) {
      throw new AvailabilityError(
        AvailabilityErrorType.BUSINESS_INACTIVE,
        'Booking disabled for business',
        'Online booking is currently unavailable for this business.',
        ['Please call the business directly to check availability']
      );
    }

    return business;
  } catch (error) {
    if (error instanceof AvailabilityError) {
      throw error;
    }

    throw new AvailabilityError(
      AvailabilityErrorType.SYSTEM_ERROR,
      'System error during business validation',
      'We are experiencing technical difficulties. Please try again.',
      ['Try refreshing the page']
    );
  }
}

// Real-time availability is now handled by RealTimeAvailabilityService
// which integrates with Calendar Infrastructure

// GET /api/public/booking/[businessId]/availability
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await withPublicBookingRateLimit(
      request,
      publicBookingRateLimiters.availability
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            message:
              'Too many availability requests. Please wait a moment before trying again.',
            userMessage:
              'Too many requests. Please wait before checking availability again.',
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

    // Validate business context. Keep the row: its timezone is what every
    // time in the response means, and the browser cannot guess it.
    const business = await validateBusinessForAvailability(params.businessId);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      serviceIds: searchParams.get('serviceIds') || '',
      staffId: searchParams.get('staffId') || undefined,
      date: searchParams.get('date') || '',
      duration: searchParams.get('duration') || '0',
    };

    const validatedQuery = availabilityQuerySchema.parse(queryParams);

    // Get available slots using Real-time Availability Service
    const availabilityResult =
      await RealTimeAvailabilityService.getAvailableSlots({
        businessId: params.businessId,
        serviceIds: validatedQuery.serviceIds,
        date: new Date(validatedQuery.date),
        staffId: validatedQuery.staffId,
        duration: validatedQuery.duration,
      });

    const response = {
      availableSlots: availabilityResult.slots,
      nextAvailableDate: availabilityResult.nextAvailableDate,
      requestedDate: validatedQuery.date,
      // Slot instants are absolute; rendering them without this shows the
      // viewer's own zone, which is how a 9-to-6 salon offered 4 AM slots.
      timezone: business.timezone,
      totalSlotsFound: availabilityResult.slots.length,
      metadata: {
        ...availabilityResult.metadata,
        cacheEnabled: true,
        realTimeValidation: true,
      },
    };

    return NextResponse.json(response, {
      headers: {
        ...publicBookingSecurityHeaders,
        ...rateLimitResult.headers,
        // Shorter cache time for real-time availability with proper invalidation
        'Cache-Control': 'public, max-age=30, s-maxage=30', // Cache for 30 seconds
        'X-Availability-Source': 'calendar-infrastructure',
        'X-Real-Time-Validation': 'enabled',
      },
    });
  } catch (error) {
    console.error('Error in availability endpoint:', error);

    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { error },
        {
          status:
            error.type === AvailabilityErrorType.BUSINESS_NOT_FOUND ? 404 : 400,
          headers: publicBookingSecurityHeaders,
        }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            type: AvailabilityErrorType.VALIDATION_ERROR,
            message: 'Invalid request parameters',
            userMessage: 'Please check your selection and try again.',
            suggestions: [
              'Verify the selected services and date',
              'Refresh the page and try again',
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
          type: AvailabilityErrorType.SYSTEM_ERROR,
          message: 'Internal server error',
          userMessage:
            'We are experiencing technical difficulties. Please try again.',
          suggestions: [
            'Try refreshing the page',
            'Contact the business directly if the problem persists',
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
