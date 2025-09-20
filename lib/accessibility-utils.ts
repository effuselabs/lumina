/**
 * Accessibility Utilities
 * 
 * Comprehensive utilities for implementing WCAG 2.1 AA compliance
 * and enhanced screen reader support throughout the application.
 */

/**
 * Generates unique IDs for form elements and ARIA relationships
 */
export function generateId(prefix: string = 'lumina'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates accessible labels for form elements
 */
export function createAccessibleLabel(
    label: string,
    required: boolean = false,
    description?: string
): {
    label: string;
    ariaLabel: string;
    ariaDescription?: string;
} {
    const ariaLabel = required ? `${label}, required` : label;
    const ariaDescription = description ? `${description}` : undefined;

    return {
        label,
        ariaLabel,
        ariaDescription
    };
}

/**
 * Manages ARIA live regions for dynamic content announcements
 */
export class LiveRegionManager {
    private static instance: LiveRegionManager;
    private politeRegion: HTMLElement | null = null;
    private assertiveRegion: HTMLElement | null = null;

    static getInstance(): LiveRegionManager {
        if (!LiveRegionManager.instance) {
            LiveRegionManager.instance = new LiveRegionManager();
        }
        return LiveRegionManager.instance;
    }

    private constructor() {
        this.createLiveRegions();
    }

    private createLiveRegions(): void {
        if (typeof window === 'undefined') return;

        // Create polite live region
        this.politeRegion = document.createElement('div');
        this.politeRegion.setAttribute('aria-live', 'polite');
        this.politeRegion.setAttribute('aria-atomic', 'true');
        this.politeRegion.className = 'sr-only';
        this.politeRegion.id = 'lumina-live-region-polite';
        document.body.appendChild(this.politeRegion);

        // Create assertive live region
        this.assertiveRegion = document.createElement('div');
        this.assertiveRegion.setAttribute('aria-live', 'assertive');
        this.assertiveRegion.setAttribute('aria-atomic', 'true');
        this.assertiveRegion.className = 'sr-only';
        this.assertiveRegion.id = 'lumina-live-region-assertive';
        document.body.appendChild(this.assertiveRegion);
    }

    /**
     * Announces a message to screen readers (polite)
     */
    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;

        if (region) {
            // Clear the region first
            region.textContent = '';

            // Add the message after a brief delay to ensure it's announced
            setTimeout(() => {
                region.textContent = message;
            }, 100);

            // Clear the message after announcement
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }

    /**
     * Announces status changes (like form validation)
     */
    announceStatus(message: string): void {
        this.announce(message, 'assertive');
    }

    /**
     * Announces navigation changes
     */
    announceNavigation(message: string): void {
        this.announce(message, 'polite');
    }
}

/**
 * Manages focus for modal dialogs and overlays
 */
export class FocusManager {
    private static focusStack: HTMLElement[] = [];

    /**
     * Traps focus within a container element
     */
    static trapFocus(container: HTMLElement): () => void {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Store the previously focused element
        const previouslyFocused = document.activeElement as HTMLElement;
        this.focusStack.push(previouslyFocused);

        // Focus the first element
        if (firstElement) {
            firstElement.focus();
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            if (event.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        // Return cleanup function
        return () => {
            container.removeEventListener('keydown', handleKeyDown);

            // Restore focus to previously focused element
            const previousElement = this.focusStack.pop();
            if (previousElement) {
                previousElement.focus();
            }
        };
    }

    /**
     * Manages focus for roving tabindex pattern
     */
    static createRovingTabIndex(container: HTMLElement): {
        setActiveIndex: (index: number) => void;
        getActiveIndex: () => number;
    } {
        let activeIndex = 0;

        const updateTabIndices = (newActiveIndex: number) => {
            const elements = container.querySelectorAll(
                '[role="option"], [role="tab"], [role="menuitem"], [data-roving-tab-index]'
            ) as NodeListOf<HTMLElement>;

            elements.forEach((element, index) => {
                element.tabIndex = index === newActiveIndex ? 0 : -1;
            });

            activeIndex = newActiveIndex;
        };

        // Initialize
        updateTabIndices(0);

        return {
            setActiveIndex: updateTabIndices,
            getActiveIndex: () => activeIndex
        };
    }
}

/**
 * Validates color contrast ratios for WCAG compliance
 */
export class ContrastValidator {
    /**
     * Calculates the contrast ratio between two colors
     */
    static calculateContrastRatio(color1: string, color2: string): number {
        const luminance1 = this.getLuminance(color1);
        const luminance2 = this.getLuminance(color2);

        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Checks if a color combination meets WCAG AA standards
     */
    static meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
        const ratio = this.calculateContrastRatio(foreground, background);
        return isLargeText ? ratio >= 3 : ratio >= 4.5;
    }

    /**
     * Checks if a color combination meets WCAG AAA standards
     */
    static meetsWCAGAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
        const ratio = this.calculateContrastRatio(foreground, background);
        return isLargeText ? ratio >= 4.5 : ratio >= 7;
    }

    private static getLuminance(color: string): number {
        // Convert color to RGB values
        const rgb = this.hexToRgb(color);
        if (!rgb) return 0;

        // Convert to relative luminance
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

/**
 * Manages page titles and headings for proper document structure
 */
export class DocumentStructureManager {
    private static currentPageTitle: string = '';
    private static headingLevels: number[] = [];

    /**
     * Sets the page title with proper formatting
     */
    static setPageTitle(title: string, siteName: string = 'Lumina'): void {
        const fullTitle = title ? `${title} | ${siteName}` : siteName;
        document.title = fullTitle;
        this.currentPageTitle = title;

        // Announce page change to screen readers
        const liveRegion = LiveRegionManager.getInstance();
        liveRegion.announceNavigation(`Navigated to ${title}`);
    }

    /**
     * Validates heading hierarchy
     */
    static validateHeadingHierarchy(container: HTMLElement = document.body): {
        isValid: boolean;
        issues: string[];
    } {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const issues: string[] = [];
        let previousLevel = 0;
        let hasH1 = false;

        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.charAt(1));

            if (level === 1) {
                if (hasH1) {
                    issues.push(`Multiple H1 elements found. Only one H1 should exist per page.`);
                }
                hasH1 = true;
            }

            if (index === 0 && level !== 1) {
                issues.push(`First heading should be H1, found H${level}`);
            }

            if (level > previousLevel + 1) {
                issues.push(`Heading level jumps from H${previousLevel} to H${level}. Levels should increment by 1.`);
            }

            previousLevel = level;
        });

        if (!hasH1) {
            issues.push('No H1 element found. Every page should have exactly one H1.');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Creates accessible breadcrumb navigation
     */
    static createBreadcrumbNavigation(items: Array<{ label: string; href?: string }>): string {
        const breadcrumbItems = items.map((item, index) => {
            const isLast = index === items.length - 1;
            const ariaCurrent = isLast ? 'aria-current="page"' : '';

            if (item.href && !isLast) {
                return `<li><a href="${item.href}" ${ariaCurrent}>${item.label}</a></li>`;
            } else {
                return `<li><span ${ariaCurrent}>${item.label}</span></li>`;
            }
        }).join('');

        return `
      <nav aria-label="Breadcrumb navigation">
        <ol role="list">
          ${breadcrumbItems}
        </ol>
      </nav>
    `;
    }
}

/**
 * Manages keyboard shortcuts and their announcements
 */
export class KeyboardShortcutManager {
    private static shortcuts: Map<string, { description: string; handler: () => void }> = new Map();

    /**
     * Registers a keyboard shortcut
     */
    static registerShortcut(
        key: string,
        description: string,
        handler: () => void,
        modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}
    ): void {
        const shortcutKey = this.createShortcutKey(key, modifiers);
        this.shortcuts.set(shortcutKey, { description, handler });

        // Add global event listener if this is the first shortcut
        if (this.shortcuts.size === 1) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        }
    }

    /**
     * Unregisters a keyboard shortcut
     */
    static unregisterShortcut(key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}): void {
        const shortcutKey = this.createShortcutKey(key, modifiers);
        this.shortcuts.delete(shortcutKey);

        // Remove global event listener if no shortcuts remain
        if (this.shortcuts.size === 0) {
            document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        }
    }

    /**
     * Gets all registered shortcuts for help display
     */
    static getShortcuts(): Array<{ key: string; description: string }> {
        return Array.from(this.shortcuts.entries()).map(([key, { description }]) => ({
            key: this.formatShortcutKey(key),
            description
        }));
    }

    private static createShortcutKey(key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean }): string {
        const parts = [];
        if (modifiers.ctrl) parts.push('ctrl');
        if (modifiers.alt) parts.push('alt');
        if (modifiers.shift) parts.push('shift');
        parts.push(key.toLowerCase());
        return parts.join('+');
    }

    private static formatShortcutKey(shortcutKey: string): string {
        return shortcutKey
            .split('+')
            .map(part => part === 'ctrl' ? 'Ctrl' : part === 'alt' ? 'Alt' : part === 'shift' ? 'Shift' : part.toUpperCase())
            .join(' + ');
    }

    private static handleKeyDown(event: KeyboardEvent): void {
        const shortcutKey = this.createShortcutKey(event.key, {
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey
        });

        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut) {
            event.preventDefault();
            shortcut.handler();
        }
    }
}

