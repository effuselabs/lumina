/**
 * Development-only performance monitoring dashboard
 * Shows component render times, animation performance, and bundle analysis
 */

'use client';

import { animationMonitor, type AnimationMetrics } from '@/lib/animation-utils';
import { generateCSSOptimizationReport, type CSSOptimizationReport } from '@/lib/css-optimization';
import { performanceMonitor, type ComponentMetrics } from '@/lib/performance-utils';
import { useCallback, useEffect, useState } from 'react';

interface PerformanceMonitorProps {
    enabled?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function PerformanceMonitor({
    enabled = process.env.NODE_ENV === 'development',
    position = 'bottom-right'
}: PerformanceMonitorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'components' | 'animations' | 'css' | 'memory'>('components');
    const [componentMetrics, setComponentMetrics] = useState<ComponentMetrics[]>([]);
    const [animationMetrics, setAnimationMetrics] = useState<Map<string, AnimationMetrics>>(new Map());
    const [cssReport, setCssReport] = useState<CSSOptimizationReport | null>(null);
    const [memoryInfo, setMemoryInfo] = useState<any>(null);

    const refreshMetrics = useCallback(() => {
        setComponentMetrics(performanceMonitor.getAllMetrics());
        setAnimationMetrics(animationMonitor.getAllMetrics());

        if (typeof window !== 'undefined') {
            setCssReport(generateCSSOptimizationReport());

            if ('memory' in performance) {
                setMemoryInfo((performance as any).memory);
            }
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(refreshMetrics, 2000);
        return () => clearInterval(interval);
    }, [enabled, refreshMetrics]);

    if (!enabled) return null;

    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
    };

    return (
        <div className={`fixed ${positionClasses[position]} z-50 font-mono text-xs`}>
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black/80 text-white px-3 py-2 rounded-lg hover:bg-black/90 transition-colors"
                    title="Open Performance Monitor"
                >
                    📊 Perf
                </button>
            ) : (
                <div className="bg-white border border-gray-300 rounded-lg shadow-lg w-96 max-h-96 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-100 px-3 py-2 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Performance Monitor</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={refreshMetrics}
                                className="text-gray-600 hover:text-gray-800"
                                title="Refresh"
                            >
                                🔄
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-600 hover:text-gray-800"
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b">
                        {[
                            { key: 'components', label: 'Components', icon: '⚛️' },
                            { key: 'animations', label: 'Animations', icon: '🎬' },
                            { key: 'css', label: 'CSS', icon: '🎨' },
                            { key: 'memory', label: 'Memory', icon: '💾' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex-1 px-2 py-1 text-center transition-colors ${activeTab === tab.key
                                        ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="mr-1">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-3 max-h-64 overflow-y-auto">
                        {activeTab === 'components' && (
                            <div>
                                <div className="mb-2 text-gray-600">
                                    {componentMetrics.length} components tracked
                                </div>
                                {componentMetrics.length === 0 ? (
                                    <div className="text-gray-500 italic">No component metrics yet</div>
                                ) : (
                                    <div className="space-y-2">
                                        {componentMetrics
                                            .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
                                            .slice(0, 10)
                                            .map((metric) => (
                                                <div
                                                    key={metric.componentName}
                                                    className="bg-gray-50 p-2 rounded border"
                                                >
                                                    <div className="font-semibold text-gray-800">
                                                        {metric.componentName}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1 text-gray-600">
                                                        <div>Renders: {metric.renderCount}</div>
                                                        <div>Avg: {metric.averageRenderTime.toFixed(1)}ms</div>
                                                        <div>Last: {metric.lastRenderTime.toFixed(1)}ms</div>
                                                        <div className="text-red-600">
                                                            Unnecessary: {metric.unnecessaryRenders}
                                                        </div>
                                                    </div>
                                                    {metric.averageRenderTime > 16 && (
                                                        <div className="text-red-600 text-xs mt-1">
                                                            ⚠️ Slow render detected
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'animations' && (
                            <div>
                                <div className="mb-2 text-gray-600">
                                    {animationMetrics.size} animations tracked
                                </div>
                                {animationMetrics.size === 0 ? (
                                    <div className="text-gray-500 italic">No animation metrics yet</div>
                                ) : (
                                    <div className="space-y-2">
                                        {Array.from(animationMetrics.entries()).map(([id, metric]) => (
                                            <div key={id} className="bg-gray-50 p-2 rounded border">
                                                <div className="font-semibold text-gray-800 truncate">
                                                    {id}
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-gray-600">
                                                    <div>Duration: {metric.duration}ms</div>
                                                    <div>Frames: {metric.frameCount}</div>
                                                    <div>FPS: {metric.averageFPS.toFixed(1)}</div>
                                                    <div>
                                                        {metric.endTime ? 'Completed' : 'Running'}
                                                    </div>
                                                </div>
                                                {metric.averageFPS < 55 && metric.averageFPS > 0 && (
                                                    <div className="text-red-600 text-xs mt-1">
                                                        ⚠️ Low FPS detected
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'css' && (
                            <div>
                                {cssReport ? (
                                    <div className="space-y-2">
                                        <div className="bg-gray-50 p-2 rounded border">
                                            <div className="font-semibold text-gray-800 mb-1">
                                                CSS Usage Summary
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-gray-600">
                                                <div>Total Rules: {cssReport.totalRules}</div>
                                                <div>Used: {cssReport.usedRules}</div>
                                                <div>Unused: {cssReport.unusedRules}</div>
                                                <div>Savings: {Math.round(cssReport.potentialSavings / 1024)}KB</div>
                                            </div>
                                        </div>

                                        {cssReport.recommendations.length > 0 && (
                                            <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                                <div className="font-semibold text-yellow-800 mb-1">
                                                    Recommendations
                                                </div>
                                                {cssReport.recommendations.map((rec, index) => (
                                                    <div key={index} className="text-yellow-700 text-xs">
                                                        • {rec}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {cssReport.unusedSelectors.length > 0 && (
                                            <div className="bg-red-50 p-2 rounded border border-red-200">
                                                <div className="font-semibold text-red-800 mb-1">
                                                    Unused Selectors (first 5)
                                                </div>
                                                {cssReport.unusedSelectors.slice(0, 5).map((selector, index) => (
                                                    <div key={index} className="text-red-700 text-xs truncate">
                                                        {selector}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic">Loading CSS analysis...</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'memory' && (
                            <div>
                                {memoryInfo ? (
                                    <div className="space-y-2">
                                        <div className="bg-gray-50 p-2 rounded border">
                                            <div className="font-semibold text-gray-800 mb-1">
                                                Memory Usage
                                            </div>
                                            <div className="space-y-1 text-gray-600">
                                                <div>
                                                    Used: {Math.round(memoryInfo.usedJSHeapSize / 1048576)}MB
                                                </div>
                                                <div>
                                                    Total: {Math.round(memoryInfo.totalJSHeapSize / 1048576)}MB
                                                </div>
                                                <div>
                                                    Limit: {Math.round(memoryInfo.jsHeapSizeLimit / 1048576)}MB
                                                </div>
                                            </div>

                                            {/* Memory usage bar */}
                                            <div className="mt-2">
                                                <div className="bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${(memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {Math.round((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100)}% of limit
                                                </div>
                                            </div>

                                            {memoryInfo.usedJSHeapSize / 1048576 > 50 && (
                                                <div className="text-red-600 text-xs mt-1">
                                                    ⚠️ High memory usage detected
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic">
                                        Memory API not available in this browser
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-100 px-3 py-1 border-t text-xs text-gray-600">
                        Updates every 2s • Dev only
                    </div>
                </div>
            )}
        </div>
    );
}