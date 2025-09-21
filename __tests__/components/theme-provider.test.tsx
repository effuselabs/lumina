/**
 * @jest-environment jsdom
 */

import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Test component that uses the theme context
function TestComponent() {
    const { theme, setTheme, resolvedTheme, isTransitioning } = useTheme();

    return (
        <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
            <div data-testid="is-transitioning">{isTransitioning ? 'true' : 'false'}</div>
            <button onClick={() => setTheme('light')} data-testid="set-light">
                Set Light
            </button>
            <button onClick={() => setTheme('dark')} data-testid="set-dark">
                Set Dark
            </button>
            <button onClick={() => setTheme('system')} data-testid="set-system">
                Set System
            </button>
        </div>
    );
}

function renderWithThemeProvider(
    children: ReactNode,
    props: { defaultTheme?: 'light' | 'dark' | 'system'; storageKey?: string } = {}
) {
    return render(
        <ThemeProvider {...props}>
            {children}
        </ThemeProvider>
    );
}

describe('ThemeProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);

        // Reset document classes
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.colorScheme = '';
    });

    describe('Initialization', () => {
        it('should initialize with system theme by default', async () => {
            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
            });
        });

        it('should initialize with custom default theme', async () => {
            renderWithThemeProvider(<TestComponent />, { defaultTheme: 'dark' });

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('dark');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
            });
        });

        it('should load theme from localStorage', async () => {
            localStorageMock.getItem.mockReturnValue('dark');

            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('dark');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
            });
        });

        it('should fallback to default theme when localStorage has invalid value', async () => {
            localStorageMock.getItem.mockReturnValue('invalid-theme');

            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
            });
        });
    });

    describe('Theme Switching', () => {
        it('should switch to light theme', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
            });

            await user.click(screen.getByTestId('set-light'));

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('light');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
            });

            expect(localStorageMock.setItem).toHaveBeenCalledWith('lumina-theme', 'light');
        });

        it('should switch to dark theme', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
            });

            await user.click(screen.getByTestId('set-dark'));

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('dark');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
            });

            expect(localStorageMock.setItem).toHaveBeenCalledWith('lumina-theme', 'dark');
        });

        it('should switch to system theme', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            // First set to light theme
            await user.click(screen.getByTestId('set-light'));

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('light');
            });

            // Then switch to system
            await user.click(screen.getByTestId('set-system'));

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
            });

            expect(localStorageMock.setItem).toHaveBeenCalledWith('lumina-theme', 'system');
        });

        it('should handle transition state', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false');
            });

            await user.click(screen.getByTestId('set-dark'));

            // Should show transitioning state briefly
            expect(screen.getByTestId('is-transitioning')).toHaveTextContent('true');

            // Should return to false after transition
            await waitFor(() => {
                expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false');
            }, { timeout: 300 });
        });
    });

    describe('System Theme Detection', () => {
        it('should detect system dark theme preference', async () => {
            // Mock system dark theme preference
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
            });
        });

        it('should respond to system theme changes', async () => {
            let mediaQueryCallback: ((e: MediaQueryListEvent) => void) | null = null;

            // Mock system theme change
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn((event, callback) => {
                    if (event === 'change') {
                        mediaQueryCallback = callback;
                    }
                }),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            }));

            renderWithThemeProvider(<TestComponent />);

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('system');
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
            });

            // Simulate system theme change to light
            if (mediaQueryCallback) {
                act(() => {
                    mediaQueryCallback({ matches: false } as MediaQueryListEvent);
                });
            }

            await waitFor(() => {
                expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
            });
        });
    });

    describe('Document Integration', () => {
        it('should apply theme classes to document', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            await user.click(screen.getByTestId('set-dark'));

            await waitFor(() => {
                expect(document.documentElement).toHaveClass('dark');
                expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
                expect(document.documentElement.style.colorScheme).toBe('dark');
            });
        });

        it('should update meta theme-color tag', async () => {
            // Add meta theme-color tag
            const metaTag = document.createElement('meta');
            metaTag.name = 'theme-color';
            metaTag.content = '#F7F5F0';
            document.head.appendChild(metaTag);

            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            await user.click(screen.getByTestId('set-dark'));

            await waitFor(() => {
                const updatedMetaTag = document.querySelector('meta[name="theme-color"]');
                expect(updatedMetaTag).toHaveAttribute('content', '#0A0A0A');
            });

            // Cleanup
            document.head.removeChild(metaTag);
        });
    });

    describe('Error Handling', () => {
        it('should handle localStorage errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />);

            await user.click(screen.getByTestId('set-dark'));

            await waitFor(() => {
                expect(screen.getByTestId('theme')).toHaveTextContent('dark');
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to save theme preference:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should validate theme values', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const { rerender } = renderWithThemeProvider(<TestComponent />);

            // Try to set invalid theme
            const { setTheme } = useTheme();

            // This should be handled by the component validation
            act(() => {
                // @ts-expect-error - Testing invalid theme value
                setTheme('invalid-theme');
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Invalid theme value:',
                'invalid-theme'
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Custom Storage Key', () => {
        it('should use custom storage key', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<TestComponent />, { storageKey: 'custom-theme' });

            await user.click(screen.getByTestId('set-dark'));

            expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-theme', 'dark');
        });
    });

    describe('Hydration', () => {
        it('should prevent hydration mismatch', () => {
            const { container } = renderWithThemeProvider(<TestComponent />);

            // Should render hidden content initially
            const hiddenDiv = container.querySelector('div[style*="visibility: hidden"]');
            expect(hiddenDiv).toBeInTheDocument();
        });
    });
});