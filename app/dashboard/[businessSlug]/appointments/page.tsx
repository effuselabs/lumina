import { auth } from '@/auth';
import { AppointmentsPageContent } from '@/components/appointments/appointments-page-content';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface AppointmentsPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function AppointmentsPage({
  params,
}: AppointmentsPageProps) {
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
    <AppointmentsPageContent
      business={business}
      userRole={userRole}
      userName={session.user.name || session.user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
