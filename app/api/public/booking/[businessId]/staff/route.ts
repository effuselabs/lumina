import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  publicBookingRateLimiters,
  publicBookingSecurityHeaders,
  withPublicBookingRateLimit,
} from '../../../../../../lib/security/public-booking-rate-limiter';

// Validation schema for staff request
const staffQuerySchema = z.object({
  serviceIds: z.string().transform(val => val.split(',').filter(Boolean)),
});

// Error types
enum StaffErrorType {
  BUSINESS_NOT_FOUND = 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE = 'BUSINESS_INACTIVE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NO_SERVICES = 'NO_SERVICES',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

class StaffError extends Error {
  type: StaffErrorType;
  userMessage: string;
  suggestions?: string[];

  constructor(
    type: StaffErrorType,
    message: string,
    userMessage: string,
    suggestions?: string[]
  ) {
    super(message);
    this.type = type;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
    this.name = 'StaffError';
  }
}

// Business context validation
async function validateBusinessForStaff(businessId: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        bookingEnabled: true,
        onlineBooking: true,
      },
    });

    if (!business) {
      throw new StaffError(
        StaffErrorType.BUSINESS_NOT_FOUND,
        'Business not found',
        'The business you are looking for could not be found.',
        ['Please check the booking link and try again']
      );
    }

    if (!business.bookingEnabled || !business.onlineBooking) {
      throw new StaffError(
        StaffErrorType.BUSINESS_INACTIVE,
        'Booking disabled for business',
        'Online booking is currently unavailable for this business.',
        ['Please call the business directly to check availability']
      );
    }

    return business;
  } catch (error) {
    if (error instanceof StaffError) {
      throw error;
    }

    throw new StaffError(
      StaffErrorType.SYSTEM_ERROR,
      'System error during business validation',
      'We are experiencing technical difficulties. Please try again.',
      ['Try refreshing the page']
    );
  }
}

// Get qualified staff for services
async function getQualifiedStaff(businessId: string, serviceIds: string[]) {
  try {
    // First validate that all services exist and are available for online booking
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId,
        isActive: true,
        isOnline: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new StaffError(
        StaffErrorType.NO_SERVICES,
        'One or more services not found or unavailable',
        'Some selected services are not available for online booking.',
        ['Please refresh the page and select available services']
      );
    }

    // Get staff who can perform ALL requested services
    const staff = await prisma.staff.findMany({
      where: {
        businessId,
        isActive: true,
        acceptsOnlineBookings: true,
        services: {
          some: {
            serviceId: { in: serviceIds },
          },
        },
      },
      include: {
        services: {
          where: {
            serviceId: { in: serviceIds },
          },
          include: {
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Filter staff who can perform ALL required services
    const qualifiedStaff = staff.filter(staffMember => {
      const staffServiceIds = staffMember.services.map(s => s.serviceId);
      return serviceIds.every(serviceId => staffServiceIds.includes(serviceId));
    });

    // Transform to public-safe format
    return qualifiedStaff.map(staffMember => ({
      id: staffMember.id,
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      displayName: staffMember.displayName,
      avatar: staffMember.avatar,
      specialties: staffMember.services.map(s => s.service.name),
      isActive: staffMember.isActive,
    }));
  } catch (error) {
    if (error instanceof StaffError) {
      throw error;
    }

    throw new StaffError(
      StaffErrorType.SYSTEM_ERROR,
      'System error during staff lookup',
      'We are experiencing technical difficulties. Please try again.',
      ['Try refreshing the page']
    );
  }
}

// GET /api/public/booking/[businessId]/staff
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await withPublicBookingRateLimit(
      request,
      publicBookingRateLimiters.general
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            type: 'RATE_LIMIT_EXCEEDED',
            message:
              'Too many staff requests. Please wait a moment before trying again.',
            userMessage:
              'Too many requests. Please wait before checking staff again.',
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
    await validateBusinessForStaff(params.businessId);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      serviceIds: searchParams.get('serviceIds') || '',
    };

    const validatedQuery = staffQuerySchema.parse(queryParams);

    if (validatedQuery.serviceIds.length === 0) {
      throw new StaffError(
        StaffErrorType.VALIDATION_ERROR,
        'No service IDs provided',
        'Please select services to see available staff.',
        ['Select one or more services first']
      );
    }

    // Get qualified staff
    const qualifiedStaff = await getQualifiedStaff(
      params.businessId,
      validatedQuery.serviceIds
    );

    const response = {
      staff: qualifiedStaff,
      totalStaff: qualifiedStaff.length,
      serviceIds: validatedQuery.serviceIds,
      metadata: {
        businessId: params.businessId,
        requestTime: new Date().toISOString(),
        cacheEnabled: true,
      },
    };

    return NextResponse.json(response, {
      headers: {
        ...publicBookingSecurityHeaders,
        ...rateLimitResult.headers,
        // Cache staff data for 5 minutes
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-Staff-Source': 'database',
        'X-Service-Validation': 'enabled',
      },
    });
  } catch (error) {
    // Log error for debugging - will be handled by error response

    if (error instanceof StaffError) {
      return NextResponse.json(
        { error },
        {
          status: error.type === StaffErrorType.BUSINESS_NOT_FOUND ? 404 : 400,
          headers: publicBookingSecurityHeaders,
        }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            type: StaffErrorType.VALIDATION_ERROR,
            message: 'Invalid request parameters',
            userMessage: 'Please check your selection and try again.',
            suggestions: [
              'Verify the selected services',
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
          type: StaffErrorType.SYSTEM_ERROR,
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
