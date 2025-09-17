'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    Calendar,
    CalendarDays,
    CreditCard,
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
    isOpen?: boolean;
    onToggle?: () => void;
    className?: string;
}

export function SidebarNavigation({
    businessSlug,
    userRole,
    currentPath,
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

    const filteredItems = navigationItems.filter(item =>
        !item.roles || item.roles.includes(userRole)
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
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'dashboard-sidebar',
                    isOpen && 'open',
                    className
                )}
            >
                <nav className="sidebar-nav">
                    {/* Header */}
                    <div className="sidebar-nav-header">
                        <div className="flex items-center justify-between">
                            <Link
                                href={`/dashboard/${businessSlug}`}
                                className="flex items-center gap-3 text-xl font-bold text-lumina-primary hover:text-lumina-coral transition-colors"
                            >
                                <div className="w-8 h-8 bg-lumina-radiant rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">L</span>
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
                        <div className="space-y-1">
                            {filteredItems.map((item) => (
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
                                            <Badge
                                                variant="destructive"
                                                className="h-5 min-w-5 text-xs px-1.5"
                                            >
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </Link>

                                    {/* Sub-navigation */}
                                    {item.children && isItemActive(item) && (
                                        <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.id}
                                                    href={child.href}
                                                    className={cn(
                                                        'sidebar-nav-item text-sm py-2',
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

                        {/* Quick Actions Section */}
                        <div className="mt-8 pt-6 border-t border-sidebar-border">
                            <div className="sidebar-nav-section mb-3">
                                Quick Actions
                            </div>
                            <div className="space-y-1">
                                <Link
                                    href={`/dashboard/${businessSlug}/appointments/book`}
                                    className="sidebar-nav-item text-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Book Appointment</span>
                                </Link>
                                <Link
                                    href={`/dashboard/${businessSlug}/clients?action=add`}
                                    className="sidebar-nav-item text-sm"
                                >
                                    <Users className="h-4 w-4" />
                                    <span>Add Client</span>
                                </Link>
                                <Link
                                    href={`/dashboard/${businessSlug}/payments/pos`}
                                    className="sidebar-nav-item text-sm"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    <span>Process Payment</span>
                                </Link>
                            </div>
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

export function MobileMenuButton({ onClick, className }: MobileMenuButtonProps) {
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