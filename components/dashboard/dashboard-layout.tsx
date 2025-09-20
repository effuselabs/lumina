'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardHeader } from './dashboard-header';
import { SidebarNavigation } from './sidebar-navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  businessSlug: string;
  userRole: string;
  userName: string;
  businessName: string;
  className?: string;
}

export function DashboardLayout({
  children,
  businessSlug,
  userRole,
  userName,
  businessName,
  className,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="lumina-dashboard-theme">
      <div className={cn('dashboard-grid', className)}>
        {/* Sidebar Navigation */}
        <SidebarNavigation
          businessSlug={businessSlug}
          userRole={userRole}
          currentPath={pathname}
          userName={userName}
          businessName={businessName}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="dashboard-main">
          {/* Dashboard Header */}
          <DashboardHeader
            businessName={businessName}
            userName={userName}
            userRole={userRole}
            businessSlug={businessSlug}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Main Content */}
          <main className="dashboard-content">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
