import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  // If user is authenticated, check if they have a business
  if (session?.user?.id) {
    const userBusiness = await prisma.businessUser.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (userBusiness) {
      // User has a business, redirect to dashboard
      redirect('/dashboard');
    } else {
      // User doesn't have a business, redirect to onboarding
      redirect('/onboarding');
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              <span className="lumina-gradient-text">Lumina</span>
            </h1>
            <p className="mb-8 text-xl text-gray-600 sm:text-2xl">
              Intelligent Software for Small Business Growth
            </p>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              AI-powered business management platform designed specifically for
              salons and barbershops. Streamline booking, client management, and
              financials with intelligent insights.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="lumina-gradient inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Get Started Free
            </Link>
            <Link
              href="/book/demo"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
            >
              Book a Demo
            </Link>
          </div>

          {/* Features Preview */}
          <div className="mt-20">
            <h2 className="mb-12 text-3xl font-bold text-gray-900">
              Everything you need to grow your business
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Smart Booking
                </h3>
                <p className="text-gray-600">
                  Real-time availability, automated confirmations, and seamless
                  client experience.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
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
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Client Management
                </h3>
                <p className="text-gray-600">
                  Comprehensive CRM with history, preferences, and automated
                  communications.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <svg
                    className="h-6 w-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  AI Insights
                </h3>
                <p className="text-gray-600">
                  Intelligent analytics that reveal opportunities and optimize
                  your revenue.
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-16 rounded-lg bg-yellow-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-yellow-800">
              🚧 Development in Progress
            </h3>
            <p className="text-yellow-700">
              Lumina is currently under active development. This is the
              foundation setup phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
