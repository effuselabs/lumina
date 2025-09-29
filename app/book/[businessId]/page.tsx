import { BookingErrorBoundary } from '@/components/booking/booking-error-boundary';
import { OptimizedBookingInterface } from '@/components/booking/optimized-booking-interface';
import { getBusinessForPublicBooking } from '@/lib/services/business-service';
import { Suspense } from 'react';

interface BookingPageProps {
  params: { businessId: string };
}

export default async function BookingPage({ params }: BookingPageProps) {
  try {
    const business = await getBusinessForPublicBooking(params.businessId);

    return (
      <BookingErrorBoundary
        businessName={business.name}
        businessPhone={business.phone}
        businessEmail={business.email}
      >
        <Suspense fallback={<BookingLoadingSkeleton />}>
          <OptimizedBookingInterface
            businessId={params.businessId}
            business={business}
          />
        </Suspense>
      </BookingErrorBoundary>
    );
  } catch (error) {
    // This will be caught by the error boundary
    throw error;
  }
}

function BookingLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Progress skeleton */}
      <div className="space-y-3">
        <div className="h-2 animate-pulse rounded-full bg-gray-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      </div>

      {/* Button skeleton */}
      <div className="flex justify-end">
        <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}
