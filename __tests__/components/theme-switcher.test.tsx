/**
 * @jest-environment jsdom
 */

import { ThemeProvider } from '@/components/theme-provider';
import { ThemeIndicator, ThemeStatus, ThemeSwitcher } from '@/components/ui/theme-switcher';
import { render, screen, waitFor } from '@testing-library/react';
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
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

function renderWithThemeProvider(
    children: ReactNode,
    props: { defaultTheme?: 'light' | 'dark' | 'system' } = {}
) {
    return render(
        <ThemeProvider defaultTheme={props.defaultTheme || 'system'}>
            {children}
        </ThemeProvider>
    );
}

describe('ThemeSwitcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);

        // Reset document classes
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.colorScheme = '';
    });

    describe('Default Variant', () => {
        it('should render all theme options', async () => {
            renderWithThemeProvider(<ThemeSwitcher />);

            await waitFor(() => {
                expect(screen.getByLabelText('Switch to light theme')).toBeInTheDocument();
                expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
                expect(screen.getByLabelText('Use system theme')).toBeInTheDocument();
            });
        });

        it('should show labels when showLabels is true', async () => {
            renderWithThemeProvider(<ThemeSwitcher showLabels={true} />);

            await waitFor(() => {
                expect(screen.getByText('Light')).toBeInTheDocument();
                expect(screen.getByText('Dark')).toBeInTheDocument();
                expect(screen.getByText('System')).toBeInTheDocument();
            });
        });

        it('should hide labels when showLabels is false', async () => {
            renderWithThemeProvider(<ThemeSwitcher showLabels={false} />);

            await waitFor(() => {
                expect(screen.queryByText('Light')).not.toBeInTheDocument();
                expect(screen.queryByText('Dark')).not.toBeInTheDocument();
                expect(screen.queryByText('System')).not.toBeInTheDocument();
            });
        });

        it('should highlight active theme', async () => {
            renderWithThemeProvider(<ThemeSwitcher />, { defaultTheme: 'light' });

            await waitFor(() => {
                const lightButton = screen.getByLabelText('Switch to light theme');
                expect(lightButton).toHaveAttribute('aria-pressed', 'true');

                const darkButton = screen.getByLabelText('Switch to dark theme');
                expect(darkButton).toHaveAttribute('aria-pressed', 'false');

                const systemButton = screen.getByLabelText('Use system theme');
                expect(systemButton).toHaveAttribute('aria-pressed', 'false');
            });
        });

        it('should switch themes when buttons are clicked', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<ThemeSwitcher />);

            // Initially system theme
            await waitFor(() => {
                const systemButton = screen.getByLabelText('Use system theme');
                expect(systemButton).toHaveAttribute('aria-pressed', 'true');
            });

            // Click light theme
            await user.click(screen.getByLabelText('Switch to light theme'));

            await waitFor(() => {
                const lightButton = screen.getByLabelText('Switch to light theme');
                expect(lightButton).toHaveAttribute('aria-pressed', 'true');
            });

            // Click dark theme
            await user.click(screen.getByLabelText('Switch to dark theme'));

            await waitFor(() => {
                const darkButton = screen.getByLabelText('Switch to dark theme');
                expect(darkButton).toHaveAttribute('aria-pressed', 'true');
            });
        });

        it('should disable buttons during transition', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<ThemeSwitcher />);

            const lightButton = screen.getByLabelText('Switch to light theme');
            const darkButton = screen.getByLabelText('Switch to dark theme');
            const systemButton = screen.getByLabelText('Use system theme');

            // Click to start transition
            await user.click(lightButton);

            // All buttons should be disabled during transition
            expect(lightButton).toBeDisabled();
            expect(darkButton).toBeDisabled();
            expect(systemButton).toBeDisabled();

            // Should re-enable after transition
            await waitFor(() => {
                expect(lightButton).not.toBeDisabled();
                expect(darkButton).not.toBeDisabled();
                expect(systemButton).not.toBeDisabled();
            }, { timeout: 300 });
        });
    });

    describe('Compact Variant', () => {
        it('should render toggle button', async () => {
            renderWithThemeProvider(<ThemeSwitcher variant="compact" />);

            await waitFor(() => {
                const toggleButton = screen.getByLabelText(/Switch to (light|dark) theme/);
                expect(toggleButton).toBeInTheDocument();
            });
        });

        it('should toggle between light and dark themes', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<ThemeSwitcher variant="compact" />, { defaultTheme: 'light' });

            await waitFor(() => {
                expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
            });

            // Click to toggle to dark
            await user.click(screen.getByLabelText('Switch to dark theme'));

            await waitFor(() => {
                expect(screen.getByLabelText('Switch to light theme')).toBeInTheDocument();
            });

            // Click to toggle back to light
            await user.click(screen.getByLabelText('Switch to light theme'));

            await waitFor(() => {
                expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
            });
        });

        it('should show correct icon for current theme', async () => {
            renderWithThemeProvider(<ThemeSwitcher variant="compact" />, { defaultTheme: 'light' });

            await waitFor(() => {
                // Should show moon icon when in light theme (to switch to dark)
                const moonIcon = document.querySelector('svg');
                expect(moonIcon).toBeInTheDocument();
            });
        });

        it('should disable during transition', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<ThemeSwitcher variant="compact" />);

            const toggleButton = screen.getByRole('button');

            await user.click(toggleButton);

            expect(toggleButton).toBeDisabled();

            await waitFor(() => {
                expect(toggleButton).not.toBeDisabled();
            }, { timeout: 300 });
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', async () => {
            renderWithThemeProvider(<ThemeSwitcher />);

            await waitFor(() => {
                const lightButton = screen.getByLabelText('Switch to light theme');
                const darkButton = screen.getByLabelText('Switch to dark theme');
                const systemButton = screen.getByLabelText('Use system theme');

                expect(lightButton).toHaveAttribute('aria-pressed');
                expect(darkButton).toHaveAttribute('aria-pressed');
                expect(systemButton).toHaveAttribute('aria-pressed');
            });
        });

        it('should be keyboard accessible', async () => {
            const user = userEvent.setup();
            renderWithThemeProvider(<ThemeSwitcher />);

            // Tab to first button
            await user.tab();
            expect(screen.getByLabelText('Switch to light theme')).toHaveFocus();

            // Press Enter to activate
            await user.keyboard('{Enter}');

            await waitFor(() => {
                const lightButton = screen.getByLabelText('Switch to light theme');
                expect(lightButton).toHaveAttribute('aria-pressed', 'true');
            });
        });
    });

    describe('Custom Styling', () => {
        it('should apply custom className', async () => {
            renderWithThemeProvider(<ThemeSwitcher className="custom-class" />);

            await waitFor(() => {
                const container = document.querySelector('.custom-class');
                expect(container).toBeInTheDocument();
            });
        });
    });
});

