import { auth } from '@/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { Calendar, Clock, User } from 'lucide-react';
import { redirect } from 'next/navigation';

interface BookAppointmentPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function BookAppointmentPage({
  params,
}: BookAppointmentPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get business information and verify access
  const business = await prisma.business.findUnique({
    where: { slug: params.businessSlug },
    include: {
      users: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!business || business.users.length === 0) {
    redirect('/onboarding');
  }

  const userRole = business.users[0]?.role || 'STAFF';

  return (
    <DashboardLayout
      businessSlug={params.businessSlug}
      userRole={userRole}
      userName={session.user.name || session.user.email || 'User'}
      businessName={business.name}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="lumina-heading-2">Book Appointment</h1>
          <p className="lumina-body-large" style={{ color: '#808285' }}>
            Schedule a new appointment for your clients
          </p>
        </div>

        {/* Booking Interface Placeholder */}
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="lumina-heading-3 flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: '#ff7a5a' }} />
              Appointment Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mb-6 flex justify-center space-x-4">
                <Calendar className="h-8 w-8" style={{ color: '#ff7a5a' }} />
                <Clock className="h-8 w-8" style={{ color: '#ff7a5a' }} />
                <User className="h-8 w-8" style={{ color: '#ff7a5a' }} />
              </div>
              <h3 className="text-lumina-primary mb-2 text-lg font-semibold">
                Booking Interface Coming Soon
              </h3>
              <p className="mb-4" style={{ color: '#808285' }}>
                Complete appointment booking system will be available here.
              </p>
              <p className="text-sm" style={{ color: '#808285' }}>
                Features will include: Client selection, service booking, staff
                assignment, time slot selection, and automated confirmations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
