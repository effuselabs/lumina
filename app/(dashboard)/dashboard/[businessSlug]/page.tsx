import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';

interface DashboardPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Get business by slug and verify user access
  const business = await prisma.business.findFirst({
    where: {
      slug: params.businessSlug,
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
          userId: true,
        },
      },
      _count: {
        select: {
          staff: true,
          services: true,
          clients: true,
          appointments: true,
        },
      },
    },
  });

  if (!business) {
    redirect('/onboarding');
  }

  const userRole = business.users[0]?.role;

  return (
    <DashboardClient
      business={business}
      userRole={userRole}
      userName={session.user.name || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
