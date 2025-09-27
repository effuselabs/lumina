'use client';

import { ReactNode } from 'react';

interface SimpleBusinessInfo {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface SimpleBookingLayoutProps {
  business: SimpleBusinessInfo;
  children: ReactNode;
}

export function SimpleBookingLayout({
  business,
  children,
}: SimpleBookingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-center sm:h-20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-lg font-bold text-white sm:h-12 sm:w-12">
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                  {business.name}
                </h1>
                <p className="hidden text-sm text-gray-600 sm:block">
                  Book your appointment
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Booking Content */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              {children}
            </div>
          </div>

          {/* Business Information Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                Contact Information
              </h3>
              <div className="space-y-3 text-sm">
                {business.address && (
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p className="text-gray-600">{business.address}</p>
                  </div>
                )}
                {business.phone && (
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <a
                      href={`tel:${business.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.email && (
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <a
                      href={`mailto:${business.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {business.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            <p>
              © {new Date().getFullYear()} {business.name}. All rights
              reserved.
            </p>
            <p className="mt-1">
              Powered by{' '}
              <span className="font-medium text-yellow-500">Lumina</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
