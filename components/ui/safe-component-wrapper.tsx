'use client';

/**
 * Safe Component Wrapper
 * Provides error boundaries and fallback mechanisms for design system components
 */

import { DesignSystemErrorBoundary } from '@/components/ui/design-system-error-boundary';
import {
    designTokenValidator,
    developmentWarnings,
    fallbackStyling
} from '@/lib/design-system-error-handling';
import React from 'react';

interface SafeComponentWrapperProps {
    children: React.ReactNode;
    componentName: string;
    fallback?: React.ReactNode;
    requiredTokens?: string[];
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Safe wrapper that provides error boundaries and validation for design system components
 */
export function SafeComponentWrapper({
    children,
    componentName,
    fallback,
    requiredTokens = [],
    onError,
}: SafeComponentWrapperProps) {
    // Validate required design tokens in development
    React.useEffect(() => {
        if (requiredTokens.length > 0) {
            designTokenValidator.warnMissingTokens(requiredTokens, componentName);
        }
    }, [requiredTokens, componentName]);

    // Apply fallback styles if needed
    React.useEffect(() => {
        const checkStylesLoaded = () => {
            // Check if main design system styles are loaded
            const testElement = document.createElement('div');
            testElement.className = 'bg-primary'; // Test Tailwind class
            document.body.appendChild(testElement);

            const computedStyle = getComputedStyle(testElement);
            const hasStyles = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                computedStyle.backgroundColor !== 'transparent';

            document.body.removeChild(testElement);

            if (!hasStyles) {
                console.warn(`Styles may not be loaded for ${componentName}, applying fallbacks`);
                fallbackStyling.applyFallbackStyles();
            }
        };

        // Check styles after a short delay to allow for loading
        const timeoutId = setTimeout(checkStylesLoaded, 100);
        return () => clearTimeout(timeoutId);
    }, [componentName]);

    const defaultFallback = (
        <div
            className="ds-fallback-card"
            role="alert"
            aria-live="polite"
        >
            <p className="text-sm text-gray-600">
                {componentName} is temporarily unavailable. Please try refreshing the page.
            </p>
        </div>
    );

    return (
        <DesignSystemErrorBoundary
            componentName={componentName}
            fallback={fallback || defaultFallback}
            onError={onError}
        >
            {children}
        </DesignSystemErrorBoundary>
    );
}

/**
 * Higher-order component to make any component safe
 */
export function makeSafe<P extends object>(
    Component: React.ComponentType<P>,
    options?: {
        componentName?: string;
        requiredTokens?: string[];
        fallback?: React.ComponentType<P>;
    }
) {
    const SafeComponent = (props: P) => {
        const componentName = options?.componentName || Component.displayName || Component.name || 'Unknown';

        return (
            <SafeComponentWrapper
                componentName={componentName}
                requiredTokens={options?.requiredTokens}
                fallback={options?.fallback ? <options.fallback {...props} /> : undefined}
            >
                <Component {...props} />
            </SafeComponentWrapper>
        );
    };

    const componentName = options?.componentName || Component.displayName || Component.name || 'Unknown';
    SafeComponent.displayName = `Safe(${componentName})`;
    return SafeComponent;
}

/**
 * Hook for safe component rendering with error handling
 */
export function useSafeRender<T>(
    renderFn: () => T,
    fallback: T,
    componentName: string
): T {
    const [hasError, setHasError] = React.useState(false);
    const [result, setResult] = React.useState<T>(fallback);

    React.useEffect(() => {
        try {
            const rendered = renderFn();
            setResult(rendered);
            setHasError(false);
        } catch (error) {
            console.error(`Safe render error in ${componentName}:`, error);
            setResult(fallback);
            setHasError(true);

            // Warn in development
            if (process.env.NODE_ENV === 'development') {
                developmentWarnings.warnPerformanceIssue(
                    componentName,
                    'Render function threw an error',
                    'Check the render function for potential issues'
                );
            }
        }
    }, [renderFn, fallback, componentName]);

    return hasError ? fallback : result;
}

/**
 * Safe CSS class name builder with fallbacks
 */
export function useSafeClassName(
    baseClasses: string,
    conditionalClasses?: Record<string, boolean>,
    fallbackClasses?: string
): string {
    return React.useMemo(() => {
        try {
            let classes = baseClasses;

            if (conditionalClasses) {
                Object.entries(conditionalClasses).forEach(([className, condition]) => {
                    if (condition) {
                        classes += ` ${className}`;
                    }
                });
            }

            return classes.trim();
        } catch (error) {
            console.warn('Error building class names, using fallback:', error);
            return fallbackClasses || baseClasses;
        }
    }, [baseClasses, conditionalClasses, fallbackClasses]);
}

/**
 * Safe style object builder with fallbacks
 */
export function useSafeStyles(
    styles: React.CSSProperties,
    fallbackStyles?: React.CSSProperties
): React.CSSProperties {
    return React.useMemo(() => {
        try {
            // Validate that styles object is valid
            if (typeof styles !== 'object' || styles === null) {
                throw new Error('Invalid styles object');
            }

            return styles;
        } catch (error) {
            console.warn('Error processing styles, using fallback:', error);
            return fallbackStyles || {};
        }
    }, [styles, fallbackStyles]);
}

/**
 * Component for handling no-JavaScript scenarios
 */
export function NoScriptFallback({ children }: { children: React.ReactNode }) {
    return (
        <>
            <noscript>
                <div className="ds-fallback-card">
                    <h2 className="text-lg font-semibold mb-2">JavaScript Required</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        This application requires JavaScript to function properly.
                        Please enable JavaScript in your browser settings.
                    </p>
                    <div className="text-sm">
                        <p>Basic functionality may be available without JavaScript:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Static content viewing</li>
                            <li>Form submissions (with page refresh)</li>
                            <li>Basic navigation</li>
                        </ul>
                    </div>
                </div>
            </noscript>
            {children}
        </>
    );
}

/**
 * Progressive enhancement wrapper
 */
export function ProgressiveEnhancement({
    children,
    fallback
}: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) {
    const [isEnhanced, setIsEnhanced] = React.useState(false);

    React.useEffect(() => {
        // Check for JavaScript and modern browser features
        const hasModernFeatures =
            typeof window !== 'undefined' &&
            'CSS' in window &&
            'supports' in window.CSS &&
            window.CSS.supports('display', 'grid') &&
            window.CSS.supports('color', 'var(--test)');

        setIsEnhanced(hasModernFeatures);
    }, []);

    if (!isEnhanced && fallback) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}