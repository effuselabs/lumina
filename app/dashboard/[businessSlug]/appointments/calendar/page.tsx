import { auth } from '@/auth';
import { AppointmentCalendarPageContent } from '@/components/appointments/appointment-calendar-page-content';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface AppointmentCalendarPageProps {
    params: {
        businessSlug: string;
    };
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
export default async function AppointmentCalendarPage({
    params,
}: AppointmentCalendarPageProps) {
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
            staff: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
            services: {
                select: {
                    id: true,
                    name: true,
                    duration: true,
                    price: true,
                },
            },
        },
    });

    if (!business || business.users.length === 0) {
        redirect('/onboarding');
    }

    const userRole = business.users[0]?.role || 'STAFF';

    return (
        <AppointmentCalendarPageContent
            business={business}
            userRole={userRole}
            userName={session.user.name || session.user.email || 'User'}
            businessSlug={params.businessSlug}
        />
    );
}