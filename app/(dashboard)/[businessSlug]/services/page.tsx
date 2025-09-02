import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface ServicesPageProps {
  params: {
    businessSlug: string;
  };
}

export const metadata: Metadata = {
  title: 'Service Management | Lumina',
  description: 'Manage your services and pricing',
};

export default async function ServicesPage({ params }: ServicesPageProps) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600">
            Manage your service offerings and pricing
          </p>
        </div>
      </div>

      {/* Service management components will go here */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">
          Service management interface coming soon...
        </p>
      </div>
    </div>
  );
}
