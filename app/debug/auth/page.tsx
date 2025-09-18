import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function AuthDebugPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold">Auth Debug - No Session</h1>
        <p>No authenticated session found.</p>
      </div>
    );
  }

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      businesses: {
        include: {
          business: true,
        },
      },
    },
  });

  // Get all businesses
  const allBusinesses = await prisma.business.findMany({
    include: {
      users: true,
    },
  });

  // Get all business users
  const allBusinessUsers = await prisma.businessUser.findMany({
    include: {
      user: true,
      business: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Authentication Debug</h1>

      <div className="space-y-6">
        <div className="rounded bg-blue-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">Current Session</h2>
          <pre className="overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="rounded bg-green-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">User Details</h2>
          <pre className="overflow-auto text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="rounded bg-yellow-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">All Businesses</h2>
          <pre className="overflow-auto text-sm">
            {JSON.stringify(allBusinesses, null, 2)}
          </pre>
        </div>

        <div className="rounded bg-purple-50 p-4">
          <h2 className="mb-2 text-lg font-semibold">All Business Users</h2>
          <pre className="overflow-auto text-sm">
            {JSON.stringify(allBusinessUsers, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
