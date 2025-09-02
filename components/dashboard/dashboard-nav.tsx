'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

interface DashboardNavProps {
  businessSlug?: string;
}

export function DashboardNav({ businessSlug }: DashboardNavProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const params = useParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get business slug from props or URL params
  const currentBusinessSlug = businessSlug || (params?.businessSlug as string);

  // Generate navigation items with business-scoped URLs
  const navigation = useMemo(() => {
    if (!currentBusinessSlug) {
      return [{ name: 'Dashboard', href: '/dashboard', icon: Home }];
    }

    return [
      {
        name: 'Dashboard',
        href: `/dashboard/${currentBusinessSlug}`,
        icon: Home,
      },
      {
        name: 'Services',
        href: `/dashboard/${currentBusinessSlug}/services`,
        icon: Scissors,
      },
      {
        name: 'Appointments',
        href: `/dashboard/${currentBusinessSlug}/appointments`,
        icon: Calendar,
      },
      {
        name: 'Clients',
        href: `/dashboard/${currentBusinessSlug}/clients`,
        icon: Users,
      },
      {
        name: 'Staff',
        href: `/dashboard/${currentBusinessSlug}/staff`,
        icon: Users,
      },
      {
        name: 'Payments',
        href: `/dashboard/${currentBusinessSlug}/payments`,
        icon: Wallet,
      },
      {
        name: 'Settings',
        href: `/dashboard/${currentBusinessSlug}/settings`,
        icon: Settings,
      },
    ];
  }, [currentBusinessSlug]);

  const handleSignOut = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-400 to-orange-500">
                <span className="text-lg font-bold text-white">L</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">
                Lumina
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map(item => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            isActive
                              ? 'bg-orange-50 text-orange-700'
                              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700',
                            'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors'
                          )}
                        >
                          <item.icon
                            className={cn(
                              isActive
                                ? 'text-orange-700'
                                : 'text-gray-400 group-hover:text-orange-700',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* User Menu */}
              <li className="mt-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-start p-2"
                    >
                      <div className="flex items-center gap-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-orange-500">
                          <span className="text-sm font-medium text-white">
                            {session?.user?.name?.charAt(0)?.toUpperCase() ||
                              'U'}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-900">
                            {session?.user?.name || 'User'}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {session?.user?.email}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/settings/profile">Profile Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings/business">Business Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="-m-2.5 p-2.5"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
          <span className="sr-only">Open sidebar</span>
        </Button>

        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          Lumina
        </div>

        {/* Mobile User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-orange-500">
                <span className="text-sm font-medium text-white">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/business">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                  <span className="sr-only">Close sidebar</span>
                </Button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                {/* Mobile Logo */}
                <div className="flex h-16 shrink-0 items-center">
                  <Link href="/dashboard" className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-400 to-orange-500">
                      <span className="text-lg font-bold text-white">L</span>
                    </div>
                    <span className="ml-3 text-xl font-bold text-gray-900">
                      Lumina
                    </span>
                  </Link>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map(item => {
                          const isActive = pathname === item.href;
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  isActive
                                    ? 'bg-orange-50 text-orange-700'
                                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700',
                                  'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    isActive
                                      ? 'text-orange-700'
                                      : 'text-gray-400 group-hover:text-orange-700',
                                    'h-6 w-6 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
