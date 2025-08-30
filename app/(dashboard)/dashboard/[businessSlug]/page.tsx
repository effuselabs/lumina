import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

interface DashboardPageProps {
  params: {
    businessSlug: string;
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
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
    include: {
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
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

  if (!business) {
    redirect('/onboarding');
  }

  const userRole = business.users[0]?.role;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        businessName={business.name}
        userRole={userRole}
        userName={session.user.name || 'User'}
        businessSlug={params.businessSlug}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Total Staff
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {business._count.staff}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Services
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {business._count.services}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Clients
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {business._count.clients}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v-1a4 4 0 014-4h4a4 4 0 014 4v1a4 4 0 11-8 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Appointments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {business._count.appointments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-8 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 p-8 text-white shadow-lg">
          <h2 className="mb-2 text-2xl font-bold">
            🎉 Welcome to your Lumina dashboard!
          </h2>
          <p className="mb-4 text-orange-100">
            Your business profile has been created successfully. Here are some
            next steps to get you started:
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white bg-opacity-20 p-4">
              <h3 className="mb-2 font-semibold">1. Add Services</h3>
              <p className="text-sm text-orange-100">
                Create your service menu with pricing and duration
              </p>
            </div>
            <div className="rounded-lg bg-white bg-opacity-20 p-4">
              <h3 className="mb-2 font-semibold">2. Invite Staff</h3>
              <p className="text-sm text-orange-100">
                Add your team members and configure their roles
              </p>
            </div>
            <div className="rounded-lg bg-white bg-opacity-20 p-4">
              <h3 className="mb-2 font-semibold">3. Import Clients</h3>
              <p className="text-sm text-orange-100">
                Upload your existing client database
              </p>
            </div>
          </div>
        </div>

        {/* Business Info Card */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Business Information
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-500">
                Contact Information
              </h4>
              <div className="space-y-2">
                {business.email && (
                  <p className="text-sm text-gray-900">📧 {business.email}</p>
                )}
                {business.phone && (
                  <p className="text-sm text-gray-900">📞 {business.phone}</p>
                )}
                {business.website && (
                  <p className="text-sm text-gray-900">
                    🌐{' '}
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700"
                    >
                      {business.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-500">
                Location
              </h4>
              <div className="space-y-1">
                {business.address && (
                  <p className="text-sm text-gray-900">{business.address}</p>
                )}
                {(business.city || business.state || business.zipCode) && (
                  <p className="text-sm text-gray-900">
                    {[business.city, business.state, business.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
