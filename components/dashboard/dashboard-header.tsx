'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Bell, HelpCircle, LogOut, Search, Settings, User } from 'lucide-react';
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
  userName,
  userRole,
  businessSlug,
  onMenuToggle,
}: DashboardHeaderProps) {
  // TODO: Replace with real notification count from API
  const notificationCount = 3;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <header className="dashboard-header">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <MobileMenuButton onClick={onMenuToggle} />

        {/* Business Name & Breadcrumb */}
        <div className="hidden sm:block">
          <h1 className="text-xl font-semibold text-lumina-primary">
            {businessName}
          </h1>
          <p className="text-sm text-lumina-secondary">
            Welcome back, {userName}
          </p>
        </div>
      </div>

      {/* Search Bar (Desktop) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lumina-secondary" />
          <Input
            placeholder="Search clients, appointments, services..."
            className="pl-10 bg-dashboard-bg border-dashboard-border focus:ring-lumina-gold"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {/* Search Button (Mobile) */}
        <Button variant="ghost" size="sm" className="md:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                >
                  {notificationCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 p-2">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  New appointment booked
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Sarah Johnson booked a haircut for tomorrow at 2:00 PM
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-900">
                  Payment received
                </p>
                <p className="text-xs text-green-700 mt-1">
                  $85.00 payment processed for Mike Rodriguez
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm font-medium text-orange-900">
                  Staff schedule update
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Emma Chen requested time off for next Friday
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button variant="ghost" size="sm">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lumina-radiant rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-lumina-primary">{userName}</p>
                <p className="text-xs text-lumina-secondary">{userRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Business ID (Development) */}
        <div className="hidden lg:block">
          <span className="text-xs text-lumina-secondary bg-dashboard-bg px-2 py-1 rounded border">
            ID: {businessSlug}
          </span>
        </div>
      </div>
    </header>
  );
}