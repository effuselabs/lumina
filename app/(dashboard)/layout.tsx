import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if user has completed onboarding (has at least one business)
  const userBusinesses = await prisma.businessUser.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      business: true,
    },
  });

  // If user has no businesses, redirect to onboarding
  if (userBusinesses.length === 0) {
    redirect('/onboarding');
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
