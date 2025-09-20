/**
 * Bundle analysis utilities for optimizing JavaScript bundle size
 * Provides insights into component sizes, dependencies, and optimization opportunities
 */

// Bundle analysis types
export interface ModuleInfo {
    name: string;
    size: number;
    gzippedSize?: number;
    dependencies: string[];
    importedBy: string[];
    isEntry: boolean;
    isAsync: boolean;
    chunks: string[];
}

export interface BundleAnalysis {
    totalSize: number;
    totalGzippedSize: number;
    modules: ModuleInfo[];
    chunks: ChunkInfo[];
    duplicates: DuplicateModule[];
    recommendations: string[];
}

export interface ChunkInfo {
    name: string;
    size: number;
    modules: string[];
    isEntry: boolean;
    isAsync: boolean;
}

export interface DuplicateModule {
    name: string;
    occurrences: number;
    totalSize: number;
    chunks: string[];
}

// Component size estimation
const COMPONENT_SIZE_ESTIMATES = {
    // Base React overhead
    react: 42000, // ~42KB
    'react-dom': 130000, // ~130KB

    // UI Components (estimated)
    Button: 2000,
    Input: 1500,
    Select: 4000,
    Textarea: 1200,
    StatCard: 3500,
    Spinner: 800,
    Modal: 8000,
    Dialog: 6000,
    Tooltip: 3000,
    Popover: 4000,
    Table: 12000,
    Form: 5000,

    // Third-party libraries (estimated)
    'lucide-react': 15000,
    '@radix-ui/react-dialog': 8000,
    '@radix-ui/react-popover': 6000,
    '@radix-ui/react-select': 12000,
    'class-variance-authority': 2000,
    'clsx': 500,
    'tailwind-merge': 8000,

    // Utilities
    'date-fns': 20000,
    'lodash': 70000,
    'moment': 67000,
} as const;

// Bundle size analyzer
export class BundleAnalyzer {
    private modules: Map<string, ModuleInfo> = new Map();
    private chunks: Map<string, ChunkInfo> = new Map();

    // Simulate module registration (in real app, this would come from webpack/vite)
    registerModule(info: ModuleInfo): void {
        this.modules.set(info.name, info);
    }

    registerChunk(info: ChunkInfo): void {
        this.chunks.set(info.name, info);
    }

    // Estimate component bundle impact
    estimateComponentSize(componentName: string): number {
        return COMPONENT_SIZE_ESTIMATES[componentName as keyof typeof COMPONENT_SIZE_ESTIMATES] || 2000;
    }

    // Find duplicate modules
    findDuplicates(): DuplicateModule[] {
        const moduleOccurrences = new Map<string, { count: number; size: number; chunks: Set<string> }>();

        this.modules.forEach((module) => {
            const baseName = this.getBaseName(module.name);
            const existing = moduleOccurrences.get(baseName) || { count: 0, size: 0, chunks: new Set() };

            existing.count++;
            existing.size += module.size;
            module.chunks.forEach(chunk => existing.chunks.add(chunk));

            moduleOccurrences.set(baseName, existing);
        });

        return Array.from(moduleOccurrences.entries())
            .filter(([_, info]) => info.count > 1)
            .map(([name, info]) => ({
                name,
                occurrences: info.count,
                totalSize: info.size,
                chunks: Array.from(info.chunks),
            }))
            .sort((a, b) => b.totalSize - a.totalSize);
    }

