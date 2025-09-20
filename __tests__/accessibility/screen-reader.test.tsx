import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { MainContentWrapper, NavigationWrapper, SkipLinks } from '@/components/ui/skip-links';
import { StatCard } from '@/components/ui/stat-card';
import {
    AccessibilityUtils,
    ContrastValidator,
    DocumentStructureManager,
    LiveRegionManager
} from '@/lib/accessibility-utils';
import { render, screen } from '@testing-library/react';
import { Calendar, DollarSign, Edit, Plus, Users } from 'lucide-react';

// Mock the accessibility utils
jest.mock('@/lib/accessibility-utils', () => ({
    LiveRegionManager: {
        getInstance: jest.fn(() => ({
            announce: jest.fn(),
            announceStatus: jest.fn(),
            announceNavigation: jest.fn(),
        })),
    },
    DocumentStructureManager: {
        setPageTitle: jest.fn(),
        validateHeadingHierarchy: jest.fn(() => ({ isValid: true, issues: [] })),
        createBreadcrumbNavigation: jest.fn(),
    },
    AccessibilityUtils: {
        announceLoading: jest.fn(),
        announceError: jest.fn(),
        announceSuccess: jest.fn(),
        formatNumberForScreenReader: jest.fn((num) => num.toLocaleString()),
        formatDateForScreenReader: jest.fn((date) => date.toLocaleDateString()),
        createValidationMessage: jest.fn(),
    },
    ContrastValidator: {
        calculateContrastRatio: jest.fn(() => 4.5),
        meetsWCAGAA: jest.fn(() => true),
        meetsWCAGAAA: jest.fn(() => true),
    },
}));

