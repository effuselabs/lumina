'use client';

import { useThemeSwitcher } from '@/hooks/use-theme-switcher';
import { Building2, LogOut, Moon, Sun } from 'lucide-react';
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
  return (
    <header className="border-line bg-surface flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <MobileMenuButton onClick={onMenuToggle} />

        {/* Business Name */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <div className="bg-surface-muted flex h-8 w-8 items-center justify-center rounded-lg">
              <Building2
                className="text-ink-brand h-4 w-4"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-ink-strong text-sm font-semibold">
              {businessName}
            </h1>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <SignOutButton />
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
      className="text-ink-soft hover:bg-surface-muted hover:text-ink-strong focus-visible:ring-ring relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      onClick={toggleTheme}
      disabled={isTransitioning}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

/**
 * Ends the session. The handler existed and nothing rendered it, so there was
 * no way to sign out of a shared salon device (#136). Icon-only on a phone,
 * where the header is narrow; the accessible name is the same everywhere.
 */
function SignOutButton() {
  return (
    <button
      type="button"
      className="text-ink-soft hover:bg-surface-muted hover:text-ink-strong focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
    >
      <LogOut className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Sign out</span>
    </button>
  );
}
