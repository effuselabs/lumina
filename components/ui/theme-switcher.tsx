'use client';

import { useThemeSwitcher } from '@/hooks/use-theme-switcher';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './button';

interface ThemeSwitcherProps {
  variant?: 'default' | 'compact' | 'dropdown';
  className?: string;
  showLabels?: boolean;
}

export function ThemeSwitcher({
  variant = 'default',
  className,
  showLabels = true,
}: ThemeSwitcherProps) {
  const {
    theme,
    resolvedTheme,
    isDark,
    isLight,
    isSystem,
    isTransitioning,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    toggleTheme,
  } = useThemeSwitcher();

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        disabled={isTransitioning}
        className={cn(
          'h-9 w-9 px-0 transition-all duration-200',
          isTransitioning && 'cursor-not-allowed opacity-50',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        <div className="relative">
          {isDark ? (
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-200" />
          ) : (
            <Moon className="h-4 w-4 rotate-0 scale-100 transition-transform duration-200" />
          )}
        </div>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg bg-muted p-1',
        className
      )}
    >
      <Button
        variant={isLight ? 'primary' : 'ghost'}
        size="sm"
        onClick={setLightTheme}
        disabled={isTransitioning}
        className={cn(
          'h-8 px-3 transition-all duration-200',
          isLight && 'bg-background shadow-sm',
          isTransitioning && 'cursor-not-allowed opacity-50'
        )}
        aria-label="Switch to light theme"
        aria-pressed={isLight}
      >
        <Sun className="h-4 w-4" />
        {showLabels && <span className="ml-2 text-xs">Light</span>}
      </Button>

      <Button
        variant={isDark ? 'primary' : 'ghost'}
        size="sm"
        onClick={setDarkTheme}
        disabled={isTransitioning}
        className={cn(
          'h-8 px-3 transition-all duration-200',
          isDark && 'bg-background shadow-sm',
          isTransitioning && 'cursor-not-allowed opacity-50'
        )}
        aria-label="Switch to dark theme"
        aria-pressed={isDark}
      >
        <Moon className="h-4 w-4" />
        {showLabels && <span className="ml-2 text-xs">Dark</span>}
      </Button>

      <Button
        variant={isSystem ? 'primary' : 'ghost'}
        size="sm"
        onClick={setSystemTheme}
        disabled={isTransitioning}
        className={cn(
          'h-8 px-3 transition-all duration-200',
          isSystem && 'bg-background shadow-sm',
          isTransitioning && 'cursor-not-allowed opacity-50'
        )}
        aria-label="Use system theme"
        aria-pressed={isSystem}
      >
        <Monitor className="h-4 w-4" />
        {showLabels && <span className="ml-2 text-xs">System</span>}
      </Button>
    </div>
  );
}
