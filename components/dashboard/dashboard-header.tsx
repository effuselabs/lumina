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
import { useThemeSwitcher } from '@/hooks/use-theme-switcher';
import { Bell, Building2, HelpCircle, Moon, Search, Sun } from 'lucide-react';
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
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <MobileMenuButton onClick={onMenuToggle} />

        {/* Business Name */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
              <Building2
                className="h-4 w-4 text-ink-brand"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-sm font-semibold text-ink-strong">
              {businessName}
            </h1>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="mx-4 hidden max-w-2xl flex-1 md:block">
        <div className="relative">
          <Search className="text-lumina-secondary absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform" />
          <Input
            aria-label="Search clients, appointments, services and staff"
            placeholder="Search clients, appointments, services, staff..."
            className="focus:ring-lumina-gold/20 rounded-xl border-2 border-line bg-surface py-3 pl-12 pr-4 text-base transition-all duration-200 placeholder:text-ink-faint focus:border-lumina-gold focus:ring-2"
            style={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1">
        {/* Search Button (Mobile) */}
        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </button>

        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="sidebar-nav-badge absolute -right-1 -top-1 px-1.5 py-0 leading-5">
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
        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </button>
      </div>
    </header>
  );
}

/** Light/dark toggle. Until it is used, the theme follows the OS. */
function ThemeToggle() {
  const { isDark, isTransitioning, toggleTheme } = useThemeSwitcher();
  const label = `Switch to ${isDark ? 'light' : 'dark'} theme`;
  return (
    <button
      type="button"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={toggleTheme}
      disabled={isTransitioning}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
