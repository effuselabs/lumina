import { auth } from '@/auth';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { prisma } from '@/lib/prisma';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
