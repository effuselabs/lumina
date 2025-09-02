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

  // eslint-disable-next-line no-console
  console.log('Business dashboard page accessed:', {
    businessSlug: params.businessSlug,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
  });

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

  // eslint-disable-next-line no-console
  console.log('Business lookup result:', {
    businessSlug: params.businessSlug,
    businessFound: !!business,
    businessName: business?.name,
    userHasAccess: business?.users?.length > 0,
  });

  if (!business) {
    // eslint-disable-next-line no-console
    console.log('Business not found or no access, redirecting to onboarding');
    redirect('/onboarding');
  }

  const userRole = business.users[0]?.role;

  // eslint-disable-next-line no-console
  console.log('Rendering dashboard client for business:', business.name);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardClient
        business={business}
        userRole={userRole}
        userName={session.user.name || 'User'}
        businessSlug={params.businessSlug}
      />
    </div>
  );
}
