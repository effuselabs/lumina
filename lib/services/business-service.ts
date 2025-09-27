import { PublicBookingError } from '@/lib/errors/public-booking-error';
import { prisma } from '@/lib/prisma';
import { BusinessInfo, PublicBookingErrorType } from '@/types/booking';

export async function getBusinessForPublicBooking(
  businessId: string
): Promise<BusinessInfo> {
  try {
    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
        isActive: true,
      },
      include: {
        businessHours: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        publicBookingConfig: true,
      },
    });

    if (!business) {
      throw new PublicBookingError(
        PublicBookingErrorType.BUSINESS_NOT_FOUND,
        'Business not found or inactive',
        'Sorry, this business is not available for online booking.'
      );
    }

    if (!business.publicBookingConfig?.isEnabled) {
      throw new PublicBookingError(
        PublicBookingErrorType.BUSINESS_INACTIVE,
        'Public booking not enabled for this business',
        'Online booking is not currently available for this business. Please contact them directly.'
      );
    }

    // Transform database model to BusinessInfo type
    const businessInfo: BusinessInfo = {
      id: business.id,
      name: business.name,
      logo: business.logo || undefined,
      address: business.address || undefined,
      phone: business.phone || undefined,
      email: business.email || undefined,
      businessHours: business.businessHours.map((hours: any) => ({
        dayOfWeek: hours.dayOfWeek,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isClosed: hours.isClosed,
      })),
      branding: business.publicBookingConfig.brandColors
        ? {
            brandColors: {
              primary:
                (business.publicBookingConfig.brandColors as any)?.primary ||
                '#FFD25A',
              secondary:
                (business.publicBookingConfig.brandColors as any)?.secondary ||
                '#FF7A5A',
              accent:
                (business.publicBookingConfig.brandColors as any)?.accent ||
                '#0B2B33',
            },
            customDomain:
              business.publicBookingConfig.customDomain || undefined,
          }
        : undefined,
      policies: {
        cancellationPolicy: business.cancellationPolicy || undefined,
        noShowPolicy: business.noShowPolicy || undefined,
        preparationInstructions: business.preparationInstructions || undefined,
        advanceBookingDays: business.publicBookingConfig.advanceBookingDays,
        minimumNoticeHours: business.publicBookingConfig.minimumNoticeHours,
      },
      isActive: business.isActive,
      publicBookingEnabled: business.publicBookingConfig.isEnabled,
    };

    return businessInfo;
  } catch (error) {
    if (error instanceof PublicBookingError) {
      throw error;
    }

    console.error('Error fetching business for public booking:', error);
    throw new PublicBookingError(
      PublicBookingErrorType.SYSTEM_ERROR,
      'Failed to fetch business information',
      'We encountered an error loading the business information. Please try again later.'
    );
  }
}

export async function getBusinessServices(businessId: string) {
  try {
    const services = await prisma.service.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        staff: {
          include: {
            staff: {
              select: {
                id: true,
                displayName: true,
                isActive: true,
              },
            },
          },
          where: {
            staff: {
              isActive: true,
            },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      category: service.category || 'General',
      staffIds: service.staff.map((ss: any) => ss.staff.id),
      isActive: service.isActive,
      prerequisites: service.prerequisites || undefined,
      recommendations: service.recommendations || undefined,
    }));
  } catch (error) {
    console.error('Error fetching business services:', error);
    throw new PublicBookingError(
      PublicBookingErrorType.SYSTEM_ERROR,
      'Failed to fetch services',
      'We encountered an error loading the services. Please try again later.'
    );
  }
}
