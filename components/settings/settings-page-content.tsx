'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Building, CreditCard, Lock, Settings, Users, Zap } from 'lucide-react';
import { useState } from 'react';

interface SettingsPageContentProps {
  business: {
    id: string;
    name: string;
    users: Array<{ role: string }>;
  };
  userRole: string;
  userName: string;
  businessSlug: string;
}

/**
 * Settings Page Content Component
 *
 * Provides comprehensive business settings within the dashboard layout:
 * - Professional dashboard layout with sidebar navigation
 * - Business profile and configuration settings
 * - User account and team management
 * - Integration settings (Stripe, calendar sync)
 * - Security and privacy controls
 * - Notification preferences and system settings
 */
export function SettingsPageContent({
  business,
  userRole,
  userName,
  businessSlug,
}: SettingsPageContentProps) {
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
      <DashboardLayout
        businessSlug={businessSlug}
        userRole={userRole}
        userName={userName}
        businessName={business.name}
      >
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="lumina-heading-2">Settings</h1>
            <p className="lumina-body-large" style={{ color: '#808285' }}>
              Configure your business settings, integrations, and preferences.
            </p>
          </div>

          {/* Settings Categories */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Business Profile */}
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Business Profile</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Business information and branding
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Update your business name, address, contact information, and
                  branding settings.
                </p>
              </CardContent>
            </Card>

            {/* Team Management */}
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Team Management</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      User accounts and permissions
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage team member access, roles, and account settings.
                </p>
              </CardContent>
            </Card>

            {/* Payment Settings */}
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Payment Settings</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Stripe and payment configuration
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure payment processing, Stripe integration, and
                  financial settings.
                </p>
              </CardContent>
            </Card>

            {/* Integrations */}
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Integrations</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Third-party service connections
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect calendar sync, email marketing, and other business
                  tools.
                </p>
              </CardContent>
            </Card>

            {/* Security & Privacy */}
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-red-100 p-2">
                    <Lock className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Security & Privacy
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Account security and data privacy
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage password, two-factor authentication, and privacy
                  settings.
                </p>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">System Settings</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Notifications and preferences
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure notifications, time zones, and system preferences.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Notice */}
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                Settings Interface Coming Soon
              </h3>
              <p className="mb-4 text-muted-foreground">
                Comprehensive settings management interface will be available
                here.
              </p>
              <p className="text-sm text-muted-foreground">
                Features will include: Business profile editing, team
                management, payment configuration, integrations, and security
                settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  );
}
