import { requireBusinessAccess } from '@/lib/auth';
import { AppointmentCalendarPageContent } from '@/components/appointments/appointment-calendar-page-content';
import { prisma } from '@/lib/prisma';

interface AppointmentCalendarPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

/**
 * Appointment Calendar Page
 *
 * Provides calendar view interface for appointment management:
 * - Day, week, and month calendar views
 * - Drag-and-drop appointment rescheduling
 * - Real-time appointment updates
 * - Staff scheduling and availability
 * - Multi-tenant business scoping
 */
export default async function AppointmentCalendarPage(
  props: AppointmentCalendarPageProps
) {
  const params = await props.params;
  const {
    user,
    business: accessible,
    role: userRole,
  } = await requireBusinessAccess(params.businessSlug);

  // Scoped by the business the check just proved access to.
  const [staff, services, businessHours] = await Promise.all([
    prisma.staff.findMany({
      where: { businessId: accessible.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        isActive: true,
        user: { select: { email: true } },
      },
    }),
    prisma.service.findMany({
      where: { businessId: accessible.id },
      select: { id: true, name: true, duration: true, price: true },
    }),
    // The real hours. The calendar used to invent Mon–Fri 9–5.
    prisma.businessHours.findMany({
      where: { businessId: accessible.id },
      select: {
        dayOfWeek: true,
        openTime: true,
        closeTime: true,
        isClosed: true,
      },
    }),
  ]);
  // Prisma Decimals cannot cross into a client component; send numbers.
  const business = {
    ...accessible,
    staff,
    services: services.map(service => ({
      ...service,
      price: Number(service.price),
    })),
  };

  return (
    <AppointmentCalendarPageContent
      business={business}
      businessHours={businessHours}
      timezone={accessible.timezone}
      userRole={userRole}
      userName={user.name || user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
