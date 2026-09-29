import { requireBusinessAccess } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User } from 'lucide-react';

interface BookAppointmentPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export default async function BookAppointmentPage(
  props: BookAppointmentPageProps
) {
  const params = await props.params;
  const {
    user,
    business,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  return (
    <DashboardLayout
      businessSlug={params.businessSlug}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessName={business.name}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="lumina-heading-2">Book Appointment</h1>
          <p className="lumina-body-large text-color-foreground-muted">
            Schedule a new appointment for your clients
          </p>
        </div>

        {/* Booking Interface Placeholder */}
        <Card className="border-color-border bg-color-surface border shadow-sm">
          <CardHeader>
            <CardTitle className="lumina-heading-3 flex items-center gap-2">
              <Calendar className="text-color-primary h-5 w-5" />
              Appointment Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <div className="mb-6 flex justify-center space-x-4">
                <Calendar className="text-color-primary h-8 w-8" />
                <Clock className="text-color-primary h-8 w-8" />
                <User className="text-color-primary h-8 w-8" />
              </div>
              <h3 className="text-lumina-primary mb-2 text-lg font-semibold">
                Booking Interface Coming Soon
              </h3>
              <p className="text-color-foreground-muted mb-4">
                Complete appointment booking system will be available here.
              </p>
              <p className="text-color-foreground-muted text-sm">
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
