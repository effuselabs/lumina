import { auth } from '@/auth';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
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

  // Get the current pathname to determine if we're on onboarding
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';

  // For onboarding page, render without dashboard navigation and skip business check
  if (pathname === '/onboarding') {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
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

  // Extract business slug from pathname for navigation
  const businessSlugMatch = pathname.match(/^\/dashboard\/([^\/]+)/);
  const businessSlug = businessSlugMatch ? businessSlugMatch[1] : undefined;

  // For business dashboard pages, let the page handle its own layout
  if (businessSlug) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav businessSlug={businessSlug} />

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
