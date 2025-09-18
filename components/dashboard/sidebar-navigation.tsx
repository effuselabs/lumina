'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Scissors,
  Settings,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavigationItem[];
  roles?: string[];
}

interface SidebarNavigationProps {
  businessSlug: string;
  userRole: string;
  currentPath: string;
  userName?: string;
  businessName?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function SidebarNavigation({
  businessSlug,
  userRole,
  currentPath: _currentPath,
  userName = 'User',
  businessName: _businessName = 'Business',
  isOpen = false,
  onToggle,
  className,
}: SidebarNavigationProps) {
  const pathname = usePathname();

  // TODO: Replace with real data from API
  const upcomingAppointments = 3;
  const pendingPayments = 2;

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: `/dashboard/${businessSlug}`,
      icon: LayoutDashboard,
    },
    {
      id: 'appointments',
      label: 'Appointments',
      href: `/dashboard/${businessSlug}/appointments`,
      icon: Calendar,
      badge: upcomingAppointments,
      children: [
        {
          id: 'calendar',
          label: 'Calendar View',
          href: `/dashboard/${businessSlug}/appointments/calendar`,
          icon: CalendarDays,
        },
        {
          id: 'book',
          label: 'Book Appointment',
          href: `/dashboard/${businessSlug}/appointments/book`,
          icon: Plus,
        },
      ],
    },
    {
      id: 'clients',
      label: 'Clients',
      href: `/dashboard/${businessSlug}/clients`,
      icon: Users,
    },
    {
      id: 'services',
      label: 'Services',
      href: `/dashboard/${businessSlug}/services`,
      icon: Scissors,
    },
    {
      id: 'staff',
      label: 'Staff',
      href: `/dashboard/${businessSlug}/staff`,
      icon: UserCheck,
    },
    {
      id: 'payments',
      label: 'Payments & Finance',
      href: `/dashboard/${businessSlug}/payments`,
      icon: Wallet,
      badge: pendingPayments,
      children: [
        {
          id: 'transactions',
          label: 'Transactions',
          href: `/dashboard/${businessSlug}/payments/transactions`,
          icon: Receipt,
        },
        {
          id: 'reports',
          label: 'Financial Reports',
          href: `/dashboard/${businessSlug}/payments/reports`,
          icon: TrendingUp,
        },
        {
          id: 'pos',
          label: 'POS System',
          href: `/dashboard/${businessSlug}/payments/pos`,
          icon: ShoppingCart,
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      href: `/dashboard/${businessSlug}/analytics`,
      icon: BarChart3,
      roles: ['OWNER', 'MANAGER'],
    },
    {
      id: 'settings',
      label: 'Settings',
      href: `/dashboard/${businessSlug}/settings`,
      icon: Settings,
      roles: ['OWNER'],
    },
  ];

  const filteredItems = navigationItems.filter(
    item => !item.roles || item.roles.includes(userRole)
  );

  const isItemActive = (item: NavigationItem): boolean => {
    if (pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => pathname === child.href);
    }
    return false;
  };

  const isChildActive = (child: NavigationItem): boolean => {
    return pathname === child.href;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={cn('dashboard-sidebar', isOpen && 'open', className)}>
        <nav className="sidebar-nav">
          {/* Header */}
          <div className="sidebar-nav-header">
            <div className="flex items-center justify-between">
              <Link
                href={`/dashboard/${businessSlug}`}
                className="text-lumina-primary flex items-center gap-3 text-xl font-bold transition-colors hover:text-lumina-coral"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumina-radiant">
                  <span className="text-sm font-bold text-white">L</span>
                </div>
                Lumina
              </Link>

              {/* Mobile Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Content */}
          <div className="sidebar-nav-content">
            {/* Core Navigation */}
            <div className="sidebar-nav-group">
              <div className="sidebar-nav-section">Overview</div>
              <div className="space-y-1">
                {filteredItems.slice(0, 2).map(item => (
                  <div key={item.id}>
                    {/* Main Navigation Item */}
                    <Link
                      href={item.href}
                      className={cn(
                        'sidebar-nav-item',
                        isItemActive(item) && 'active'
                      )}
                      onClick={() => {
                        // Close mobile sidebar when navigating
                        if (onToggle && window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="sidebar-nav-badge">{item.badge}</span>
                      )}
                    </Link>

                    {/* Sub-navigation */}
                    {item.children && isItemActive(item) && (
                      <div className="border-sidebar-border ml-6 mt-1 space-y-1 border-l pl-3">
                        {item.children.map(child => (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={cn(
                              'sidebar-nav-item py-2 text-sm',
                              isChildActive(child) && 'active'
                            )}
                            onClick={() => {
                              // Close mobile sidebar when navigating
                              if (onToggle && window.innerWidth < 1024) {
                                onToggle();
                              }
                            }}
                          >
                            <child.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Business Management */}
            <div className="sidebar-nav-group">
              <div className="sidebar-nav-section">Management</div>
              <div className="space-y-1">
                {filteredItems.slice(2, 5).map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'sidebar-nav-item',
                      isItemActive(item) && 'active'
                    )}
                    onClick={() => {
                      // Close mobile sidebar when navigating
                      if (onToggle && window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="sidebar-nav-badge">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Financial & Analytics */}
            <div className="sidebar-nav-group">
              <div className="sidebar-nav-section">Business Intelligence</div>
              <div className="space-y-1">
                {filteredItems.slice(5).map(item => (
                  <div key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        'sidebar-nav-item',
                        isItemActive(item) && 'active'
                      )}
                      onClick={() => {
                        // Close mobile sidebar when navigating
                        if (onToggle && window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="sidebar-nav-badge">{item.badge}</span>
                      )}
                    </Link>

                    {/* Sub-navigation */}
                    {item.children && isItemActive(item) && (
                      <div className="border-sidebar-border ml-6 mt-1 space-y-1 border-l pl-3">
                        {item.children.map(child => (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={cn(
                              'sidebar-nav-item py-2 text-sm',
                              isChildActive(child) && 'active'
                            )}
                            onClick={() => {
                              // Close mobile sidebar when navigating
                              if (onToggle && window.innerWidth < 1024) {
                                onToggle();
                              }
                            }}
                          >
                            <child.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="sidebar-nav-footer">
            <div className="sidebar-user-profile">
              <div className="sidebar-user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{userName}</div>
                <div className="sidebar-user-role">{userRole}</div>
              </div>
              <Settings className="text-lumina-secondary h-4 w-4 opacity-60" />
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}

// Mobile Menu Button Component
interface MobileMenuButtonProps {
  onClick: () => void;
  className?: string;
}

export function MobileMenuButton({
  onClick,
  className,
}: MobileMenuButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('lg:hidden', className)}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Open navigation menu</span>
    </Button>
  );
}