/**
 * Utility functions for common accessibility patterns
 */
export const AccessibilityUtils = {
    /**
     * Creates an accessible loading state announcement
     */
    announceLoading: (message: string = 'Loading content') => {
        const liveRegion = LiveRegionManager.getInstance();
        liveRegion.announce(message, 'polite');
    },

    /**
     * Creates an accessible error announcement
     */
    announceError: (message: string) => {
        const liveRegion = LiveRegionManager.getInstance();
        liveRegion.announceStatus(`Error: ${message}`);
    },

    /**
     * Creates an accessible success announcement
     */
    announceSuccess: (message: string) => {
        const liveRegion = LiveRegionManager.getInstance();
        liveRegion.announceStatus(`Success: ${message}`);
    },

    /**
     * Formats numbers for screen readers
     */
    formatNumberForScreenReader: (num: number, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
        switch (type) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(num);
            case 'percentage':
                return new Intl.NumberFormat('en-US', {
                    style: 'percent',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1
                }).format(num / 100);
            default:
                return new Intl.NumberFormat('en-US').format(num);
        }
    },

    /**
     * Formats dates for screen readers
     */
    formatDateForScreenReader: (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    /**
     * Creates accessible table headers
     */
    createTableHeaders: (headers: string[]): string => {
        return headers.map((header, index) =>
            `<th scope="col" id="header-${index}">${header}</th>`
        ).join('');
    },

    /**
     * Creates accessible form validation messages
     */
    createValidationMessage: (fieldName: string, errors: string[]): string => {
        if (errors.length === 0) return '';

        const errorList = errors.map(error => `<li>${error}</li>`).join('');
        return `
      <div role="alert" aria-live="assertive">
        <p>There ${errors.length === 1 ? 'is' : 'are'} ${errors.length} error${errors.length === 1 ? '' : 's'} with ${fieldName}:</p>
        <ul>${errorList}</ul>
      </div>
    `;
    }
};