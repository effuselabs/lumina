import { authConfig } from '@/lib/auth-config';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect('/auth/signin');
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
