import { Button } from '@/components/ui/button';

/**
 * Demo component showcasing the enhanced Button component with premium variants and animations
 */
export function EnhancedButtonDemo() {
    return (
        <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
                    Enhanced Button Component Demo
                </h1>

                {/* Premium Variants Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Premium Variants</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Premium Glass */}
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-lg">
                            <h3 className="text-white text-lg font-medium mb-4">Premium Glass</h3>
                            <Button variant="premium-glass" className="w-full">
                                Glassmorphism Effect
                            </Button>
                        </div>

                        {/* Premium Glow */}
                        <div className="bg-gray-900 p-8 rounded-lg">
                            <h3 className="text-white text-lg font-medium mb-4">Premium Glow</h3>
                            <Button variant="premium-glow" className="w-full">
                                Glowing Button
                            </Button>
                        </div>

                        {/* Premium Floating */}
                        <div className="bg-gray-100 p-8 rounded-lg">
                            <h3 className="text-gray-800 text-lg font-medium mb-4">Premium Floating</h3>
                            <Button variant="premium-floating" className="w-full">
                                Floating Effect
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Animation Types Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Animation Types</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-gray-800 text-lg font-medium mb-4">Hover Lift</h3>
                            <Button variant="primary" animation="hover-lift" className="w-full">
                                Lift Animation
                            </Button>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-gray-800 text-lg font-medium mb-4">Hover Scale</h3>
                            <Button variant="secondary" animation="hover-scale" className="w-full">
                                Scale Animation
                            </Button>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-gray-800 text-lg font-medium mb-4">Hover Glow</h3>
                            <Button variant="outline" animation="hover-glow" className="w-full">
                                Glow Animation
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Combined Effects Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Combined Effects</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-lg">
                            <h3 className="text-white text-lg font-medium mb-4">Glass + Lift</h3>
                            <Button variant="premium-glass" animation="hover-lift" className="w-full">
                                Glass with Lift
                            </Button>
                        </div>

                        <div className="bg-gray-900 p-8 rounded-lg">
                            <h3 className="text-white text-lg font-medium mb-4">Glow + Scale</h3>
                            <Button variant="premium-glow" animation="hover-scale" className="w-full">
                                Glow with Scale
                            </Button>
                        </div>

                        <div className="bg-gray-100 p-8 rounded-lg">
                            <h3 className="text-gray-800 text-lg font-medium mb-4">Floating + Glow</h3>
                            <Button variant="premium-floating" animation="hover-glow" className="w-full">
                                Floating with Glow
                            </Button>
                        </div>
                    </div>
                </section>

                {/* States Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Button States</h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Button variant="premium-glow" animation="hover-lift">
                            Normal State
                        </Button>

                        <Button variant="premium-glow" animation="hover-lift" loading>
                            Loading State
                        </Button>

                        <Button variant="premium-glow" animation="hover-lift" disabled>
                            Disabled State
                        </Button>

                        <Button variant="premium-glass" animation="hover-scale" size="sm">
                            Small Size
                        </Button>
                    </div>
                </section>

                {/* Accessibility Note */}
                <section className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-blue-900 text-lg font-medium mb-2">Accessibility Features</h3>
                    <ul className="text-blue-800 space-y-1">
                        <li>• Respects <code>prefers-reduced-motion</code> settings</li>
                        <li>• Maintains proper focus indicators</li>
                        <li>• Supports screen readers with ARIA attributes</li>
                        <li>• High contrast mode compatible</li>
                        <li>• Keyboard navigation friendly</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}