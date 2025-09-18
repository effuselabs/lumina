import { auth } from '@/auth';
import { StaffPageContent } from '@/components/staff/staff-page-content';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface StaffPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function StaffPage({ params }: StaffPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get business by slug and verify user access
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
    <StaffPageContent
      business={business}
      userRole={userRole}
      userName={session.user.name || session.user.email || 'User'}
      businessSlug={params.businessSlug}
    />
  );
}
