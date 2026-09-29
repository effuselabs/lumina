import { PublicBookingError } from '@/lib/errors/public-booking-error';
import { prisma } from '@/lib/prisma';
import { BusinessInfo, PublicBookingErrorType } from '@/types/booking';
import { brand } from '@/lib/design/tokens';

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
                brand.gold,
              secondary:
                (business.publicBookingConfig.brandColors as any)?.secondary ||
                brand.coral,
              accent:
                (business.publicBookingConfig.brandColors as any)?.accent ||
                brand.deepTeal,
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
