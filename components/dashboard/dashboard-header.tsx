'use client';

import { useThemeSwitcher } from '@/hooks/use-theme-switcher';
import { Building2, Moon, Sun } from 'lucide-react';
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

      {/* Header Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
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
