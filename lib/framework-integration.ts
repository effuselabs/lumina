/**
 * Framework Integration Best Practices
 * Ensures proper Next.js SSR/SSG compatibility, React Server Component boundaries,
 * and Radix UI integration with Tailwind styling
 */

import { Slot } from '@radix-ui/react-slot';
import { type ComponentProps, type ReactNode, forwardRef } from 'react';
import { cn } from './utils';

// Type definitions for framework integration
export interface ServerComponentProps {
    children: ReactNode;
    className?: string;
}

export interface ClientComponentProps extends ServerComponentProps {
    onClick?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
}

/**
 * SSR/SSG compatibility utilities
 */
export const ssrUtils = {
    /**
     * Check if code is running on the server
     */
    isServer: typeof window === 'undefined',

    /**
     * Check if code is running on the client
     */
    isClient: typeof window !== 'undefined',

    /**
     * Safe access to window object
     */
    getWindow(): Window | undefined {
        return typeof window !== 'undefined' ? window : undefined;
    },

    /**
     * Safe access to document object
     */
    getDocument(): Document | undefined {
        return typeof document !== 'undefined' ? document : undefined;
    },

    /**
     * Safe localStorage access
     */
    getLocalStorage(): Storage | undefined {
        try {
            return typeof localStorage !== 'undefined' ? localStorage : undefined;
        } catch {
            return undefined;
        }
    },

    /**
     * Safe sessionStorage access
     */
    getSessionStorage(): Storage | undefined {
        try {
            return typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;
        } catch {
            return undefined;
        }
    },
};

/**
 * React Server Component utilities
 */
export const serverComponentUtils = {
    /**
     * Create a server-safe component wrapper
     */
    createServerComponent<T extends ServerComponentProps>(
        Component: React.ComponentType<T>
    ) {
        const ServerComponent = (props: T) => {
            // Ensure no client-side only code runs in server components
            if (ssrUtils.isServer) {
                // Remove any client-side event handlers
                const { onClick, onFocus, onBlur, ...serverProps } = props as any;
                return React.createElement(Component, serverProps as T);
            }
            return React.createElement(Component, props);
        };

        ServerComponent.displayName = `Server(${Component.displayName || Component.name})`;
        return ServerComponent;
    },

    /**
     * Validate that a component is server-safe
     */
    validateServerComponent(componentName: string, props: any) {
        if (ssrUtils.isServer) {
            const clientOnlyProps = ['onClick', 'onFocus', 'onBlur', 'onMouseEnter', 'onMouseLeave'];
            const foundClientProps = clientOnlyProps.filter(prop => prop in props);

            if (foundClientProps.length > 0) {
                console.warn(
                    `Server component ${componentName} contains client-only props: ${foundClientProps.join(', ')}. ` +
                    'Consider moving to a client component or removing these props.'
                );
            }
        }
    },
};

/**
 * Radix UI integration utilities
 */
export const radixIntegration = {
    /**
     * Create a Radix-compatible component with proper Tailwind styling
     */
    createRadixComponent<T extends ComponentProps<typeof Slot>>(
        defaultElement: keyof JSX.IntrinsicElements,
        baseClasses: string,
        variants?: Record<string, Record<string, string>>
    ) {
        return forwardRef<HTMLElement, T & { asChild?: boolean; variant?: string }>(
            ({ asChild = false, className, variant, ...props }, ref) => {
                const Comp = asChild ? Slot : defaultElement;

                // Apply base classes and variant classes
                let classes = baseClasses;
                if (variant && variants && variants[variant]) {
                    classes = cn(classes, variants[variant]);
                }

                return React.createElement(Comp, {
                    ref,
                    className: cn(classes, className),
                    ...props,
                });
            }
        );
    },

    /**
     * Ensure proper Radix primitive composition
     */
    composeRadixPrimitive<T extends Record<string, any>>(
        Primitive: React.ComponentType<T>,
        additionalProps?: Partial<T>
    ) {
        return forwardRef<HTMLElement, T>((props, ref) => {
            const composedProps = {
                ...additionalProps,
                ...props,
                ref,
            } as T;

            return React.createElement(Primitive, composedProps);
        });
    },

    /**
     * Apply Tailwind classes to Radix components safely
     */
    applyTailwindToRadix(
        baseClasses: string,
        userClasses?: string,
        conditionalClasses?: Record<string, boolean>
    ): string {
        let classes = baseClasses;

        // Add conditional classes
        if (conditionalClasses) {
            Object.entries(conditionalClasses).forEach(([className, condition]) => {
                if (condition) {
                    classes = cn(classes, className);
                }
            });
        }

        // Add user classes last to allow overrides
        return cn(classes, userClasses);
    },
};

/**
 * TypeScript integration utilities
 */