describe('ThemeIndicator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should show current theme', async () => {
        renderWithThemeProvider(<ThemeIndicator />, { defaultTheme: 'light' });

        await waitFor(() => {
            expect(screen.getByText('Light')).toBeInTheDocument();
        });
    });

    it('should show system indicator when using system theme', async () => {
        renderWithThemeProvider(<ThemeIndicator />, { defaultTheme: 'system' });

        await waitFor(() => {
            expect(screen.getByText('(System)')).toBeInTheDocument();
        });
    });

    it('should show transitioning state', async () => {
        const user = userEvent.setup();
        renderWithThemeProvider(
            <div>
                <ThemeSwitcher />
                <ThemeIndicator />
            </div>
        );

        // Trigger theme change
        await user.click(screen.getByLabelText('Switch to dark theme'));

        // Should show transitioning state briefly
        expect(screen.getByText('Switching...')).toBeInTheDocument();

        // Should disappear after transition
        await waitFor(() => {
            expect(screen.queryByText('Switching...')).not.toBeInTheDocument();
        }, { timeout: 300 });
    });
});

describe('ThemeStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should show theme debug information', async () => {
        renderWithThemeProvider(<ThemeStatus />, { defaultTheme: 'light' });

        await waitFor(() => {
            expect(screen.getByText(/Theme:/)).toBeInTheDocument();
            expect(screen.getByText(/Resolved:/)).toBeInTheDocument();
            expect(screen.getByText(/States:/)).toBeInTheDocument();
        });
    });

    it('should show correct theme values', async () => {
        renderWithThemeProvider(<ThemeStatus />, { defaultTheme: 'dark' });

        await waitFor(() => {
            expect(screen.getByText('dark')).toBeInTheDocument();
        });
    });

    it('should show transitioning state in debug info', async () => {
        const user = userEvent.setup();
        renderWithThemeProvider(
            <div>
                <ThemeSwitcher />
                <ThemeStatus />
            </div>
        );

        // Trigger theme change
        await user.click(screen.getByLabelText('Switch to dark theme'));

        // Should show transitioning in states
        expect(screen.getByText(/transitioning/)).toBeInTheDocument();

        // Should disappear after transition
        await waitFor(() => {
            expect(screen.queryByText(/transitioning/)).not.toBeInTheDocument();
        }, { timeout: 300 });
    });
});