    private getBaseName(moduleName: string): string {
        // Remove version numbers and paths to identify the same module
        return moduleName
            .replace(/\/node_modules\//, '')
            .replace(/@[\d.]+/, '')
            .replace(/\/.*$/, '')
            .split('/')[0];
    }

    // Analyze bundle composition
    analyze(): BundleAnalysis {
        const modules = Array.from(this.modules.values());
        const chunks = Array.from(this.chunks.values());
        const duplicates = this.findDuplicates();

        const totalSize = modules.reduce((sum, module) => sum + module.size, 0);
        const totalGzippedSize = modules.reduce((sum, module) => sum + (module.gzippedSize || module.size * 0.3), 0);

        const recommendations = this.generateRecommendations(modules, duplicates);

        return {
            totalSize,
            totalGzippedSize,
            modules: modules.sort((a, b) => b.size - a.size),
            chunks: chunks.sort((a, b) => b.size - a.size),
            duplicates,
            recommendations,
        };
    }

    private generateRecommendations(modules: ModuleInfo[], duplicates: DuplicateModule[]): string[] {
        const recommendations: string[] = [];

        // Large modules
        const largeModules = modules.filter(m => m.size > 50000);
        if (largeModules.length > 0) {
            recommendations.push(
                `Consider code splitting for large modules: ${largeModules.map(m => m.name).join(', ')}`
            );
        }

        // Duplicate modules
        if (duplicates.length > 0) {
            const significantDuplicates = duplicates.filter(d => d.totalSize > 10000);
            if (significantDuplicates.length > 0) {
                recommendations.push(
                    `Remove duplicate modules: ${significantDuplicates.map(d => d.name).join(', ')}`
                );
            }
        }

        // Synchronous chunks that could be async
        const syncChunks = modules.filter(m => !m.isAsync && !m.isEntry && m.size > 20000);
        if (syncChunks.length > 0) {
            recommendations.push(
                `Consider lazy loading: ${syncChunks.map(m => m.name).join(', ')}`
            );
        }

        // Bundle size warnings
        if (modules.reduce((sum, m) => sum + m.size, 0) > 500000) {
            recommendations.push('Total bundle size exceeds 500KB, consider optimization');
        }

        return recommendations;
    }

    // Get optimization opportunities
    getOptimizationOpportunities(): {
        treeshaking: string[];
        codesplitting: string[];
        lazyloading: string[];
        replacement: Array<{ current: string; suggested: string; savings: number }>;
    } {
        const modules = Array.from(this.modules.values());

        // Tree shaking opportunities (modules with many unused exports)
        const treeshaking = modules
            .filter(m => m.dependencies.length > 10)
            .map(m => m.name);

        // Code splitting opportunities (large synchronous modules)
        const codesplitting = modules
            .filter(m => !m.isAsync && m.size > 30000)
            .map(m => m.name);

        // Lazy loading opportunities (non-critical modules)
        const lazyloading = modules
            .filter(m => !m.isEntry && !m.name.includes('critical'))
            .map(m => m.name);

        // Library replacement suggestions
        const replacement = [
            {
                current: 'moment',
                suggested: 'date-fns',
                savings: 47000,
            },
            {
                current: 'lodash',
                suggested: 'lodash-es (tree-shakeable)',
                savings: 50000,
            },
        ].filter(r => modules.some(m => m.name.includes(r.current)));

        return {
            treeshaking,
            codesplitting,
            lazyloading,
            replacement,
        };
    }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

// Component usage tracker for bundle optimization
export class ComponentUsageTracker {
    private usage = new Map<string, { count: number; lastUsed: number; size: number }>();

    trackUsage(componentName: string): void {
        const existing = this.usage.get(componentName) || { count: 0, lastUsed: 0, size: 0 };

        this.usage.set(componentName, {
            count: existing.count + 1,
            lastUsed: Date.now(),
            size: bundleAnalyzer.estimateComponentSize(componentName),
        });
    }

    getUnusedComponents(threshold: number = 7 * 24 * 60 * 60 * 1000): string[] {
        const now = Date.now();
        return Array.from(this.usage.entries())
            .filter(([_, info]) => now - info.lastUsed > threshold)
            .map(([name]) => name);
    }

    getRarelyUsedComponents(maxUsage: number = 5): string[] {
        return Array.from(this.usage.entries())
            .filter(([_, info]) => info.count <= maxUsage)
            .map(([name]) => name);
    }

    getUsageReport(): Array<{ name: string; count: number; size: number; lastUsed: Date }> {
        return Array.from(this.usage.entries())
            .map(([name, info]) => ({
                name,
                count: info.count,
                size: info.size,
                lastUsed: new Date(info.lastUsed),
            }))
            .sort((a, b) => b.count - a.count);
    }
}

// Global component usage tracker
export const componentUsageTracker = new ComponentUsageTracker();

// Bundle optimization utilities
export function optimizeBundleLoading(): void {
    if (typeof window === 'undefined') return;

    // Preload critical chunks
    const criticalChunks = ['main', 'vendor', 'runtime'];
    criticalChunks.forEach(chunk => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = `/chunks/${chunk}.js`;
        document.head.appendChild(link);
    });

    // Prefetch likely-needed chunks
    const prefetchChunks = ['dashboard', 'forms', 'charts'];
    setTimeout(() => {
        prefetchChunks.forEach(chunk => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = `/chunks/${chunk}.js`;
            document.head.appendChild(link);
        });
    }, 2000);
}

// Performance budget checker
export interface PerformanceBudget {
    maxBundleSize: number;
    maxChunkSize: number;
    maxModuleSize: number;
    maxDuplicates: number;
}

export function checkPerformanceBudget(
    analysis: BundleAnalysis,
    budget: PerformanceBudget
): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (analysis.totalSize > budget.maxBundleSize) {
        violations.push(`Bundle size ${Math.round(analysis.totalSize / 1024)}KB exceeds budget ${Math.round(budget.maxBundleSize / 1024)}KB`);
    }

    const largeChunks = analysis.chunks.filter(c => c.size > budget.maxChunkSize);
    if (largeChunks.length > 0) {
        violations.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}`);
    }

    const largeModules = analysis.modules.filter(m => m.size > budget.maxModuleSize);
    if (largeModules.length > 0) {
        violations.push(`Large modules detected: ${largeModules.map(m => m.name).join(', ')}`);
    }

    if (analysis.duplicates.length > budget.maxDuplicates) {
        violations.push(`Too many duplicate modules: ${analysis.duplicates.length} > ${budget.maxDuplicates}`);
    }

    return {
        passed: violations.length === 0,
        violations,
    };
}

// Default performance budget
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
    maxBundleSize: 500000, // 500KB
    maxChunkSize: 250000,  // 250KB
    maxModuleSize: 100000, // 100KB
    maxDuplicates: 3,
};

// Auto-track component usage in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Track React component renders
    const originalCreateElement = React.createElement;
    React.createElement = function (type, props, ...children) {
        if (typeof type === 'function' && type.name) {
            componentUsageTracker.trackUsage(type.name);
        }
        return originalCreateElement.call(this, type, props, ...children);
    };
}