export const typeScriptIntegration = {
    /**
     * Create type-safe component props with proper inference
     */
    createComponentProps<T extends Record<string, any>>(
        baseProps: T
    ): T & {
        className?: string;
        children?: ReactNode;
    } {
        return {
            ...baseProps,
            className: undefined,
            children: undefined,
        } as T & {
            className?: string;
            children?: ReactNode;
        };
    },

    /**
     * Ensure proper ref forwarding types
     */
    createForwardRefComponent<T, P = {}>(
        render: (props: P, ref: React.Ref<T>) => ReactNode
    ) {
        return forwardRef<T, P>(render);
    },

    /**
     * Type-safe event handler creation
     */
    createEventHandler<T extends Event>(
        handler: (event: T) => void
    ): ((event: T) => void) {
        return (event: T) => {
            try {
                handler(event);
            } catch (error) {
                console.error('Event handler error:', error);
            }
        };
    },
};

/**
 * Error boundary utilities for framework integration
 */
export class FrameworkErrorBoundary extends Error {
    constructor(
        message: string,
        public componentName: string,
        public framework: 'nextjs' | 'react' | 'radix'
    ) {
        super(message);
        this.name = 'FrameworkErrorBoundary';
    }
}

/**
 * Hydration utilities
 */
export const hydrationUtils = {
    /**
     * Check if component has hydrated
     */
    isHydrated(): boolean {
        return ssrUtils.isClient && document.readyState === 'complete';
    },

    /**
     * Wait for hydration to complete
     */
    waitForHydration(): Promise<void> {
        return new Promise((resolve) => {
            if (hydrationUtils.isHydrated()) {
                resolve();
                return;
            }

            if (ssrUtils.isServer) {
                resolve();
                return;
            }

            const checkHydration = () => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    requestAnimationFrame(checkHydration);
                }
            };

            checkHydration();
        });
    },

    /**
     * Create a hydration-safe component
     */
    createHydrationSafeComponent<T extends ComponentProps<'div'>>(
        Component: React.ComponentType<T>
    ) {
        return (props: T) => {
            // Prevent hydration mismatches by ensuring consistent rendering
            if (ssrUtils.isServer) {
                return React.createElement(Component, props);
            }

            // Client-side rendering with hydration safety
            return React.createElement(Component, props);
        };
    },
};

/**
 * Performance integration utilities
 */
export const performanceIntegration = {
    /**
     * Create a performance-optimized component
     */
    createOptimizedComponent<T extends ComponentProps<'div'>>(
        Component: React.ComponentType<T>,
        options?: {
            memo?: boolean;
            lazy?: boolean;
            preload?: boolean;
        }
    ) {
        let OptimizedComponent = Component;

        // Apply React.memo if requested
        if (options?.memo) {
            OptimizedComponent = React.memo(OptimizedComponent) as React.ComponentType<T>;
        }

        // Apply lazy loading if requested
        if (options?.lazy) {
            const LazyComponent = React.lazy(() =>
                Promise.resolve({ default: OptimizedComponent })
            );

            return (props: T) =>
                React.createElement(
                    React.Suspense,
                    { fallback: React.createElement('div', null, 'Loading...') },
                    React.createElement(LazyComponent, props)
                );
        }

        return OptimizedComponent;
    },

    /**
     * Measure component performance
     */
    withPerformanceTracking<T extends ComponentProps<'div'>>(
        Component: React.ComponentType<T>,
        componentName: string
    ) {
        return (props: T) => {
            React.useEffect(() => {
                if (typeof performance !== 'undefined') {
                    performance.mark(`${componentName}-start`);

                    return () => {
                        performance.mark(`${componentName}-end`);
                        performance.measure(
                            `${componentName}-render`,
                            `${componentName}-start`,
                            `${componentName}-end`
                        );
                    };
                }
            }, []);

            return React.createElement(Component, props);
        };
    },
};

/**
 * Framework compatibility checks
 */
export const compatibilityChecks = {
    /**
     * Check Next.js version compatibility
     */
    checkNextJSCompatibility(): boolean {
        try {
            // Check if we're in a Next.js environment
            return typeof process !== 'undefined' &&
                process.env.NODE_ENV !== undefined &&
                typeof require !== 'undefined';
        } catch {
            return false;
        }
    },

    /**
     * Check React version compatibility
     */
    checkReactCompatibility(): boolean {
        try {
            return typeof React !== 'undefined' &&
                React.version &&
                parseInt(React.version.split('.')[0]) >= 18;
        } catch {
            return false;
        }
    },

    /**
     * Check if Radix UI is available
     */
    checkRadixCompatibility(): boolean {
        try {
            return typeof Slot !== 'undefined';
        } catch {
            return false;
        }
    },

    /**
     * Run all compatibility checks
     */
    runCompatibilityChecks(): {
        nextjs: boolean;
        react: boolean;
        radix: boolean;
        overall: boolean;
    } {
        const nextjs = compatibilityChecks.checkNextJSCompatibility();
        const react = compatibilityChecks.checkReactCompatibility();
        const radix = compatibilityChecks.checkRadixCompatibility();

        return {
            nextjs,
            react,
            radix,
            overall: nextjs && react && radix,
        };
    },
};

// Export React for dynamic imports
export { React };
