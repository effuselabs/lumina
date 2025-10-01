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
                    Enhanced StatCard Component Showcase
                </h1>
                <p className="text-gray-600">
                    Optimized StatCard component with size variants, enhanced visual design, scroll-triggered animations,
                    count-up effects, and accessibility features.
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
                        <li>• Reduced motion preferences respected (animations disabled automatically)</li>
                        <li>• Proper focus indicators</li>
                        <li>• Meaningful alternative text for visual elements</li>
                        <li>• ARIA labels maintained during count-up animations</li>
                        <li>• Screen reader announcements for value changes</li>
                        <li>• Tabular number formatting for consistent alignment</li>
                    </ul>
                </div>
            </section>

            {/* NEW: Scroll-Triggered Animations */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Scroll-Triggered Animations</h2>
                <p className="text-gray-600 mb-6">
                    StatCards animate into view when scrolled into the viewport. Scroll down to see the effect.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Total Users"
                        value={1250}
                        icon="users"
                        animated={true}
                        change={{
                            value: 12.5,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="Active Sessions"
                        value={847}
                        icon="activity"
                        animated={true}
                        animationDelay={100}
                        change={{
                            value: 8.2,
                            type: 'increase',
                            period: 'from last week'
                        }}
                    />
                    <StatCard
                        title="Conversion Rate"
                        value="3.2%"
                        icon="trending-up"
                        animated={true}
                        animationDelay={200}
                        change={{
                            value: 0.8,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                </div>
            </section>

            {/* NEW: Count-Up Animations */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Count-Up Animations</h2>
                <p className="text-gray-600 mb-6">
                    Numeric values animate with smooth count-up effects when they come into view.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Monthly Revenue"
                        value={45750}
                        icon="dollar-sign"
                        animated={true}
                        countUp={true}
                        size="large"
                        change={{
                            value: 15.3,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="New Customers"
                        value={234}
                        icon="users"
                        animated={true}
                        countUp={true}
                        animationDelay={150}
                        change={{
                            value: 23.1,
                            type: 'increase',
                            period: 'this month'
                        }}
                    />
                    <StatCard
                        title="Orders Completed"
                        value={1847}
                        icon="calendar"
                        animated={true}
                        countUp={true}
                        animationDelay={300}
                        change={{
                            value: 5.7,
                            type: 'increase',
                            period: 'from last week'
                        }}
                    />
                    <StatCard
                        title="Average Rating"
                        value="4.8"
                        icon="star"
                        animated={true}
                        animationDelay={450}
                        change={{
                            value: 0.2,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                </div>
            </section>

            {/* NEW: Staggered Animation Grid */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Staggered Animation Grid</h2>
                <p className="text-gray-600 mb-6">
                    Multiple StatCards with automatic staggered delays for a smooth cascade effect.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Website Visits"
                        value={12450}
                        icon="activity"
                        animated={true}
                        countUp={true}
                        animationDelay={0}
                        change={{
                            value: 18.2,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="Page Views"
                        value={34720}
                        icon="bar-chart"
                        animated={true}
                        countUp={true}
                        animationDelay={100}
                        change={{
                            value: 12.8,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="Bounce Rate"
                        value="2.4%"
                        icon="trending-up"
                        animated={true}
                        animationDelay={200}
                        change={{
                            value: 0.5,
                            type: 'decrease',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="Session Duration"
                        value="4:32"
                        icon="clock"
                        animated={true}
                        animationDelay={300}
                        change={{
                            value: 8.1,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="Mobile Users"
                        value={8960}
                        icon="users"
                        animated={true}
                        countUp={true}
                        animationDelay={400}
                        change={{
                            value: 22.3,
                            type: 'increase',
                            period: 'from last month'
                        }}
                    />
                    <StatCard
                        title="Desktop Users"
                        value={3490}
                        icon="users"
                        animated={true}
                        countUp={true}
                        animationDelay={500}
                        change={{
                            value: 3.2,
                            type: 'decrease',
                            period: 'from last month'
                        }}
                    />
                </div>
            </section>

            {/* NEW: Compact Size with Animations */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Compact Size with Animations</h2>
                <p className="text-gray-600 mb-6">
                    Compact StatCards with count-up animations for dashboard widgets.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <StatCard
                        title="Orders"
                        value={156}
                        icon="calendar"
                        size="compact"
                        animated={true}
                        countUp={true}
                        animationDelay={0}
                    />
                    <StatCard
                        title="Revenue"
                        value={8450}
                        icon="dollar-sign"
                        size="compact"
                        animated={true}
                        countUp={true}
                        animationDelay={75}
                    />
                    <StatCard
                        title="Customers"
                        value={89}
                        icon="users"
                        size="compact"
                        animated={true}
                        countUp={true}
                        animationDelay={150}
                    />
                    <StatCard
                        title="Products"
                        value={234}
                        icon="bar-chart"
                        size="compact"
                        animated={true}
                        countUp={true}
                        animationDelay={225}
                    />
                    <StatCard
                        title="Reviews"
                        value={67}
                        icon="star"
                        size="compact"
                        animated={true}
                        countUp={true}
                        animationDelay={300}
                    />
                    <StatCard
                        title="Support"
                        value={23}
                        icon="activity"
                        size="compact"
                        animated={true}
                        countUp={true}
                        animationDelay={375}
                    />
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
                        <li>• GPU-accelerated scroll-triggered animations</li>
                        <li>• Intersection Observer for performance-optimized triggers</li>
                        <li>• Count-up animations with easing functions</li>
                        <li>• Proper cleanup to prevent memory leaks</li>
                    </ul>
                </div>
            </section>

            {/* NEW: Animation Features */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Animation Features</h2>

                <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Enhanced Animations</h3>
                    <ul className="space-y-2 text-gray-700">
                        <li>• Scroll-triggered animations with Intersection Observer</li>
                        <li>• Smooth count-up effects for numeric values</li>
                        <li>• Staggered animation delays for multiple cards</li>
                        <li>• Visual progress indicators with gradient effects</li>
                        <li>• Customizable animation delays and easing functions</li>
                        <li>• Currency, percentage, and integer formatters</li>
                        <li>• Respects prefers-reduced-motion accessibility setting</li>
                        <li>• Optimized for 60fps with GPU acceleration</li>
                        <li>• Proper ARIA labels maintained during animations</li>
                        <li>• CSS containment for improved rendering performance</li>
                    </ul>
                </div>
            </section>

            {/* Spacer for scroll testing */}
            <div className="h-96 flex items-center justify-center">
                <p className="text-gray-500 text-center">
                    Scroll back up to see the animations trigger again<br />
                    (if you refresh the page)
                </p>
            </div>
        </div>
    );
}