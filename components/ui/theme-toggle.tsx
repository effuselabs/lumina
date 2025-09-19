'use client';

import { useThemeSwitcher } from '@/hooks/use-theme-switcher';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './button';

interface ThemeToggleProps {
    variant?: 'icon' | 'dropdown' | 'switch';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function ThemeToggle({
    variant = 'icon',
    size = 'md',
    showLabel = false
}: ThemeToggleProps) {
    const {
        theme,
        resolvedTheme: _resolvedTheme,
        isDark,
        isSystem,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        setSystemTheme,
        isTransitioning,
    } = useThemeSwitcher();

    if (variant === 'icon') {
        return (
            <Button
                variant="ghost"
                size={size}
                onClick={toggleTheme}
                disabled={isTransitioning}
                className="relative"
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                {showLabel && (
                    <span className="ml-2">
                        {isDark ? 'Light' : 'Dark'} Mode
                    </span>
                )}
            </Button>
        );
    }

    if (variant === 'dropdown') {
        return (
            <div className="flex items-center space-x-2">
                <Button
                    variant={theme === 'light' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={setLightTheme}
                    disabled={isTransitioning}
                    className="flex items-center space-x-1"
                >
                    <Sun className="h-3 w-3" />
                    {showLabel && <span>Light</span>}
                </Button>
                <Button
                    variant={theme === 'dark' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={setDarkTheme}
                    disabled={isTransitioning}
                    className="flex items-center space-x-1"
                >
                    <Moon className="h-3 w-3" />
                    {showLabel && <span>Dark</span>}
                </Button>
                <Button
                    variant={theme === 'system' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={setSystemTheme}
                    disabled={isTransitioning}
                    className="flex items-center space-x-1"
                >
                    <Monitor className="h-3 w-3" />
                    {showLabel && <span>System</span>}
                </Button>
            </div>
        );
    }

    if (variant === 'switch') {
        return (
            <div className="flex items-center space-x-3">
                <Sun className="h-4 w-4" />
                <button
                    onClick={toggleTheme}
                    disabled={isTransitioning}
                    className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isDark
                            ? 'bg-primary'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }
            ${isTransitioning ? 'opacity-50' : ''}
          `}
                    aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
                >
                    <span
                        className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isDark ? 'translate-x-6' : 'translate-x-1'}
            `}
                    />
                </button>
                <Moon className="h-4 w-4" />
                {showLabel && (
                    <span className="text-sm text-muted-foreground">
                        {isSystem ? 'System' : isDark ? 'Dark' : 'Light'} Mode
                    </span>
                )}
            </div>
        );
    }

    return null;
}

export default ThemeToggle;