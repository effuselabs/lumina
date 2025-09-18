'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Bell, Building2, HelpCircle, Search } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { MobileMenuButton } from './sidebar-navigation';

interface DashboardHeaderProps {
  businessName: string;
  userName: string;
  userRole: string;
  businessSlug: string;
  onMenuToggle: () => void;
}

export function DashboardHeader({
  businessName,
  userName: _userName,
  userRole: _userRole,
  businessSlug: _businessSlug,
  onMenuToggle,
}: DashboardHeaderProps) {
  // TODO: Replace with real notification count from API
  const notificationCount = 3;

  const _handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <header className="dashboard-header">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <MobileMenuButton onClick={onMenuToggle} />

        {/* Business Name */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <div className="business-icon-container">
              <Building2 className="business-icon h-4 w-4" />
            </div>
            <h1 className="business-name">{businessName}</h1>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="mx-8 max-w-2xl flex-1">
        <div className="relative">
          <Search className="text-lumina-secondary absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform" />
          <Input
            placeholder="Search clients, appointments, services, staff..."
            className="rounded-xl border-2 border-gray-200 bg-white py-3 pl-12 pr-4 text-base transition-all duration-200 placeholder:text-gray-400 focus:border-lumina-gold focus:ring-2 focus:ring-lumina-gold/20"
            style={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        {/* Search Button (Mobile) */}
        <button className="header-action-button md:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="header-action-button">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="header-notification-badge">
                  {notificationCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 p-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">
                  New appointment booked
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Sarah Johnson booked a haircut for tomorrow at 2:00 PM
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-900">
                  Payment received
                </p>
                <p className="mt-1 text-xs text-green-700">
                  $85.00 payment processed for Mike Rodriguez
                </p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm font-medium text-orange-900">
                  Staff schedule update
                </p>
                <p className="mt-1 text-xs text-orange-700">
                  Emma Chen requested time off for next Friday
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <button className="header-action-button">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </button>
      </div>
    </header>
  );
}
