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

/**
 * Theme indicator component for showing current theme state
 */
export function ThemeIndicator({ className }: { className?: string }) {
  const { theme, resolvedTheme, isTransitioning } = useThemeSwitcher();

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {resolvedTheme === 'dark' ? (
          <Moon className="h-3 w-3" />
        ) : (
          <Sun className="h-3 w-3" />
        )}
        <span className="capitalize">{resolvedTheme}</span>
      </div>

      {theme === 'system' && (
        <span className="text-xs opacity-75">(System)</span>
      )}

      {isTransitioning && (
        <span className="animate-pulse text-xs opacity-75">Switching...</span>
      )}
    </div>
  );
}

/**
 * Theme status component for debugging and development
 */
export function ThemeStatus({ className }: { className?: string }) {
  const { theme, resolvedTheme, isDark, isLight, isSystem, isTransitioning } =
    useThemeSwitcher();

  return (
    <div className={cn('space-y-1 text-xs text-muted-foreground', className)}>
      <div>
        Theme: <span className="font-mono">{theme}</span>
      </div>
      <div>
        Resolved: <span className="font-mono">{resolvedTheme}</span>
      </div>
      <div>
        States:{' '}
        {[
          isDark && 'dark',
          isLight && 'light',
          isSystem && 'system',
          isTransitioning && 'transitioning',
        ]
          .filter(Boolean)
          .join(', ')}
      </div>
    </div>
  );
}
