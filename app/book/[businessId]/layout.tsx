import { PublicBookingLayout } from '@/components/booking/public-booking-layout';
import { getBusinessForPublicBooking } from '@/lib/services/business-service';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PublicBookingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}

export async function generateMetadata(props: {
  params: Promise<{ businessId: string }>;
}): Promise<Metadata> {
  const params = await props.params;
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

export default async function BookingLayout(props: PublicBookingLayoutProps) {
  const params = await props.params;

  const { children } = props;

  try {
    const business = await getBusinessForPublicBooking(params.businessId);

    return (
      <PublicBookingLayout business={business}>{children}</PublicBookingLayout>
    );
  } catch (_error) {
    notFound();
  }
}
