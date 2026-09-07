'use client';

/**
 * Design System Error Boundary
 * Client-side error boundary component for design system components
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

/**
 * Design System Error Boundary
 * Catches and handles errors in design system components
 */
export class DesignSystemErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId:
        Date.now().toString(36) + Math.random().toString(36).substring(2),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props;

    // Log error for debugging
    console.error(
      `Design System Error in ${componentName || 'Unknown Component'}:`,
      error
    );
    console.error('Error Info:', errorInfo);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          component: componentName || 'unknown',
          errorBoundary: true,
        },
        extra: errorInfo,
      });
    }

    this.setState({ errorInfo });
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }
  }

  override componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: this.generateErrorId(),
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  override render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div
          className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 p-4 text-red-800"
          role="alert"
          aria-live="assertive"
        >
          <div className="mb-2 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-sm font-medium">Component Error</h3>
          </div>
          <p className="mb-3 text-center text-sm">
            {componentName ? `The ${componentName} component` : 'A component'}{' '}
            encountered an error and could not render properly.
          </p>
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-3 w-full">
              <summary className="mb-2 cursor-pointer text-sm font-medium">
                Error Details (Development Only)
              </summary>
              <pre className="max-h-32 overflow-auto rounded border bg-red-100 p-2 text-xs">
                {error.message +
                  (errorInfo?.componentStack
                    ? '\n\nComponent Stack:' + errorInfo.componentStack
                    : '')}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DesignSystemErrorBoundary {...(errorBoundaryProps || {})}>
      <Component {...props} />
    </DesignSystemErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Error recovery utilities for client components
 */
export const clientErrorRecovery = {
  /**
   * Create a safe component wrapper that handles errors
   */
  createSafeComponent<P extends object>(
    Component: React.ComponentType<P>,
    fallbackComponent?: React.ComponentType<P>
  ): React.ComponentType<P> {
    return (props: P) => (
      <DesignSystemErrorBoundary
        componentName={Component.displayName || Component.name}
        fallback={
          fallbackComponent
            ? React.createElement(fallbackComponent, props)
            : undefined
        }
      >
        <Component {...props} />
      </DesignSystemErrorBoundary>
    );
  },
};
