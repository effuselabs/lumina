/**
 * Comprehensive Error Handling for Design System Components
 * Server-safe error utilities and types for design system components
 */

// Error types for design system
export class DesignSystemError extends Error {
    constructor(
        message: string,
        public componentName: string,
        public errorType: 'render' | 'style' | 'token' | 'accessibility' | 'performance',
        public originalError?: Error
    ) {
        super(message);
        this.name = 'DesignSystemError';
    }
}

// Design token validation error
export class DesignTokenError extends DesignSystemError {
    constructor(tokenName: string, expectedValue?: string, actualValue?: string) {
        super(
            `Design token "${tokenName}" is missing or invalid. Expected: ${expectedValue}, Got: ${actualValue}`,
            'DesignTokenValidator',
            'token'
        );
    }
}

// Component styling error
export class ComponentStyleError extends DesignSystemError {
    constructor(componentName: string, styleProperty: string, error: Error) {
        super(
            `Style error in component "${componentName}" for property "${styleProperty}": ${error.message}`,
            componentName,
            'style',
            error
        );
    }
}

/**
 * Design token validation utilities
 */
export const designTokenValidator = {
    /**
     * Validate that a CSS custom property exists and has a value
     */
    validateToken(tokenName: string, element?: HTMLElement): boolean {
        if (typeof window === 'undefined') {
            return true; // Skip validation in SSR
        }

        try {
            const computedStyle = getComputedStyle(element || document.documentElement);
            const value = computedStyle.getPropertyValue(tokenName).trim();
            return value !== '';
        } catch {
            return false;
        }
    },

    /**
     * Get token value with fallback
     */
    getTokenValue(tokenName: string, fallback: string, element?: HTMLElement): string {
        if (typeof window === 'undefined') {
            return fallback;
        }

        try {
            const computedStyle = getComputedStyle(element || document.documentElement);
            const value = computedStyle.getPropertyValue(tokenName).trim();
            return value || fallback;
        } catch {
            return fallback;
        }
    },

    /**
     * Validate multiple tokens at once
     */
    validateTokens(tokens: string[], element?: HTMLElement): { valid: string[]; invalid: string[] } {
        const valid: string[] = [];
        const invalid: string[] = [];

        tokens.forEach(token => {
            if (this.validateToken(token, element)) {
                valid.push(token);
            } else {
                invalid.push(token);
            }
        });

        return { valid, invalid };
    },

    /**
     * Create development-time warnings for missing tokens
     */
    warnMissingTokens(tokens: string[], componentName: string): void {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        const { invalid } = this.validateTokens(tokens);
        if (invalid.length > 0) {
            console.warn(
                `${componentName}: Missing design tokens detected:`,
                invalid.join(', ')
            );
        }
    },
};

/**
 * Fallback styling utilities
 */
export const fallbackStyling = {
    /**
     * Create fallback styles when CSS fails to load
     */
    createFallbackStyles(): HTMLStyleElement | null {
        if (typeof document === 'undefined') {
            return null;
        }

        const style = document.createElement('style');
        style.id = 'design-system-fallback';
        style.textContent = `
      /* Fallback styles for design system components */
      .ds-fallback-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        background-color: #f9fafb;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .ds-fallback-button:hover {
        background-color: #f3f4f6;
        border-color: #9ca3af;
      }
      
      .ds-fallback-button:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }
      
      .ds-fallback-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .ds-fallback-input {
        display: block;
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        background-color: #ffffff;
        color: #374151;
        font-size: 0.875rem;
      }
      
      .ds-fallback-input:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
        border-color: #3b82f6;
      }
      
      .ds-fallback-card {
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        background-color: #ffffff;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      }
    `;

        return style;
    },

    /**
     * Apply fallback styles to the document
     */
    applyFallbackStyles(): void {
        if (typeof document === 'undefined') {
            return;
        }

        // Check if fallback styles are already applied
        if (document.getElementById('design-system-fallback')) {
            return;
        }

        const style = this.createFallbackStyles();
        if (style) {
            document.head.appendChild(style);
        }
    },

    /**
     * Remove fallback styles when main styles load
     */
    removeFallbackStyles(): void {
        if (typeof document === 'undefined') {
            return;
        }

        const fallbackStyle = document.getElementById('design-system-fallback');
        if (fallbackStyle) {
            fallbackStyle.remove();
        }
    },
};

