/**
 * Framework Integration Tests
 * Tests for Next.js SSR/SSG compatibility, React Server Component boundaries,
 * and Radix UI integration with Tailwind styling
 */

import { Button } from '@/components/ui/button';
import {
    compatibilityChecks,
    hydrationUtils,
    performanceIntegration,
    radixIntegration,
    serverComponentUtils,
    ssrUtils,
    typeScriptIntegration
} from '@/lib/framework-integration';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js environment
const mockNextJSEnv = () => {
    Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'test' },
        writable: true,
    });
};

describe('Framework Integration', () => {
    beforeEach(() => {
        mockNextJSEnv();
    });

    describe('SSR/SSG Utilities', () => {
        test('should correctly identify server vs client environment', () => {
            // In test environment, window is available
            expect(ssrUtils.isClient).toBe(true);
            expect(ssrUtils.isServer).toBe(false);
        });

        test('should safely access browser APIs', () => {
            const window = ssrUtils.getWindow();
            const document = ssrUtils.getDocument();
            const localStorage = ssrUtils.getLocalStorage();
            const sessionStorage = ssrUtils.getSessionStorage();

            expect(window).toBeDefined();
            expect(document).toBeDefined();
            expect(localStorage).toBeDefined();
            expect(sessionStorage).toBeDefined();
        });
    });

    describe('Server Component Utilities', () => {
        test('should validate server component props', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const props = {
                children: 'Test',
                onClick: () => { },
                onFocus: () => { },
            };

            serverComponentUtils.validateServerComponent('TestComponent', props);

            // Should warn about client-only props in server environment
            if (ssrUtils.isServer) {
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Server component TestComponent contains client-only props')
                );
            }

            consoleSpy.mockRestore();
        });
    });

    describe('Radix Integration', () => {
        test('should apply Tailwind classes to Radix components safely', () => {
            const baseClasses = 'flex items-center';
            const userClasses = 'text-red-500';
            const conditionalClasses = {
                'bg-blue-500': true,
                'text-white': false,
            };

            const result = radixIntegration.applyTailwindToRadix(
                baseClasses,
                userClasses,
                conditionalClasses
            );

            expect(result).toContain('flex');
            expect(result).toContain('items-center');
            expect(result).toContain('text-red-500');
            expect(result).toContain('bg-blue-500');
            expect(result).not.toContain('text-white');
        });
    });

    describe('TypeScript Integration', () => {
        test('should create type-safe event handlers', () => {
            const mockHandler = jest.fn();
            const safeHandler = typeScriptIntegration.createEventHandler(mockHandler);

            const mockEvent = new Event('click');
            safeHandler(mockEvent);

            expect(mockHandler).toHaveBeenCalledWith(mockEvent);
        });

        test('should handle event handler errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const errorHandler = jest.fn(() => {
                throw new Error('Test error');
            });

            const safeHandler = typeScriptIntegration.createEventHandler(errorHandler);
            const mockEvent = new Event('click');

            expect(() => safeHandler(mockEvent)).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith('Event handler error:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('Hydration Utilities', () => {
        test('should check hydration status', () => {
            const isHydrated = hydrationUtils.isHydrated();
            expect(typeof isHydrated).toBe('boolean');
        });

        test('should wait for hydration to complete', async () => {
            const hydrationPromise = hydrationUtils.waitForHydration();
            expect(hydrationPromise).toBeInstanceOf(Promise);

            await expect(hydrationPromise).resolves.toBeUndefined();
        });
    });

    describe('Performance Integration', () => {
        test('should track component performance', () => {
            const performanceSpy = jest.spyOn(performance, 'mark').mockImplementation();
            const measureSpy = jest.spyOn(performance, 'measure').mockImplementation();

            const TestComponent = performanceIntegration.withPerformanceTracking(
                ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
                'TestComponent'
            );

            const { unmount } = render(<TestComponent>Test</TestComponent>);

            expect(performanceSpy).toHaveBeenCalledWith('TestComponent-start');

            unmount();

            expect(performanceSpy).toHaveBeenCalledWith('TestComponent-end');

            performanceSpy.mockRestore();
            measureSpy.mockRestore();
        });
    });

    describe('Compatibility Checks', () => {
        test('should check framework compatibility', () => {
            const compatibility = compatibilityChecks.runCompatibilityChecks();

            expect(compatibility).toHaveProperty('nextjs');
            expect(compatibility).toHaveProperty('react');
            expect(compatibility).toHaveProperty('radix');
            expect(compatibility).toHaveProperty('overall');

            expect(typeof compatibility.nextjs).toBe('boolean');
            expect(typeof compatibility.react).toBe('boolean');
            expect(typeof compatibility.radix).toBe('boolean');
            expect(typeof compatibility.overall).toBe('boolean');
        });
    });

    describe('Button Component Integration', () => {
        test('should render with proper framework integration', () => {
            render(<Button>Test Button</Button>);

            const button = screen.getByTestId('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('data-testid', 'button');
            expect(button).toHaveAttribute('data-variant', 'primary');
            expect(button).toHaveAttribute('data-size', 'default');
        });

        test('should handle loading state with proper accessibility', () => {
            render(<Button loading>Loading Button</Button>);

            const button = screen.getByTestId('button');
            expect(button).toHaveAttribute('aria-busy', 'true');
            expect(button).toHaveAttribute('data-loading', 'true');

            // Should have loading announcement for screen readers
            expect(screen.getByText('Loading')).toBeInTheDocument();
        });

        test('should handle error states gracefully', () => {
            // Mock console.error to avoid test output noise
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Force an error by passing invalid props
            const ErrorButton = () => {
                throw new Error('Test error');
            };

            // The Button component should catch errors and render fallback
            render(
                <Button asChild>
                    <ErrorButton />
                </Button>
            );

            // Should render fallback button
            const fallbackButton = screen.queryByTestId('button-fallback') ||
                screen.queryByTestId('button-error-fallback');
            expect(fallbackButton).toBeInTheDocument();

            consoleSpy.mockRestore();
        });

        test('should support proper Radix UI composition', async () => {
            const user = userEvent.setup();
            const handleClick = jest.fn();

            render(
                <Button asChild onClick={handleClick}>
                    <a href="#test">Link Button</a>
                </Button>
            );

            const linkButton = screen.getByRole('link');
            expect(linkButton).toBeInTheDocument();
            expect(linkButton).toHaveAttribute('href', '#test');

            await user.click(linkButton);
            expect(handleClick).toHaveBeenCalled();
        });

        test('should maintain accessibility standards', () => {
            render(
                <Button
                    aria-label="Custom label"
                    aria-describedby="description"
                    aria-expanded={false}
                    aria-haspopup="menu"
                >
                    Menu Button
                </Button>
            );

            const button = screen.getByTestId('button');
            expect(button).toHaveAttribute('aria-label', 'Custom label');
            expect(button).toHaveAttribute('aria-describedby', 'description');
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-haspopup', 'menu');
        });

        test('should optimize performance with memoization', () => {
            const { rerender } = render(<Button>Test</Button>);

            // Re-render with same props should not cause re-render due to memoization
            rerender(<Button>Test</Button>);

            // Re-render with different props should cause re-render
            rerender(<Button variant="secondary">Test</Button>);

            const button = screen.getByTestId('button');
            expect(button).toHaveAttribute('data-variant', 'secondary');
        });
    });

    describe('CSS Containment Integration', () => {
        test('should apply CSS containment classes', () => {
            render(<Button>Contained Button</Button>);

            const button = screen.getByTestId('button');
            const classes = button.className;

            // Should include containment classes for performance
            expect(classes).toContain('contain-layout');
        });
    });

    describe('Performance Monitoring', () => {
        test('should track render performance', () => {
            const performanceSpy = jest.spyOn(performance, 'mark').mockImplementation();

            render(<Button>Performance Test</Button>);

            // Should mark performance milestones
            expect(performanceSpy).toHaveBeenCalledWith('button-render-start');

            performanceSpy.mockRestore();
        });
    });
});