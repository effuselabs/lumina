import { auth } from '@/auth';
import { ServiceList } from '@/components/services/service-list';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface ServicesPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function ServicesPage({ params }: ServicesPageProps) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <a
                href={`/dashboard/${params.businessSlug}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </a>
              <div className="text-sm text-gray-400">|</div>
              <h1 className="text-lg font-semibold text-gray-900">Services</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="mt-2 text-gray-600">
            Manage your salon services, pricing, and availability
          </p>
        </div>

        <ServiceList businessId={business.id} />
      </main>
    </div>
  );
}