/**
 * Graceful degradation utilities
 */
export const gracefulDegradation = {
    /**
     * Check if JavaScript is enabled
     */
    isJavaScriptEnabled(): boolean {
        return typeof window !== 'undefined';
    },

    /**
     * Check if CSS custom properties are supported
     */
    supportsCSSCustomProperties(): boolean {
        if (typeof window === 'undefined') {
            return true; // Assume support in SSR
        }

        try {
            return window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--test)');
        } catch {
            return false;
        }
    },

    /**
     * Check if CSS Grid is supported
     */
    supportsCSSGrid(): boolean {
        if (typeof window === 'undefined') {
            return true;
        }

        try {
            return window.CSS && window.CSS.supports && window.CSS.supports('display', 'grid');
        } catch {
            return false;
        }
    },

    /**
     * Apply progressive enhancement classes
     */
    applyProgressiveEnhancement(): void {
        if (typeof document === 'undefined') {
            return;
        }

        const html = document.documentElement;

        // Add JavaScript enabled class
        html.classList.add('js-enabled');

        // Add CSS feature support classes
        if (this.supportsCSSCustomProperties()) {
            html.classList.add('css-custom-properties');
        }

        if (this.supportsCSSGrid()) {
            html.classList.add('css-grid');
        }

        // Add reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            html.classList.add('reduce-motion');
        }
    },
};

/**
 * Development-time warnings
 */
export const developmentWarnings = {
    /**
     * Warn about missing accessibility attributes
     */
    warnMissingAccessibility(componentName: string, issue: string): void {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        console.warn(`Accessibility warning in ${componentName}: ${issue}`);
    },

    /**
     * Warn about performance issues
     */
    warnPerformanceIssue(componentName: string, issue: string, suggestion?: string): void {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        console.warn(
            `Performance warning in ${componentName}: ${issue}`,
            suggestion ? `\nSuggestion: ${suggestion}` : ''
        );
    },

    /**
     * Warn about deprecated props or patterns
     */
    warnDeprecated(componentName: string, deprecatedItem: string, replacement?: string): void {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        console.warn(
            `Deprecation warning in ${componentName}: ${deprecatedItem} is deprecated.`,
            replacement ? `Use ${replacement} instead.` : ''
        );
    },
};

/**
 * Error recovery utilities
 */
export const errorRecovery = {
    /**
     * Attempt to recover from a component error
     */
    async attemptRecovery(error: Error, componentName: string): Promise<boolean> {
        try {
            // Log the recovery attempt
            console.log(`Attempting recovery for ${componentName} after error:`, error.message);

            // Apply fallback styles
            fallbackStyling.applyFallbackStyles();

            // Re-validate design tokens
            const criticalTokens = [
                '--color-primary',
                '--color-background',
                '--color-foreground',
                '--font-family-sans',
            ];

            const { invalid } = designTokenValidator.validateTokens(criticalTokens);
            if (invalid.length > 0) {
                console.warn('Critical design tokens missing during recovery:', invalid);
                return false;
            }

            return true;
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            return false;
        }
    },
};

// Initialize error handling on module load (client-side only)
if (typeof window !== 'undefined') {
    // Apply progressive enhancement
    gracefulDegradation.applyProgressiveEnhancement();

    // Set up global error handler for unhandled design system errors
    window.addEventListener('error', (event) => {
        if (event.error instanceof DesignSystemError) {
            console.error('Unhandled Design System Error:', event.error);

            // Attempt recovery
            errorRecovery.attemptRecovery(event.error, event.error.componentName);
        }
    });
}