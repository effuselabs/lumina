'use client';

import { BookingManagement } from '@/components/booking/booking-management';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function BookingManagementPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <PageHeader
          title="Booking Details"
          description="View and manage your appointment booking"
          variant="compact"
          actions={[
            {
              label: 'Back',
              onClick: () => router.back(),
              icon: ArrowLeft,
              variant: 'ghost',
            },
          ]}
        />
        <BookingManagement bookingId={bookingId} />
      </div>
    </div>
  );
}
