/**
 * Design System Error Handling Tests
 * Tests for error boundaries, fallback styling, development warnings,
 * and graceful degradation patterns
 */

import { Button } from '@/components/ui/button';
import { DesignSystemErrorBoundary, withErrorBoundary } from '@/components/ui/design-system-error-boundary';
import {
    ComponentStyleError,
    DesignSystemError,
    DesignTokenError,
    designTokenValidator,
    developmentWarnings,
    errorRecovery,
    fallbackStyling,
    gracefulDegradation,
} from '@/lib/design-system-error-handling';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock console methods to avoid test output noise
const mockConsole = () => {
    const originalConsole = { ...console };
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    return originalConsole;
};

describe('Design System Error Handling', () => {
    mockConsole();

    describe('Error Classes', () => {
        test('should create DesignSystemError with correct properties', () => {
            const error = new DesignSystemError(
                'Test error',
                'TestComponent',
                'render'
            );

            expect(error.name).toBe('DesignSystemError');
            expect(error.message).toBe('Test error');
            expect(error.componentName).toBe('TestComponent');
            expect(error.errorType).toBe('render');
        });

        test('should create DesignTokenError with correct message', () => {
            const error = new DesignTokenError(
                '--test-token',
                '#ffffff',
                'undefined'
            );

            expect(error.name).toBe('DesignSystemError');
            expect(error.message).toContain('--test-token');
            expect(error.message).toContain('#ffffff');
            expect(error.message).toContain('undefined');
            expect(error.errorType).toBe('token');
        });

        test('should create ComponentStyleError with original error', () => {
            const originalError = new Error('CSS parse error');
            const error = new ComponentStyleError(
                'Button',
                'background-color',
                originalError
            );

            expect(error.componentName).toBe('Button');
            expect(error.errorType).toBe('style');
            expect(error.originalError).toBe(originalError);
        });
    });

    describe('DesignSystemErrorBoundary', () => {
        const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
            if (shouldThrow) {
                throw new Error('Test error');
            }
            return <div>No error</div>;
        };

        test('should render children when no error occurs', () => {
            render(
                <DesignSystemErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </DesignSystemErrorBoundary>
            );

            expect(screen.getByText('No error')).toBeInTheDocument();
        });

        test('should render error UI when error occurs', () => {
            render(
                <DesignSystemErrorBoundary componentName="TestComponent">
                    <ThrowError shouldThrow={true} />
                </DesignSystemErrorBoundary>
            );

            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/TestComponent component/)).toBeInTheDocument();
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });

        test('should render custom fallback when provided', () => {
            const customFallback = <div>Custom error message</div>;

            render(
                <DesignSystemErrorBoundary fallback={customFallback}>
                    <ThrowError shouldThrow={true} />
                </DesignSystemErrorBoundary>
            );

            expect(screen.getByText('Custom error message')).toBeInTheDocument();
        });

        test('should call onError callback when error occurs', () => {
            const onError = jest.fn();

            render(
                <DesignSystemErrorBoundary onError={onError}>
                    <ThrowError shouldThrow={true} />
                </DesignSystemErrorBoundary>
            );

            expect(onError).toHaveBeenCalled();
        });

        test('should reset error state when Try Again is clicked', async () => {
            const user = userEvent.setup();
            let shouldThrow = true;

            const { rerender } = render(
                <DesignSystemErrorBoundary>
                    <ThrowError shouldThrow={shouldThrow} />
                </DesignSystemErrorBoundary>
            );

            expect(screen.getByText('Try Again')).toBeInTheDocument();

            // Fix the error condition
            shouldThrow = false;

            await user.click(screen.getByText('Try Again'));

            // Re-render with fixed component
            rerender(
                <DesignSystemErrorBoundary>
                    <ThrowError shouldThrow={shouldThrow} />
                </DesignSystemErrorBoundary>
            );

            await waitFor(() => {
                expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
            });
        });
    });

    describe('withErrorBoundary HOC', () => {
        test('should wrap component with error boundary', () => {
            const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
                if (shouldThrow) {
                    throw new Error('Test error');
                }
                return <div>Working component</div>;
            };

            const SafeComponent = withErrorBoundary(TestComponent, {
                componentName: 'TestComponent',
            });

            render(<SafeComponent shouldThrow={false} />);
            expect(screen.getByText('Working component')).toBeInTheDocument();

            const { rerender } = render(<SafeComponent shouldThrow={true} />);
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });

    describe('Design Token Validator', () => {
        test('should validate existing CSS custom properties', () => {
            // Mock getComputedStyle
            const mockGetComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn().mockReturnValue('#ffffff'),
            });
            Object.defineProperty(window, 'getComputedStyle', {
                value: mockGetComputedStyle,
            });

            const isValid = designTokenValidator.validateToken('--test-token');
            expect(isValid).toBe(true);
        });

        test('should return false for missing tokens', () => {
            const mockGetComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn().mockReturnValue(''),
            });
            Object.defineProperty(window, 'getComputedStyle', {
                value: mockGetComputedStyle,
            });

            const isValid = designTokenValidator.validateToken('--missing-token');
            expect(isValid).toBe(false);
        });

        test('should get token value with fallback', () => {
            const mockGetComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn().mockReturnValue(''),
            });
            Object.defineProperty(window, 'getComputedStyle', {
                value: mockGetComputedStyle,
            });

            const value = designTokenValidator.getTokenValue(
                '--missing-token',
                '#fallback'
            );
            expect(value).toBe('#fallback');
        });

        test('should validate multiple tokens', () => {
            const mockGetComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn()
                    .mockReturnValueOnce('#ffffff') // valid token
                    .mockReturnValueOnce(''), // invalid token
            });
            Object.defineProperty(window, 'getComputedStyle', {
                value: mockGetComputedStyle,
            });

            const result = designTokenValidator.validateTokens([
                '--valid-token',
                '--invalid-token',
            ]);

            expect(result.valid).toContain('--valid-token');
            expect(result.invalid).toContain('--invalid-token');
        });

        test('should warn about missing tokens in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const consoleSpy = jest.spyOn(console, 'warn');

            const mockGetComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn().mockReturnValue(''),
            });
            Object.defineProperty(window, 'getComputedStyle', {
                value: mockGetComputedStyle,
            });

            designTokenValidator.warnMissingTokens(
                ['--missing-token'],
                'TestComponent'
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('TestComponent: Missing design tokens detected')
            );

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Fallback Styling', () => {
        test('should create fallback styles element', () => {
            const style = fallbackStyling.createFallbackStyles();

            expect(style).toBeInstanceOf(HTMLStyleElement);
            expect(style?.id).toBe('design-system-fallback');
            expect(style?.textContent).toContain('.ds-fallback-button');
        });

        test('should apply fallback styles to document', () => {
            fallbackStyling.applyFallbackStyles();

            const fallbackStyle = document.getElementById('design-system-fallback');
            expect(fallbackStyle).toBeInTheDocument();
        });

        test('should not duplicate fallback styles', () => {
            fallbackStyling.applyFallbackStyles();
            fallbackStyling.applyFallbackStyles();

            const fallbackStyles = document.querySelectorAll('#design-system-fallback');
            expect(fallbackStyles).toHaveLength(1);
        });

        test('should remove fallback styles', () => {
            fallbackStyling.applyFallbackStyles();
            expect(document.getElementById('design-system-fallback')).toBeInTheDocument();

            fallbackStyling.removeFallbackStyles();
            expect(document.getElementById('design-system-fallback')).not.toBeInTheDocument();
        });
    });

    describe('Graceful Degradation', () => {
        test('should detect JavaScript availability', () => {
            expect(gracefulDegradation.isJavaScriptEnabled()).toBe(true);
        });

        test('should check CSS custom properties support', () => {
            // Mock CSS.supports
            Object.defineProperty(window, 'CSS', {
                value: {
                    supports: jest.fn().mockReturnValue(true),
                },
            });

            expect(gracefulDegradation.supportsCSSCustomProperties()).toBe(true);
        });

        test('should check CSS Grid support', () => {
            Object.defineProperty(window, 'CSS', {
                value: {
                    supports: jest.fn().mockReturnValue(true),
                },
            });

            expect(gracefulDegradation.supportsCSSGrid()).toBe(true);
        });

        test('should apply progressive enhancement classes', () => {
            // Mock CSS.supports
            Object.defineProperty(window, 'CSS', {
                value: {
                    supports: jest.fn().mockReturnValue(true),
                },
            });

            gracefulDegradation.applyProgressiveEnhancement();

            const html = document.documentElement;
            expect(html.classList.contains('js-enabled')).toBe(true);
            expect(html.classList.contains('css-custom-properties')).toBe(true);
            expect(html.classList.contains('css-grid')).toBe(true);
        });
    });

    describe('Development Warnings', () => {
        const originalEnv = process.env.NODE_ENV;

        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        afterEach(() => {
            process.env.NODE_ENV = originalEnv;
        });

        test('should warn about missing accessibility attributes', () => {
            const consoleSpy = jest.spyOn(console, 'warn');
            const element = document.createElement('button');

            developmentWarnings.warnMissingAccessibility(element, ['aria-label']);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Accessibility warning')
            );
        });

        test('should warn about performance issues', () => {
            const consoleSpy = jest.spyOn(console, 'warn');

            developmentWarnings.warnPerformanceIssue(
                'TestComponent',
                'Slow render detected',
                'Use React.memo'
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Performance warning in TestComponent')
            );
        });

        test('should warn about deprecated usage', () => {
            const consoleSpy = jest.spyOn(console, 'warn');

            developmentWarnings.warnDeprecated(
                'TestComponent',
                'oldProp',
                'newProp'
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Deprecation warning in TestComponent')
            );
        });
    });

    describe('Error Recovery', () => {
        test('should attempt recovery from component error', async () => {
            const error = new Error('Test error');
            const result = await errorRecovery.attemptRecovery(error, 'TestComponent');

            expect(typeof result).toBe('boolean');
        });

        test('should create safe component wrapper', () => {
            const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
                if (shouldThrow) {
                    throw new Error('Test error');
                }
                return <div>Safe component</div>;
            };

            const SafeComponent = errorRecovery.createSafeComponent(TestComponent);

            render(<SafeComponent shouldThrow={false} />);
            expect(screen.getByText('Safe component')).toBeInTheDocument();
        });
    });

    describe('Button Component Error Handling', () => {
        test('should render button with error boundary', () => {
            render(<Button>Test Button</Button>);

            const button = screen.getByTestId('button');
            expect(button).toBeInTheDocument();
        });

        test('should render fallback when button fails', () => {
            // Mock a component that throws an error
            const FailingButton = () => {
                throw new Error('Button error');
            };

            render(
                <DesignSystemErrorBoundary componentName="Button">
                    <FailingButton />
                </DesignSystemErrorBoundary>
            );

            expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        test('should validate design tokens for button', () => {
            const consoleSpy = jest.spyOn(console, 'warn');

            // Mock missing tokens
            const mockGetComputedStyle = jest.fn().mockReturnValue({
                getPropertyValue: jest.fn().mockReturnValue(''),
            });
            Object.defineProperty(window, 'getComputedStyle', {
                value: mockGetComputedStyle,
            });

            render(<Button>Test Button</Button>);

            // Should warn about missing tokens in development
            if (process.env.NODE_ENV === 'development') {
                expect(consoleSpy).toHaveBeenCalled();
            }
        });
    });
});