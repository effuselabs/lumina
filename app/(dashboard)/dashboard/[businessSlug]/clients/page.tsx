import { auth } from '@/auth';
import { ClientsPageContent } from '@/components/clients/clients-page-content';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';

interface ClientsPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function ClientsPage({ params }: ClientsPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Find the business by slug
  const business = await prisma.business.findUnique({
    where: { slug: params.businessSlug },
    select: { id: true, name: true },
  });

  if (!business) {
    notFound();
  }

  // Verify user has access to this business
  const businessUser = await prisma.businessUser.findFirst({
    where: {
      businessId: business.id,
      userId: session.user.id,
    },
    select: { role: true },
  });

  if (!businessUser) {
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
              <h1 className="text-lg font-semibold text-gray-900">Clients</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ClientsPageContent businessId={business.id} />
      </main>
    </div>
  );
}
