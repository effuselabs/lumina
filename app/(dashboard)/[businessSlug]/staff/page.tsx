import { auth } from '@/auth';
import { StaffList } from '@/components/staff';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface StaffPageProps {
  params: {
    businessSlug: string;
  };
}

export const metadata: Metadata = {
  title: 'Staff Management | Lumina',
  description: 'Manage your team members and their employment settings',
};

export default async function StaffPage({ params }: StaffPageProps) {
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
    select: {
      id: true,
      name: true,
    },
  });

  if (!business) {
    redirect('/onboarding');
  }

  return (
    <div className="space-y-6">
      <StaffList businessId={business.id} />
    </div>
  );
}
