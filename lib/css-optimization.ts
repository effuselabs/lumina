/**
 * CSS optimization utilities for bundle size reduction
 * Removes unused styles and optimizes CSS delivery
 */

// CSS class usage tracker
class CSSUsageTracker {
    private usedClasses = new Set<string>();
    private observer: MutationObserver | null = null;
    private isTracking = false;

    startTracking(): void {
        if (typeof document === 'undefined' || this.isTracking) return;

        this.isTracking = true;

        // Track initial classes
        this.scanDocument();

        // Set up mutation observer to track dynamic class changes
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as Element;
                    this.extractClasses(target.className);
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanElement(node as Element);
                        }
                    });
                }
            });
        });

        this.observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
            childList: true,
            subtree: true,
        });
    }

    stopTracking(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isTracking = false;
    }

    private scanDocument(): void {
        this.scanElement(document.body);
    }

    private scanElement(element: Element): void {
        // Scan current element
        if (element.className) {
            this.extractClasses(element.className);
        }

        // Scan children
        Array.from(element.children).forEach((child) => {
            this.scanElement(child);
        });
    }

    private extractClasses(className: string): void {
        if (typeof className === 'string') {
            className.split(/\s+/).forEach((cls) => {
                if (cls.trim()) {
                    this.usedClasses.add(cls.trim());
                }
            });
        }
    }

    getUsedClasses(): Set<string> {
        return new Set(this.usedClasses);
    }

    reset(): void {
        this.usedClasses.clear();
    }
}

// Global CSS usage tracker
export const cssUsageTracker = new CSSUsageTracker();

// CSS rule analysis
export interface CSSRuleAnalysis {
    selector: string;
    used: boolean;
    specificity: number;
    size: number;
    declarations: number;
}

export function analyzeCSSRules(): CSSRuleAnalysis[] {
    if (typeof document === 'undefined') return [];

    const usedClasses = cssUsageTracker.getUsedClasses();
    const analysis: CSSRuleAnalysis[] = [];

    Array.from(document.styleSheets).forEach((sheet) => {
        try {
            Array.from(sheet.cssRules || []).forEach((rule) => {
                if (rule.type === CSSRule.STYLE_RULE) {
                    const styleRule = rule as CSSStyleRule;
                    const selector = styleRule.selectorText;

                    // Check if selector is used
                    const used = isRuleUsed(selector, usedClasses);

                    // Calculate specificity (simplified)
                    const specificity = calculateSpecificity(selector);

                    // Calculate rule size
                    const size = rule.cssText.length;

                    // Count declarations
                    const declarations = styleRule.style.length;

                    analysis.push({
                        selector,
                        used,
                        specificity,
                        size,
                        declarations,
                    });
                }
            });
        } catch (error) {
            // Cross-origin stylesheets can't be accessed
            console.warn('Could not analyze stylesheet:', error);
        }
    });

    return analysis;
}

function isRuleUsed(selector: string, usedClasses: Set<string>): boolean {
    // Simple heuristic - check if any class in the selector is used
    const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);
    if (classMatches) {
        return classMatches.some(cls => usedClasses.has(cls.substring(1)));
    }

    // For non-class selectors, assume they're used (elements, IDs, etc.)
    return true;
}

