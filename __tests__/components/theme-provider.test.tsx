import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

// Test component that uses the theme
function TestComponent() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    return (
        <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
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

describe('ThemeProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('renders with default theme', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('system');
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
        });
    });

    it('allows setting light theme', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('set-light'));

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('light');
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
        });

        expect(localStorageMock.setItem).toHaveBeenCalledWith('lumina-theme', 'light');
    });

    it('allows setting dark theme', async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('set-dark'));

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('dark');
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
        });

        expect(localStorageMock.setItem).toHaveBeenCalledWith('lumina-theme', 'dark');
    });

    it('loads saved theme from localStorage', async () => {
        localStorageMock.getItem.mockReturnValue('dark');

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('dark');
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
        });
    });

    it('handles localStorage errors gracefully', async () => {
        localStorageMock.getItem.mockImplementation(() => {
            throw new Error('localStorage error');
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toHaveTextContent('system');
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to load theme preference:',
            expect.any(Error)
        );

        consoleSpy.mockRestore();
    });

    it('uses custom storage key', async () => {
        render(
            <ThemeProvider storageKey="custom-theme">
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('theme')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('set-light'));

        await waitFor(() => {
            expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-theme', 'light');
        });
    });

    it('throws error when useTheme is used outside provider', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useTheme must be used within a ThemeProvider');

        consoleSpy.mockRestore();
    });
});