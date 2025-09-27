'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BusinessInfo } from '@/types/booking';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import Image from 'next/image';
import { ReactNode } from 'react';

interface PublicBookingLayoutProps {
  business: BusinessInfo;
  children: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function PublicBookingLayout({
  business,
  children,
  showBackButton = false,
  onBack,
}: PublicBookingLayoutProps) {
  const brandColors = business.branding?.brandColors || {
    primary: '#FFD25A',
    secondary: '#FF7A5A',
    accent: '#0B2B33',
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      style={
        {
          '--brand-primary': brandColors.primary,
          '--brand-secondary': brandColors.secondary,
          '--brand-accent': brandColors.accent,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-20">
            {/* Back Button */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}

            {/* Business Logo and Name */}
            <div className="flex flex-1 items-center justify-center gap-3 sm:justify-start">
              {business.logo ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100 sm:h-12 sm:w-12">
                  <Image
                    src={business.logo}
                    alt={`${business.name} logo`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 40px, 48px"
                  />
                </div>
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white sm:h-12 sm:w-12"
                  style={{ backgroundColor: brandColors.primary }}
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="max-w-[200px] truncate text-lg font-bold text-gray-900 sm:max-w-none sm:text-xl">
                  {business.name}
                </h1>
                <p className="hidden text-sm text-gray-600 sm:block">
                  Book your appointment
                </p>
              </div>
            </div>

            {/* Contact Info - Desktop Only */}
            <div className="hidden items-center gap-4 text-sm text-gray-600 lg:flex">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-1 transition-colors hover:text-gray-900"
                >
                  <Phone className="h-4 w-4" />
                  {business.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Booking Content */}
          <div className="lg:col-span-2">
            <Card className="p-4 sm:p-6 lg:p-8">{children}</Card>
          </div>

          {/* Business Information Sidebar */}
          <div className="lg:col-span-1">
            <BusinessInfoSidebar business={business} />
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
              <span
                className="font-medium"
                style={{ color: brandColors.primary }}
              >
                Lumina
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface BusinessInfoSidebarProps {
  business: BusinessInfo;
}

function BusinessInfoSidebar({ business }: BusinessInfoSidebarProps) {
  const brandColors = business.branding?.brandColors || {
    primary: '#FFD25A',
    secondary: '#FF7A5A',
    accent: '#0B2B33',
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: brandColors.primary }}
          />
          Contact Information
        </h3>
        <div className="space-y-3">
          {business.address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-600">{business.address}</p>
              </div>
            </div>
          )}

          {business.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Phone</p>
                <a
                  href={`tel:${business.phone}`}
                  className="text-sm hover:underline"
                  style={{ color: brandColors.accent }}
                >
                  {business.phone}
                </a>
              </div>
            </div>
          )}

          {business.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <a
                  href={`mailto:${business.email}`}
                  className="text-sm hover:underline"
                  style={{ color: brandColors.accent }}
                >
                  {business.email}
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Business Hours */}
      {business.businessHours && business.businessHours.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: brandColors.primary }}
            />
            Business Hours
          </h3>
          <div className="space-y-2">
            {business.businessHours.map((hours, index) => {
              const dayNames = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
              ];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-gray-900">
                    {dayNames[hours.dayOfWeek]}
                  </span>
                  <span className="text-gray-600">
                    {hours.isClosed
                      ? 'Closed'
                      : `${hours.openTime || 'N/A'} - ${hours.closeTime || 'N/A'}`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Policies */}
      {business.policies && (
        <Card className="p-4 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: brandColors.primary }}
            />
            Policies
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            {business.policies.cancellationPolicy && (
              <div>
                <p className="mb-1 font-medium text-gray-900">
                  Cancellation Policy
                </p>
                <p>{business.policies.cancellationPolicy}</p>
              </div>
            )}
            {business.policies.noShowPolicy && (
              <div>
                <p className="mb-1 font-medium text-gray-900">No-Show Policy</p>
                <p>{business.policies.noShowPolicy}</p>
              </div>
            )}
            {business.policies.preparationInstructions && (
              <div>
                <p className="mb-1 font-medium text-gray-900">
                  Preparation Instructions
                </p>
                <p>{business.policies.preparationInstructions}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Actions - Mobile */}
      <div className="lg:hidden">
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {business.phone && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.open(`tel:${business.phone}`)}
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
            )}
            {business.email && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.open(`mailto:${business.email}`)}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
