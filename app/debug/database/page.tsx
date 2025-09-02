import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function DatabaseDebugPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Get user's businesses
  const userBusinesses = await prisma.businessUser.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      business: true,
    },
  });

  // Get all businesses (for debugging)
  const allBusinesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  // Get all users (for debugging)
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          businesses: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Database Debug Information
        </h1>

        {/* Current User Info */}
        <div className="mb-8 rounded-lg border bg-blue-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">Current User</h2>
          <p>
            <strong>ID:</strong> {session.user.id}
          </p>
          <p>
            <strong>Name:</strong> {session.user.name}
          </p>
          <p>
            <strong>Email:</strong> {session.user.email}
          </p>
        </div>

        {/* User's Businesses */}
        <div className="mb-8 rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-semibold">
            Your Businesses ({userBusinesses.length})
          </h2>
          {userBusinesses.length === 0 ? (
            <p className="text-red-600">
              No businesses found for your account. This is why you&apos;re
              being redirected to onboarding.
            </p>
          ) : (
            <div className="space-y-2">
              {userBusinesses.map(ub => (
                <div key={ub.id} className="rounded bg-green-50 p-2">
                  <p>
                    <strong>Business:</strong> {ub.business.name}
                  </p>
                  <p>
                    <strong>Slug:</strong> {ub.business.slug}
                  </p>
                  <p>
                    <strong>Role:</strong> {ub.role}
                  </p>
                  <p>
                    <strong>Dashboard URL:</strong>{' '}
                    <a
                      href={`/dashboard/${ub.business.slug}`}
                      className="text-blue-600 underline"
                    >
                      /dashboard/{ub.business.slug}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Businesses */}
        <div className="mb-8 rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-semibold">
            All Businesses in Database ({allBusinesses.length})
          </h2>
          {allBusinesses.length === 0 ? (
            <p className="text-yellow-600">
              No businesses exist in the database.
            </p>
          ) : (
            <div className="space-y-2">
              {allBusinesses.map(business => (
                <div key={business.id} className="rounded bg-gray-50 p-2">
                  <p>
                    <strong>Name:</strong> {business.name}
                  </p>
                  <p>
                    <strong>Slug:</strong> {business.slug}
                  </p>
                  <p>
                    <strong>Users:</strong> {business._count.users}
                  </p>
                  <p>
                    <strong>Created:</strong>{' '}
                    {business.createdAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Users */}
        <div className="mb-8 rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-semibold">
            All Users in Database ({allUsers.length})
          </h2>
          <div className="space-y-2">
            {allUsers.map(user => (
              <div key={user.id} className="rounded bg-gray-50 p-2">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Businesses:</strong> {user._count.businesses}
                </p>
                <p>
                  <strong>Created:</strong>{' '}
                  {user.createdAt.toLocaleDateString()}
                </p>
                {user.id === session.user.id && (
                  <p className="font-semibold text-blue-600">← This is you</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-lg border bg-yellow-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">Next Steps</h2>
          {userBusinesses.length === 0 ? (
            <div>
              <p className="mb-2">
                You don&apos;t have any businesses associated with your account.
                You can:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <a href="/onboarding" className="text-blue-600 underline">
                    Complete onboarding to create a new business
                  </a>
                </li>
                <li>
                  Or ask an existing business owner to invite you as staff
                </li>
              </ul>
            </div>
          ) : (
            <div>
              <p className="mb-2">
                You have businesses! You can access your dashboard:
              </p>
              <ul className="list-inside list-disc space-y-1">
                {userBusinesses.map(ub => (
                  <li key={ub.id}>
                    <a
                      href={`/dashboard/${ub.business.slug}`}
                      className="text-blue-600 underline"
                    >
                      Go to {ub.business.name} Dashboard
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
