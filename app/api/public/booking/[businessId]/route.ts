import { prisma } from '@/lib/prisma';
import { InputSanitizer } from '@/lib/security/rate-limiter';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  publicBookingRateLimiters,
  publicBookingSecurityHeaders,
  withPublicBookingRateLimit,
} from '../../../../../lib/security/public-booking-rate-limiter';

// Using dedicated public booking rate limiters

// Validation schema for business ID
const businessIdSchema = z.string().cuid('Invalid business ID format');

// Error types for public booking
enum PublicBookingErrorType {
  BUSINESS_NOT_FOUND = 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE = 'BUSINESS_INACTIVE',
  BOOKING_DISABLED = 'BOOKING_DISABLED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

class PublicBookingError extends Error {
  type: PublicBookingErrorType;
  userMessage: string;
  suggestions?: string[];

  constructor(
    type: PublicBookingErrorType,
    message: string,
    userMessage: string,
    suggestions?: string[]
  ) {
    super(message);
    this.type = type;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
    this.name = 'PublicBookingError';
  }
}

// Business context validation middleware
async function validateBusinessContext(businessId: string) {
  try {
    const validatedId = businessIdSchema.parse(businessId);

    const business = await prisma.business.findUnique({
      where: {
        id: validatedId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        timezone: true,
        bookingEnabled: true,
        onlineBooking: true,
        requireDeposit: true,
        depositAmount: true,
        cancellationPolicy: true,
        operatingHours: true,
        logo: true,
        primaryColor: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!business) {
      throw new PublicBookingError(
        PublicBookingErrorType.BUSINESS_NOT_FOUND,
        'Business not found',
        'The business you are looking for could not be found.',
        [
          'Please check the booking link and try again',
          'Contact the business directly for assistance',
        ]
      );
    }

    if (!business.bookingEnabled) {
      throw new PublicBookingError(
        PublicBookingErrorType.BOOKING_DISABLED,
        'Booking disabled for business',
        'Online booking is currently unavailable for this business.',
        [
          'Please call the business directly to schedule an appointment',
          'Check back later as booking may be re-enabled',
        ]
      );
    }

    if (!business.onlineBooking) {
      throw new PublicBookingError(
        PublicBookingErrorType.BOOKING_DISABLED,
        'Online booking disabled',
        'This business does not accept online bookings.',
        ['Please call the business directly to schedule an appointment']
      );
    }

    return business;
  } catch (error) {
    if (error instanceof PublicBookingError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new PublicBookingError(
        PublicBookingErrorType.VALIDATION_ERROR,
        'Invalid business ID format',
        'The booking link appears to be invalid.',
        [
          'Please check the booking link and try again',
          'Contact the business for the correct booking link',
        ]
      );
    }

    throw new PublicBookingError(
      PublicBookingErrorType.SYSTEM_ERROR,
      'System error during business validation',
      'We are experiencing technical difficulties. Please try again.',
      [
        'Try refreshing the page',
        'Contact the business directly if the problem persists',
      ]
    );
  }
}

// GET /api/public/booking/[businessId] - Get business information and services
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
              'Too many booking requests. Please try again in 15 minutes.',
            userMessage: 'Too many requests. Please wait before trying again.',
            suggestions: [
              'Wait a few minutes before refreshing',
              'Contact the business directly if urgent',
            ],
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
    const business = await validateBusinessContext(params.businessId);

    // Get active services for this business
    const services = await prisma.service.findMany({
      where: {
        businessId: params.businessId,
        isActive: true,
        isOnline: true, // Only services available for online booking
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        duration: true,
        prerequisites: true,
        recommendations: true,
        staff: {
          where: {
            staff: {
              isActive: true,
              acceptsOnlineBookings: true,
            },
          },
          select: {
            staffId: true,
            customPrice: true,
            customDuration: true,
            staff: {
              select: {
                id: true,
                displayName: true,
                title: true,
                bio: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Business hours are stored in the operatingHours JSON field

    // Transform services data for public consumption
    const transformedServices = services.map(service => ({
      id: service.id,
      name: InputSanitizer.sanitizeString(service.name),
      description: service.description
        ? InputSanitizer.sanitizeString(service.description)
        : null,
      category: service.category
        ? InputSanitizer.sanitizeString(service.category)
        : null,
      price: service.price,
      duration: service.duration,
      prerequisites: service.prerequisites
        ? InputSanitizer.sanitizeString(service.prerequisites)
        : null,
      recommendations: service.recommendations
        ? InputSanitizer.sanitizeString(service.recommendations)
        : null,
      staffIds: service.staff.map(s => s.staffId),
      availableStaff: service.staff.map(s => ({
        id: s.staff.id,
        displayName: InputSanitizer.sanitizeString(s.staff.displayName),
        title: s.staff.title
          ? InputSanitizer.sanitizeString(s.staff.title)
          : null,
        bio: s.staff.bio ? InputSanitizer.sanitizeString(s.staff.bio) : null,
        avatar: s.staff.avatar,
        customPrice: s.customPrice,
        customDuration: s.customDuration,
      })),
    }));

    // Group services by category
    const servicesByCategory = transformedServices.reduce(
      (acc, service) => {
        const category = service.category || 'General';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      },
      {} as Record<string, typeof transformedServices>
    );

    const response = {
      business: {
        id: business.id,
        name: InputSanitizer.sanitizeString(business.name),
        email: business.email,
        phone: business.phone,
        website: business.website,
        address: business.address
          ? InputSanitizer.sanitizeString(business.address)
          : null,
        city: business.city
          ? InputSanitizer.sanitizeString(business.city)
          : null,
        state: business.state
          ? InputSanitizer.sanitizeString(business.state)
          : null,
        zipCode: business.zipCode,
        country: business.country,
        timezone: business.timezone,
        requireDeposit: business.requireDeposit,
        depositAmount: business.depositAmount,
        cancellationPolicy: business.cancellationPolicy
          ? InputSanitizer.sanitizeString(business.cancellationPolicy)
          : null,
        logo: business.logo,
        primaryColor: business.primaryColor,
        operatingHours: business.operatingHours,
      },
      services: transformedServices,
      servicesByCategory,

      bookingConfig: {
        requireDeposit: business.requireDeposit,
        depositAmount: business.depositAmount,
        advanceBookingDays: 30, // Default to 30 days
        minimumNoticeHours: 2, // Default to 2 hours
        maxServicesPerBooking: 3, // Default to 3 services
      },
    };

    return NextResponse.json(response, {
      headers: {
        ...publicBookingSecurityHeaders,
        ...rateLimitResult.headers,
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error in public booking business endpoint:', error);

    if (error instanceof PublicBookingError) {
      return NextResponse.json(
        { error },
        {
          status:
            error.type === PublicBookingErrorType.BUSINESS_NOT_FOUND
              ? 404
              : 400,
          headers: publicBookingSecurityHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        error: {
          type: PublicBookingErrorType.SYSTEM_ERROR,
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
