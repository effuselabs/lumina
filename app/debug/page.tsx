import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function DebugPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Debug Information</h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Session Info</h2>
          <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">User Businesses</h2>
          <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">
            {JSON.stringify(userBusinesses, null, 2)}
          </pre>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Actions</h2>
          <div className="space-y-4">
            <a
              href="/api/auth/signout"
              className="inline-block rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Sign Out
            </a>

            <a
              href="/dashboard"
              className="ml-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </a>

            <a
              href="/onboarding"
              className="ml-4 inline-block rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Go to Onboarding
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
