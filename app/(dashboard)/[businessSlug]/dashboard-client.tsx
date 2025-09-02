'use client';

import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { useState } from 'react';

interface DashboardClientProps {
  business: {
    id: string;
    name: string;
    users: Array<{ userId: string }>;
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

// Business-scoped data fetching hook
function useBusinessStats(businessId: string) {
  return useQuery({
    queryKey: ['business-stats', businessId],
    queryFn: async () => {
      const response = await fetch(`/api/businesses/${businessId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!businessId,
  });
}

function DashboardContent({
  business,
  userRole,
  userName,
  businessSlug,
}: DashboardClientProps) {
  const { data: _stats, isLoading, error } = useBusinessStats(business.id);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav businessSlug={businessSlug} />
        <div className="lg:pl-72">
          <main className="py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="text-lg font-semibold text-red-800">
                  Unable to load dashboard
                </h3>
                <p className="mt-2 text-red-600">
                  We&apos;re having trouble loading your business data. Please
                  try refreshing the page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav businessSlug={businessSlug} />

      <div className="lg:pl-72">
        {/* Header with proper accessibility */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{business.name}</span>
                  <span aria-hidden="true">•</span>
                  <span className="capitalize">{userRole}</span>
                  <span aria-hidden="true">•</span>
                  <span>Welcome back, {userName}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {isLoading ? (
              <DashboardSkeleton />
            ) : (
              <div
                className="space-y-6"
                role="main"
                aria-label="Business dashboard"
              >
                {/* Welcome Section */}
                <div className="overflow-hidden rounded-lg bg-white shadow">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Welcome to {business.name}
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                      <p>
                        Your business dashboard is ready. Here you can manage
                        your services, clients, and appointments.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">
                              Total Clients
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              0
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 0 5.25 9h13.5A2.25 2.25 0 0 0 21 11.25v7.5"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">
                              Today&apos;s Appointments
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              0
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">
                              Monthly Revenue
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              $0
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">
                              Active Services
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              0
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Getting Started */}
                <div className="rounded-lg bg-white shadow">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Getting Started
                    </h3>
                    <div className="mt-5">
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                              <span className="text-sm font-medium text-orange-800">
                                1
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              Set up your services
                            </h4>
                            <p className="text-sm text-gray-500">
                              Add the services you offer to your clients.
                            </p>
                            <div className="mt-2">
                              <a
                                href={`/dashboard/${businessSlug}/services`}
                                className="text-sm text-orange-600 hover:text-orange-500"
                              >
                                Manage services →
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                              <span className="text-sm font-medium text-orange-800">
                                2
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              Add your clients
                            </h4>
                            <p className="text-sm text-gray-500">
                              Import or manually add your client information.
                            </p>
                            <div className="mt-2">
                              <a
                                href={`/dashboard/${businessSlug}/clients`}
                                className="text-sm text-orange-600 hover:text-orange-500"
                              >
                                Manage clients →
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                              <span className="text-sm font-medium text-orange-800">
                                3
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              Start booking appointments
                            </h4>
                            <p className="text-sm text-gray-500">
                              Begin scheduling appointments for your clients.
                            </p>
                            <div className="mt-2">
                              <a
                                href={`/dashboard/${businessSlug}/appointments`}
                                className="text-sm text-orange-600 hover:text-orange-500"
                              >
                                View calendar →
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Loading skeleton component following UI standards
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      {/* Welcome Section Skeleton */}
      <div className="animate-pulse overflow-hidden rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-2 h-6 w-1/3 rounded bg-gray-200"></div>
          <div className="h-4 w-2/3 rounded bg-gray-200"></div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="h-6 w-6 rounded bg-gray-200"></div>
                <div className="ml-5 flex-1">
                  <div className="mb-2 h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-6 w-12 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started Skeleton */}
      <div className="animate-pulse rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 h-6 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="ml-4 flex-1">
                  <div className="mb-2 h-4 w-1/3 rounded bg-gray-200"></div>
                  <div className="h-3 w-2/3 rounded bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardClient(props: DashboardClientProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 3,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent {...props} />
    </QueryClientProvider>
  );
}