function calculateSpecificity(selector: string): number {
    // Simplified specificity calculation
    let specificity = 0;

    // Count IDs
    specificity += (selector.match(/#[a-zA-Z0-9_-]+/g) || []).length * 100;

    // Count classes, attributes, and pseudo-classes
    specificity += (selector.match(/\.[a-zA-Z0-9_-]+|\[[^\]]+\]|:[a-zA-Z0-9_-]+/g) || []).length * 10;

    // Count elements and pseudo-elements
    specificity += (selector.match(/[a-zA-Z0-9_-]+|::[a-zA-Z0-9_-]+/g) || []).length;

    return specificity;
}

// CSS optimization recommendations
export interface CSSOptimizationReport {
    totalRules: number;
    usedRules: number;
    unusedRules: number;
    potentialSavings: number; // in bytes
    recommendations: string[];
    unusedSelectors: string[];
}

export function generateCSSOptimizationReport(): CSSOptimizationReport {
    const analysis = analyzeCSSRules();

    const totalRules = analysis.length;
    const usedRules = analysis.filter(rule => rule.used).length;
    const unusedRules = totalRules - usedRules;

    const potentialSavings = analysis
        .filter(rule => !rule.used)
        .reduce((total, rule) => total + rule.size, 0);

    const unusedSelectors = analysis
        .filter(rule => !rule.used)
        .map(rule => rule.selector);

    const recommendations: string[] = [];

    if (unusedRules > totalRules * 0.3) {
        recommendations.push(`Consider removing ${unusedRules} unused CSS rules (${Math.round(unusedRules / totalRules * 100)}% of total)`);
    }

    if (potentialSavings > 10000) {
        recommendations.push(`Potential CSS size reduction: ${Math.round(potentialSavings / 1024)}KB`);
    }

    const highSpecificityRules = analysis.filter(rule => rule.specificity > 100);
    if (highSpecificityRules.length > 0) {
        recommendations.push(`Consider reducing specificity of ${highSpecificityRules.length} high-specificity rules`);
    }

    return {
        totalRules,
        usedRules,
        unusedRules,
        potentialSavings,
        recommendations,
        unusedSelectors,
    };
}

// Critical CSS extraction
export function extractCriticalCSS(viewport: { width: number; height: number } = { width: 1200, height: 800 }): string {
    if (typeof document === 'undefined') return '';

    const criticalElements = new Set<Element>();

    // Find elements in the viewport
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: (node) => {
                const element = node as Element;
                const rect = element.getBoundingClientRect();

                // Check if element is in viewport
                if (
                    rect.top < viewport.height &&
                    rect.bottom > 0 &&
                    rect.left < viewport.width &&
                    rect.right > 0
                ) {
                    return NodeFilter.FILTER_ACCEPT;
                }

                return NodeFilter.FILTER_SKIP;
            },
        }
    );

    let node;
    while (node = walker.nextNode()) {
        criticalElements.add(node as Element);
    }

    // Extract CSS rules for critical elements
    const criticalClasses = new Set<string>();
    criticalElements.forEach((element) => {
        if (element.className) {
            element.className.split(/\s+/).forEach((cls) => {
                if (cls.trim()) {
                    criticalClasses.add(cls.trim());
                }
            });
        }
    });

    // Build critical CSS
    let criticalCSS = '';

    Array.from(document.styleSheets).forEach((sheet) => {
        try {
            Array.from(sheet.cssRules || []).forEach((rule) => {
                if (rule.type === CSSRule.STYLE_RULE) {
                    const styleRule = rule as CSSStyleRule;
                    const selector = styleRule.selectorText;

                    // Check if rule applies to critical elements
                    const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);
                    if (classMatches && classMatches.some(cls => criticalClasses.has(cls.substring(1)))) {
                        criticalCSS += rule.cssText + '\n';
                    }
                }
            });
        } catch (error) {
            console.warn('Could not extract critical CSS from stylesheet:', error);
        }
    });

    return criticalCSS;
}

// CSS minification (basic)
export function minifyCSS(css: string): string {
    return css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove unnecessary whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around certain characters
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        // Remove trailing semicolons
        .replace(/;}/g, '}')
        // Remove leading/trailing whitespace
        .trim();
}

// CSS loading optimization
export function optimizeCSSLoading(): void {
    if (typeof document === 'undefined') return;

    // Preload critical CSS
    const criticalCSS = extractCriticalCSS();
    if (criticalCSS) {
        const style = document.createElement('style');
        style.textContent = minifyCSS(criticalCSS);
        style.setAttribute('data-critical', 'true');
        document.head.insertBefore(style, document.head.firstChild);
    }

    // Lazy load non-critical CSS
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    stylesheets.forEach((link, index) => {
        if (index > 0) { // Keep first stylesheet for critical styles
            const href = link.getAttribute('href');
            if (href) {
                link.remove();

                // Load asynchronously
                setTimeout(() => {
                    const newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = href;
                    newLink.media = 'print';
                    newLink.onload = () => {
                        newLink.media = 'all';
                    };
                    document.head.appendChild(newLink);
                }, 100 * index);
            }
        }
    });
}

// Performance monitoring for CSS
export function monitorCSSPerformance(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Monitor CSS loading times
    const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
            if (entry.name.endsWith('.css')) {
                console.log(`CSS loaded: ${entry.name} in ${entry.duration.toFixed(2)}ms`);

                if (entry.duration > 100) {
                    console.warn(`Slow CSS loading detected: ${entry.name}`);
                }
            }
        });
    });

    observer.observe({ entryTypes: ['resource'] });

    // Monitor layout shifts caused by CSS
    const layoutObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
            const layoutEntry = entry as any;
            if (entry.entryType === 'layout-shift' && !layoutEntry.hadRecentInput) {
                console.log(`Layout shift detected: ${layoutEntry.value}`);

                if (layoutEntry.value > 0.1) {
                    console.warn('Significant layout shift detected, check CSS loading order');
                }
            }
        });
    });

    layoutObserver.observe({ entryTypes: ['layout-shift'] });
}

// Auto-start CSS tracking in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    cssUsageTracker.startTracking();
    monitorCSSPerformance();
}