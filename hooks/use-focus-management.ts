import { useCallback, useEffect, useRef } from 'react';

/**
 * Focus Management Hook
 * 
 * Provides utilities for managing keyboard focus in accessible applications.
 * Includes focus trapping, restoration, and programmatic focus management.
 */

interface UseFocusManagementOptions {
    /** Whether to trap focus within the container */
    trapFocus?: boolean;
    /** Whether to restore focus when component unmounts */
    restoreFocus?: boolean;
    /** Initial element to focus when component mounts */
    initialFocus?: string | HTMLElement;
    /** Whether to focus the container on mount */
    autoFocus?: boolean;
}

export function useFocusManagement(options: UseFocusManagementOptions = {}) {
    const {
        trapFocus = false,
        restoreFocus = false,
        initialFocus,
        autoFocus = false
    } = options;

    const containerRef = useRef<HTMLElement>(null);
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    // Store the previously focused element
    useEffect(() => {
        if (restoreFocus) {
            previousActiveElementRef.current = document.activeElement as HTMLElement;
        }
    }, [restoreFocus]);

    // Focus initial element or container on mount
    useEffect(() => {
        if (autoFocus && containerRef.current) {
            if (initialFocus) {
                const element = typeof initialFocus === 'string'
                    ? containerRef.current.querySelector(initialFocus) as HTMLElement
                    : initialFocus;

                if (element) {
                    element.focus();
                } else {
                    containerRef.current.focus();
                }
            } else {
                containerRef.current.focus();
            }
        }
    }, [autoFocus, initialFocus]);

    // Restore focus on unmount
    useEffect(() => {
        return () => {
            if (restoreFocus && previousActiveElementRef.current) {
                previousActiveElementRef.current.focus();
            }
        };
    }, [restoreFocus]);

    // Focus trap implementation
    useEffect(() => {
        if (!trapFocus || !containerRef.current) return;

        const container = containerRef.current;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const focusableElements = container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as NodeListOf<HTMLElement>;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

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

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [trapFocus]);

    // Utility functions
    const focusFirst = useCallback(() => {
        if (!containerRef.current) return;

        const firstFocusable = containerRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;

        if (firstFocusable) {
            firstFocusable.focus();
        }
    }, []);

    const focusLast = useCallback(() => {
        if (!containerRef.current) return;

        const focusableElements = containerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        const lastFocusable = focusableElements[focusableElements.length - 1];
        if (lastFocusable) {
            lastFocusable.focus();
        }
    }, []);

    const focusElement = useCallback((selector: string | HTMLElement) => {
        if (!containerRef.current) return;

        const element = typeof selector === 'string'
            ? containerRef.current.querySelector(selector) as HTMLElement
            : selector;

        if (element) {
            element.focus();
        }
    }, []);

    return {
        containerRef,
        focusFirst,
        focusLast,
        focusElement
    };
}

/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard navigation utilities for lists and grids.
 */
interface UseKeyboardNavigationOptions {
    /** Direction of navigation */
    direction?: 'horizontal' | 'vertical' | 'both';
    /** Whether navigation should wrap around */
    wrap?: boolean;
    /** Custom key handlers */
    onEscape?: () => void;
    onEnter?: (element: HTMLElement) => void;
    onSpace?: (element: HTMLElement) => void;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
    const {
        direction = 'both',
        wrap = true,
        onEscape,
        onEnter,
        onSpace
    } = options;

    const containerRef = useRef<HTMLElement>(null);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!containerRef.current) return;

        const focusableElements = Array.from(
            containerRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ) as HTMLElement[];

        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (event.key) {
            case 'ArrowDown':
                if (direction === 'vertical' || direction === 'both') {
                    event.preventDefault();
                    nextIndex = wrap
                        ? (currentIndex + 1) % focusableElements.length
                        : Math.min(currentIndex + 1, focusableElements.length - 1);
                }
                break;

            case 'ArrowUp':
                if (direction === 'vertical' || direction === 'both') {
                    event.preventDefault();
                    nextIndex = wrap
                        ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
                        : Math.max(currentIndex - 1, 0);
                }
                break;

            case 'ArrowRight':
                if (direction === 'horizontal' || direction === 'both') {
                    event.preventDefault();
                    nextIndex = wrap
                        ? (currentIndex + 1) % focusableElements.length
                        : Math.min(currentIndex + 1, focusableElements.length - 1);
                }
                break;

            case 'ArrowLeft':
                if (direction === 'horizontal' || direction === 'both') {
                    event.preventDefault();
                    nextIndex = wrap
                        ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
                        : Math.max(currentIndex - 1, 0);
                }
                break;

            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;

            case 'End':
                event.preventDefault();
                nextIndex = focusableElements.length - 1;
                break;

            case 'Escape':
                if (onEscape) {
                    event.preventDefault();
                    onEscape();
                }
                break;

            case 'Enter':
                if (onEnter) {
                    event.preventDefault();
                    onEnter(focusableElements[currentIndex]);
                }
                break;

            case ' ':
                if (onSpace) {
                    event.preventDefault();
                    onSpace(focusableElements[currentIndex]);
                }
                break;
        }

        if (nextIndex !== currentIndex && focusableElements[nextIndex]) {
            focusableElements[nextIndex].focus();
        }
    }, [direction, wrap, onEscape, onEnter, onSpace]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    return { containerRef };
}

/**
 * Roving Tab Index Hook
 * 
 * Implements roving tabindex pattern for keyboard navigation.
 */
export function useRovingTabIndex() {
    const containerRef = useRef<HTMLElement>(null);
    const activeIndexRef = useRef(0);

    const updateTabIndices = useCallback((activeIndex: number) => {
        if (!containerRef.current) return;

        const elements = containerRef.current.querySelectorAll(
            '[role="option"], [role="tab"], [role="menuitem"], [data-roving-tab-index]'
        ) as NodeListOf<HTMLElement>;

        elements.forEach((element, index) => {
            element.tabIndex = index === activeIndex ? 0 : -1;
        });

        activeIndexRef.current = activeIndex;
    }, []);

    const setActiveIndex = useCallback((index: number) => {
        updateTabIndices(index);
    }, [updateTabIndices]);

    const focusActiveElement = useCallback(() => {
        if (!containerRef.current) return;

        const elements = containerRef.current.querySelectorAll(
            '[role="option"], [role="tab"], [role="menuitem"], [data-roving-tab-index]'
        ) as NodeListOf<HTMLElement>;

        const activeElement = elements[activeIndexRef.current];
        if (activeElement) {
            activeElement.focus();
        }
    }, []);

    // Initialize tab indices
    useEffect(() => {
        updateTabIndices(0);
    }, [updateTabIndices]);

    return {
        containerRef,
        setActiveIndex,
        focusActiveElement,
        activeIndex: activeIndexRef.current
    };
}