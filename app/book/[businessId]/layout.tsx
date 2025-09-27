import { PublicBookingLayout } from '@/components/booking/public-booking-layout';
import { getBusinessForPublicBooking } from '@/lib/services/business-service';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PublicBookingLayoutProps {
  children: React.ReactNode;
  params: { businessId: string };
}

export async function generateMetadata({
  params,
}: {
  params: { businessId: string };
}): Promise<Metadata> {
  try {
    const business = await getBusinessForPublicBooking(params.businessId);

    return {
      title: `Book Appointment - ${business.name}`,
      description: `Book your appointment online with ${business.name}. Easy, fast, and convenient scheduling.`,
      robots: 'index, follow',
    };
  } catch (_error) {
    return {
      title: 'Book Appointment',
      description: 'Book your appointment online',
    };
  }
}

export default async function BookingLayout({
  children,
  params,
}: PublicBookingLayoutProps) {
  try {
    const business = await getBusinessForPublicBooking(params.businessId);

    return (
      <PublicBookingLayout business={business}>{children}</PublicBookingLayout>
    );
  } catch (_error) {
    notFound();
  }
}
