import { StatCard } from '@/components/ui/stat-card';
import {
    Calendar,
    Clock,
    DollarSign,
    Target,
    TrendingDown,
    TrendingUp,
    UserCheck,
    Users
} from 'lucide-react';

export default function StatCardsPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    StatCard Component Showcase
                </h1>
                <p className="text-gray-600">
                    Optimized StatCard component with size variants, enhanced visual design, and accessibility features.
                </p>
            </div>

            {/* Size Variants */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Size Variants</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-4">Compact (20% smaller)</h3>
                        <StatCard
                            title="Total Revenue"
                            value={25000}
                            change={{ value: 12, type: 'increase', period: 'this month' }}
                            icon={DollarSign}
                            size="compact"
                            action={{ label: 'View Reports', href: '#' }}
                        />
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-4">Default</h3>
                        <StatCard
                            title="Total Revenue"
                            value={25000}
                            change={{ value: 12, type: 'increase', period: 'this month' }}
                            icon={DollarSign}
                            size="default"
                            action={{ label: 'View Reports', href: '#' }}
                        />
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-4">Large</h3>
                        <StatCard
                            title="Total Revenue"
                            value={25000}
                            change={{ value: 12, type: 'increase', period: 'this month' }}
                            icon={DollarSign}
                            size="large"
                            action={{ label: 'View Reports', href: '#' }}
                        />
                    </div>
                </div>
            </section>

            {/* Change Indicators */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Change Indicators</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Revenue Growth"
                        value={45000}
                        change={{ value: 15, type: 'increase', period: 'this quarter' }}
                        icon={TrendingUp}
                        action={{ label: 'View Details', href: '#' }}
                    />

                    <StatCard
                        title="Customer Churn"
                        value={8}
                        change={{ value: 5, type: 'decrease', period: 'this month' }}
                        icon={TrendingDown}
                        action={{ label: 'Analyze', href: '#' }}
                    />

                    <StatCard
                        title="Conversion Rate"
                        value="3.2%"
                        change={{ value: 0, type: 'neutral', period: 'this week' }}
                        icon={Target}
                        action={{ label: 'Optimize', href: '#' }}
                    />
                </div>
            </section>

            {/* Different Value Types */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Value Types</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Monthly Revenue"
                        value={125000}
                        change={{ value: 8, type: 'increase', period: 'vs last month' }}
                        icon={DollarSign}
                        size="compact"
                    />

                    <StatCard
                        title="Active Users"
                        value={1234}
                        change={{ value: 23, type: 'increase', period: 'this week' }}
                        icon={Users}
                        size="compact"
                    />

                    <StatCard
                        title="Completion Rate"
                        value="94.5%"
                        change={{ value: 2, type: 'increase', period: 'this month' }}
                        icon={UserCheck}
                        size="compact"
                    />

                    <StatCard
                        title="Avg Response Time"
                        value="2.3s"
                        change={{ value: 12, type: 'decrease', period: 'this week' }}
                        icon={Clock}
                        size="compact"
                    />
                </div>
            </section>

            {/* Without Actions */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Without Action Links</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Appointments"
                        value={156}
                        change={{ value: 18, type: 'increase', period: 'this month' }}
                        icon={Calendar}
                    />

                    <StatCard
                        title="New Clients"
                        value={42}
                        change={{ value: 25, type: 'increase', period: 'this month' }}
                        icon={Users}
                    />

                    <StatCard
                        title="Staff Members"
                        value={8}
                        icon={UserCheck}
                    />

                    <StatCard
                        title="Average Rating"
                        value="4.8"
                        change={{ value: 3, type: 'increase', period: 'this quarter' }}
                        icon={Target}
                    />
                </div>
            </section>

            {/* Loading States */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Loading States</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Loading Revenue"
                        value={0}
                        icon={DollarSign}
                        loading={true}
                        action={{ label: 'View Reports', href: '#' }}
                    />

                    <StatCard
                        title="Loading Users"
                        value={0}
                        icon={Users}
                        loading={true}
                        size="compact"
                    />

                    <StatCard
                        title="Loading Metrics"
                        value={0}
                        icon={TrendingUp}
                        loading={true}
                        size="large"
                    />
                </div>
            </section>

            {/* Real-world Examples */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Real-world Dashboard Example</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Today's Revenue"
                        value={2450}
                        change={{ value: 12, type: 'increase', period: 'vs yesterday' }}
                        icon={DollarSign}
                        size="compact"
                        action={{ label: 'View Transactions', href: '#' }}
                    />

                    <StatCard
                        title="Appointments Today"
                        value={18}
                        change={{ value: 6, type: 'increase', period: 'vs yesterday' }}
                        icon={Calendar}
                        size="compact"
                        action={{ label: 'View Schedule', href: '#' }}
                    />

                    <StatCard
                        title="New Clients"
                        value={5}
                        change={{ value: 25, type: 'increase', period: 'this week' }}
                        icon={Users}
                        size="compact"
                        action={{ label: 'View Clients', href: '#' }}
                    />

                    <StatCard
                        title="Staff Utilization"
                        value="87%"
                        change={{ value: 3, type: 'increase', period: 'this week' }}
                        icon={UserCheck}
                        size="compact"
                        action={{ label: 'Manage Staff', href: '#' }}
                    />
                </div>
            </section>

            {/* Accessibility Features */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Accessibility Features</h2>

                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Built-in Accessibility</h3>
                    <ul className="space-y-2 text-gray-700">
                        <li>• Semantic HTML with proper ARIA labels</li>
                        <li>• Screen reader friendly with descriptive text</li>
                        <li>• Keyboard navigation support</li>
                        <li>• High contrast mode support</li>
                        <li>• Reduced motion preferences respected</li>
                        <li>• Proper focus indicators</li>
                        <li>• Meaningful alternative text for visual elements</li>
                    </ul>
                </div>
            </section>

            {/* Performance Features */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Performance Features</h2>

                <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Optimizations</h3>
                    <ul className="space-y-2 text-gray-700">
                        <li>• CSS transform-based animations for 60fps performance</li>
                        <li>• Smooth transitions under 300ms for UI feedback</li>
                        <li>• Optimized skeleton loading states</li>
                        <li>• Efficient re-rendering with React.forwardRef</li>
                        <li>• Minimal layout shifts during loading</li>
                        <li>• Hardware-accelerated hover effects</li>
                    </ul>
                </div>
            </section>
        </div>
    );
}