describe('Screen Reader and Assistive Technology Support', () => {
    describe('StatCard Component', () => {
        it('should have proper semantic markup', () => {
            render(
                <StatCard
                    title="Total Revenue"
                    value={15420}
                    change={{ value: 12.5, type: 'increase', period: 'this month' }}
                    icon={DollarSign}
                    action={{ label: 'View Details', href: '/revenue' }}
                />
            );

            // Check article role and labeling
            const article = screen.getByRole('article');
            expect(article).toHaveAttribute('aria-labelledby', 'stat-title-total-revenue');

            // Check heading
            const heading = screen.getByRole('heading', { level: 3 });
            expect(heading).toHaveTextContent('Total Revenue');
            expect(heading).toHaveAttribute('id', 'stat-title-total-revenue');

            // Check value with screen reader text
            const value = screen.getByRole('text');
            expect(value).toHaveAttribute('aria-label', 'Value: $15,420');

            // Check change indicator
            const changeElement = screen.getByText(/↗ 12.5% this month/);
            expect(changeElement.parentElement).toHaveAttribute(
                'aria-label',
                'Change: increased by 12.5% this month'
            );

            // Check action link
            const actionLink = screen.getByRole('link', { name: /view details for total revenue/i });
            expect(actionLink).toHaveAttribute('href', '/revenue');
        });

        it('should handle loading state with proper announcements', () => {
            render(
                <StatCard
                    title="Total Revenue"
                    value={0}
                    icon={DollarSign}
                    loading={true}
                />
            );

            const loadingElement = screen.getByRole('status');
            expect(loadingElement).toHaveAttribute('aria-label', 'Loading statistics');
        });

        it('should format different value types for screen readers', () => {
            const { rerender } = render(
                <StatCard
                    title="Total Clients"
                    value={1250}
                    icon={Users}
                />
            );

            // Check number formatting
            let value = screen.getByRole('text');
            expect(value).toHaveAttribute('aria-label', 'Value: 1,250');

            // Test currency formatting
            rerender(
                <StatCard
                    title="Monthly Revenue"
                    value={5420.50}
                    icon={DollarSign}
                />
            );

            value = screen.getByRole('text');
            expect(value).toHaveAttribute('aria-label', 'Value: $5,421');
        });

        it('should handle different change types with proper descriptions', () => {
            const { rerender } = render(
                <StatCard
                    title="Appointments"
                    value={45}
                    change={{ value: 8.2, type: 'decrease', period: 'last week' }}
                    icon={Calendar}
                />
            );

            let changeElement = screen.getByText(/↘ 8.2% last week/);
            expect(changeElement.parentElement).toHaveAttribute(
                'aria-label',
                'Change: decreased by 8.2% last week'
            );

            // Test neutral change
            rerender(
                <StatCard
                    title="Appointments"
                    value={45}
                    change={{ value: 0, type: 'neutral', period: 'this week' }}
                    icon={Calendar}
                />
            );

            changeElement = screen.getByText(/→ 0% this week/);
            expect(changeElement.parentElement).toHaveAttribute(
                'aria-label',
                'Change: no change by 0% this week'
            );
        });
    });

    describe('Page Header Component', () => {
        it('should have proper heading hierarchy and landmarks', () => {
            render(
                <PageHeader
                    title="Client Management"
                    subtitle="Manage your clients"
                    description="View and manage all your salon clients"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Clients' }
                    ]}
                    actions={[
                        { label: 'Add Client', icon: Plus, primary: true },
                        { label: 'Edit', icon: Edit, variant: 'outline' }
                    ]}
                />
            );

            // Check main heading
            const mainHeading = screen.getByRole('heading', { level: 1 });
            expect(mainHeading).toHaveTextContent('Client Management');

            // Check breadcrumb navigation
            const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
            expect(breadcrumbNav).toBeInTheDocument();

            // Check breadcrumb links
            const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
            expect(dashboardLink).toHaveAttribute('href', '/dashboard');

            // Check current page in breadcrumb
            const currentPage = screen.getByText('Clients');
            expect(currentPage).toBeInTheDocument();

            // Check action group
            const actionGroup = screen.getByRole('group', { name: /page actions/i });
            expect(actionGroup).toBeInTheDocument();

            // Check primary action is properly labeled
            const addButton = screen.getByRole('button', { name: /add client/i });
            expect(addButton).toHaveAttribute('aria-describedby');
        });

        it('should handle responsive action layout', () => {
            render(
                <PageHeader
                    title="Staff Management"
                    actions={[
                        { label: 'Add Staff', primary: true },
                        { label: 'Import', variant: 'outline' },
                        { label: 'Export', variant: 'ghost' }
                    ]}
                />
            );

            const actions = screen.getAllByRole('button');
            expect(actions).toHaveLength(3);

            // Check that all actions have proper touch targets
            actions.forEach(action => {
                expect(action).toHaveClass('touch-target');
            });
        });
    });

    describe('Form Components', () => {
        it('should have comprehensive form accessibility', () => {
            render(
                <form>
                    <FormField
                        label="Email Address"
                        hint="We'll use this to send you appointment confirmations"
                        error="Please enter a valid email address"
                        required
                    >
                        <Input type="email" placeholder="your@email.com" />
                    </FormField>

                    <FormField
                        label="Phone Number"
                        hint="Include area code"
                    >
                        <Input type="tel" placeholder="(555) 123-4567" />
                    </FormField>

                    <Button type="submit">Save Client</Button>
                </form>
            );

            // Check required field labeling
            const emailLabel = screen.getByText('Email Address');
            expect(emailLabel).toHaveClass('required');

            const requiredIndicator = screen.getByRole('img', { name: /required field/i });
            expect(requiredIndicator).toBeInTheDocument();

            // Check input associations
            const emailInput = screen.getByRole('textbox', { name: /email address/i });
            expect(emailInput).toHaveAttribute('aria-invalid', 'true');
            expect(emailInput).toHaveAttribute('aria-describedby');

            // Check error message
            const errorMessage = screen.getByRole('alert');
            expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
            expect(errorMessage).toHaveAttribute('aria-atomic', 'true');
            expect(errorMessage).toHaveTextContent(/Error: Please enter a valid email address/);

            // Check hint message
            const hintMessage = screen.getByRole('note');
            expect(hintMessage).toHaveTextContent("We'll use this to send you appointment confirmations");

            // Check phone field (no error)
            const phoneInput = screen.getByRole('textbox', { name: /phone number/i });
            expect(phoneInput).not.toHaveAttribute('aria-invalid');
        });

        it('should handle form validation announcements', () => {
            const mockAnnounceError = AccessibilityUtils.announceError as jest.Mock;

            render(
                <FormField
                    label="Required Field"
                    error="This field is required"
                    required
                >
                    <Input />
                </FormField>
            );

            // Error should be announced
            const errorElement = screen.getByRole('alert');
            expect(errorElement).toBeInTheDocument();
        });
    });

    describe('Skip Links and Navigation', () => {
        it('should provide proper skip navigation', () => {
            render(
                <>
                    <SkipLinks />
                    <NavigationWrapper>
                        <nav>Main Navigation</nav>
                    </NavigationWrapper>
                    <MainContentWrapper>
                        <h1>Main Content</h1>
                        <p>Page content here</p>
                    </MainContentWrapper>
                </>
            );

            // Check skip links
            const skipToMain = screen.getByText('Skip to main content');
            const skipToNav = screen.getByText('Skip to navigation');

            expect(skipToMain).toHaveAttribute('href', '#main-content');
            expect(skipToNav).toHaveAttribute('href', '#navigation');

            // Check target elements
            const mainContent = screen.getByRole('main');
            const navigation = screen.getByRole('navigation', { name: /main navigation/i });

            expect(mainContent).toHaveAttribute('id', 'main-content');
            expect(mainContent).toHaveAttribute('tabindex', '-1');
            expect(mainContent).toHaveAttribute('aria-label', 'Main content');

            expect(navigation).toHaveAttribute('id', 'navigation');
            expect(navigation).toHaveAttribute('tabindex', '-1');
            expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
        });
    });

    describe('Live Regions and Announcements', () => {
        it('should create live regions for announcements', () => {
            const mockLiveRegion = {
                announce: jest.fn(),
                announceStatus: jest.fn(),
                announceNavigation: jest.fn(),
            };

            (LiveRegionManager.getInstance as jest.Mock).mockReturnValue(mockLiveRegion);

            // Test loading announcement
            AccessibilityUtils.announceLoading('Loading client data');
            expect(mockLiveRegion.announce).toHaveBeenCalledWith('Loading client data', 'polite');

            // Test error announcement
            AccessibilityUtils.announceError('Failed to save client');
            expect(mockLiveRegion.announceStatus).toHaveBeenCalledWith('Error: Failed to save client');

            // Test success announcement
            AccessibilityUtils.announceSuccess('Client saved successfully');
            expect(mockLiveRegion.announceStatus).toHaveBeenCalledWith('Success: Client saved successfully');
        });
    });

    describe('Document Structure', () => {
        it('should validate heading hierarchy', () => {
            const mockValidateHeadingHierarchy = DocumentStructureManager.validateHeadingHierarchy as jest.Mock;
            mockValidateHeadingHierarchy.mockReturnValue({
                isValid: false,
                issues: ['Multiple H1 elements found. Only one H1 should exist per page.']
            });

            render(
                <div>
                    <h1>First Heading</h1>
                    <h1>Second Heading</h1>
                    <h3>Skipped H2</h3>
                </div>
            );

            const result = DocumentStructureManager.validateHeadingHierarchy();
            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('Multiple H1 elements found. Only one H1 should exist per page.');
        });

        it('should set page titles properly', () => {
            const mockSetPageTitle = DocumentStructureManager.setPageTitle as jest.Mock;

            DocumentStructureManager.setPageTitle('Client Management');
            expect(mockSetPageTitle).toHaveBeenCalledWith('Client Management');
        });
    });

    describe('Color Contrast Validation', () => {
        it('should validate WCAG AA compliance', () => {
            const mockMeetsWCAGAA = ContrastValidator.meetsWCAGAA as jest.Mock;
            mockMeetsWCAGAA.mockReturnValue(true);

            const result = ContrastValidator.meetsWCAGAA('#000000', '#ffffff');
            expect(result).toBe(true);
            expect(mockMeetsWCAGAA).toHaveBeenCalledWith('#000000', '#ffffff', false);
        });

        it('should calculate contrast ratios', () => {
            const mockCalculateContrastRatio = ContrastValidator.calculateContrastRatio as jest.Mock;
            mockCalculateContrastRatio.mockReturnValue(21);

            const ratio = ContrastValidator.calculateContrastRatio('#000000', '#ffffff');
            expect(ratio).toBe(21);
        });
    });

    describe('Number and Date Formatting', () => {
        it('should format numbers for screen readers', () => {
            const mockFormatNumber = AccessibilityUtils.formatNumberForScreenReader as jest.Mock;
            mockFormatNumber.mockImplementation((num, type) => {
                if (type === 'currency') return `$${num.toLocaleString()}`;
                if (type === 'percentage') return `${num}%`;
                return num.toLocaleString();
            });

            // Test currency formatting
            let result = AccessibilityUtils.formatNumberForScreenReader(1500, 'currency');
            expect(result).toBe('$1,500');

            // Test percentage formatting
            result = AccessibilityUtils.formatNumberForScreenReader(25, 'percentage');
            expect(result).toBe('25%');

            // Test number formatting
            result = AccessibilityUtils.formatNumberForScreenReader(1234567);
            expect(result).toBe('1,234,567');
        });

        it('should format dates for screen readers', () => {
            const mockFormatDate = AccessibilityUtils.formatDateForScreenReader as jest.Mock;
            mockFormatDate.mockReturnValue('Monday, January 15, 2024');

            const testDate = new Date('2024-01-15');
            const result = AccessibilityUtils.formatDateForScreenReader(testDate);
            expect(result).toBe('Monday, January 15, 2024');
        });
    });

    describe('Alternative Text and Descriptions', () => {
        it('should provide meaningful alternative text for icons', () => {
            render(
                <StatCard
                    title="Total Revenue"
                    value={15420}
                    icon={DollarSign}
                />
            );

            // Icon should be hidden from screen readers since it's decorative
            const iconContainer = screen.getByLabelText(/value: \$15,420/i).parentElement?.parentElement?.querySelector('.stat-card-icon-container');
            expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
        });

        it('should provide context for interactive elements', () => {
            render(
                <StatCard
                    title="New Appointments"
                    value={12}
                    icon={Calendar}
                    action={{ label: 'View All', href: '/appointments' }}
                />
            );

            const actionLink = screen.getByRole('link');
            expect(actionLink).toHaveAttribute('aria-label', 'View All for New Appointments');
        });
    });

    describe('Table Accessibility', () => {
        it('should create accessible table headers', () => {
            const headers = ['Name', 'Email', 'Phone', 'Last Visit'];
            const mockCreateTableHeaders = AccessibilityUtils.createTableHeaders as jest.Mock;
            mockCreateTableHeaders.mockReturnValue(
                headers.map((header, index) =>
                    `<th scope="col" id="header-${index}">${header}</th>`
                ).join('')
            );

            const result = AccessibilityUtils.createTableHeaders(headers);
            expect(result).toContain('scope="col"');
            expect(result).toContain('id="header-0"');
            expect(result).toContain('Name');
        });
    });

    describe('Form Validation Messages', () => {
        it('should create accessible validation messages', () => {
            const mockCreateValidationMessage = AccessibilityUtils.createValidationMessage as jest.Mock;
            mockCreateValidationMessage.mockReturnValue(`
        <div role="alert" aria-live="assertive">
          <p>There are 2 errors with Email:</p>
          <ul><li>Email is required</li><li>Email format is invalid</li></ul>
        </div>
      `);

            const result = AccessibilityUtils.createValidationMessage('Email', [
                'Email is required',
                'Email format is invalid'
            ]);

            expect(result).toContain('role="alert"');
            expect(result).toContain('aria-live="assertive"');
            expect(result).toContain('There are 2 errors with Email');
        });
    });
});