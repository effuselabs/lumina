import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { MainContentWrapper, NavigationWrapper, SkipLinks } from '@/components/ui/skip-links';
import { useFocusManagement, useKeyboardNavigation } from '@/hooks/use-focus-management';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Edit, Plus, Trash2 } from 'lucide-react';

// Test component for focus management
function TestFocusManagement() {
    const { containerRef, focusFirst, focusLast } = useFocusManagement({
        trapFocus: true,
        restoreFocus: true,
        autoFocus: true
    });

    return (
        <div ref={containerRef} data-testid="focus-container">
            <button onClick={focusFirst}>Focus First</button>
            <button>Middle Button</button>
            <button onClick={focusLast}>Focus Last</button>
        </div>
    );
}

// Test component for keyboard navigation
function TestKeyboardNavigation() {
    const { containerRef } = useKeyboardNavigation({
        direction: 'both',
        wrap: true,
        onEscape: () => console.log('Escape pressed'),
        onEnter: (element) => console.log('Enter pressed on', element),
    });

    return (
        <div ref={containerRef} data-testid="keyboard-nav-container">
            <button>Button 1</button>
            <button>Button 2</button>
            <button>Button 3</button>
            <button>Button 4</button>
        </div>
    );
}

describe('Keyboard Navigation Accessibility', () => {
    describe('Button Component', () => {
        it('should have proper focus indicators', () => {
            render(<Button>Test Button</Button>);
            const button = screen.getByRole('button');

            expect(button).toHaveClass('focus-visible:outline-none');
            expect(button).toHaveClass('focus-visible:ring-2');
            expect(button).toHaveClass('focus-visible:ring-offset-2');
        });

        it('should be keyboard accessible', async () => {
            const user = userEvent.setup();
            const handleClick = jest.fn();

            render(<Button onClick={handleClick}>Test Button</Button>);
            const button = screen.getByRole('button');

            // Tab to button
            await user.tab();
            expect(button).toHaveFocus();

            // Press Enter
            await user.keyboard('{Enter}');
            expect(handleClick).toHaveBeenCalledTimes(1);

            // Press Space
            await user.keyboard(' ');
            expect(handleClick).toHaveBeenCalledTimes(2);
        });

        it('should have proper ARIA attributes', () => {
            render(
                <Button
                    aria-label="Add new item"
                    aria-describedby="button-help"
                    loading={true}
                >
                    <Plus className="h-4 w-4" />
                    Add Item
                </Button>
            );

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', 'Add new item');
            expect(button).toHaveAttribute('aria-describedby', 'button-help');
            expect(button).toHaveAttribute('aria-busy', 'true');
        });

        it('should handle disabled state properly', async () => {
            const user = userEvent.setup();
            const handleClick = jest.fn();

            render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
            const button = screen.getByRole('button');

            expect(button).toBeDisabled();
            expect(button).toHaveAttribute('aria-disabled', 'true');
            expect(button).toHaveAttribute('tabindex', '-1');

            // Should not be focusable
            await user.tab();
            expect(button).not.toHaveFocus();

            // Should not respond to clicks
            await user.click(button);
            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    describe('Form Components', () => {
        it('should have proper form field associations', () => {
            render(
                <FormField
                    label="Email Address"
                    hint="Enter your email address"
                    error="Email is required"
                    required
                >
                    <Input type="email" placeholder="email@example.com" />
                </FormField>
            );

            const input = screen.getByRole('textbox');
            const label = screen.getByText('Email Address');
            // Hint is not rendered when there's an error
            const error = screen.getByText(/Email is required/);

            // Check label association
            expect(label).toHaveAttribute('for', input.id);

            // Check describedby associations
            const describedBy = input.getAttribute('aria-describedby');
            expect(describedBy).toContain(error.id);

            // Check ARIA attributes
            expect(input).toHaveAttribute('aria-invalid', 'true');
            expect(error).toHaveAttribute('role', 'alert');
            expect(error).toHaveAttribute('aria-live', 'assertive');
        });

        it('should handle keyboard navigation in forms', async () => {
            const user = userEvent.setup();

            render(
                <form>
                    <FormField label="First Name">
                        <Input data-testid="first-name" />
                    </FormField>
                    <FormField label="Last Name">
                        <Input data-testid="last-name" />
                    </FormField>
                    <FormField label="Email">
                        <Input type="email" data-testid="email" />
                    </FormField>
                    <Button type="submit">Submit</Button>
                </form>
            );

            const firstName = screen.getByTestId('first-name');
            const lastName = screen.getByTestId('last-name');
            const email = screen.getByTestId('email');
            const submit = screen.getByRole('button');

            // Tab through form elements
            await user.tab();
            expect(firstName).toHaveFocus();

            await user.tab();
            expect(lastName).toHaveFocus();

            await user.tab();
            expect(email).toHaveFocus();

            await user.tab();
            expect(submit).toHaveFocus();
        });
    });

    describe('Page Header Component', () => {
        it('should have proper heading hierarchy', () => {
            render(
                <PageHeader
                    title="Staff Management"
                    subtitle="Team Overview"
                    description="Manage your team members"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Staff' }
                    ]}
                    actions={[
                        { label: 'Add Staff', icon: Plus, primary: true },
                        { label: 'Edit', icon: Edit, variant: 'outline' },
                        { label: 'Delete', icon: Trash2, variant: 'destructive' }
                    ]}
                />
            );

            // Check heading hierarchy
            const title = screen.getByRole('heading', { level: 1 });
            expect(title).toHaveTextContent('Staff Management');

            // Check breadcrumb navigation
            const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
            expect(breadcrumbNav).toBeInTheDocument();

            // Check action group
            const actionGroup = screen.getByRole('group', { name: /page actions/i });
            expect(actionGroup).toBeInTheDocument();

            // Check primary action is marked
            const addButton = screen.getByRole('button', { name: /add staff/i });
            expect(addButton).toHaveAttribute('aria-describedby');
        });

        it('should handle keyboard navigation in actions', async () => {
            const user = userEvent.setup();
            const handleAdd = jest.fn();
            const handleEdit = jest.fn();

            render(
                <PageHeader
                    title="Test Page"
                    actions={[
                        { label: 'Add', onClick: handleAdd, primary: true },
                        { label: 'Edit', onClick: handleEdit, variant: 'outline' }
                    ]}
                />
            );

            const addButton = screen.getByRole('button', { name: /add/i });
            const editButton = screen.getByRole('button', { name: /edit/i });

            // Tab to first action
            await user.tab();
            expect(addButton).toHaveFocus();

            // Tab to second action
            await user.tab();
            expect(editButton).toHaveFocus();

            // Activate with Enter
            await user.keyboard('{Enter}');
            expect(handleEdit).toHaveBeenCalledTimes(1);
        });
    });

    describe('Skip Links', () => {
        it('should render skip links with proper accessibility', () => {
            render(
                <>
                    <SkipLinks />
                    <NavigationWrapper>
                        <nav>Navigation content</nav>
                    </NavigationWrapper>
                    <MainContentWrapper>
                        <h1>Main Content</h1>
                    </MainContentWrapper>
                </>
            );

            // Skip links should be present but hidden
            const skipToMain = screen.getByText('Skip to main content');
            const skipToNav = screen.getByText('Skip to navigation');

            expect(skipToMain).toHaveClass('skip-link');
            expect(skipToNav).toHaveClass('skip-link');

            // Check target elements have proper IDs
            const mainContent = screen.getByRole('main');
            const navigation = screen.getByRole('navigation', { name: /main navigation/i });

            expect(mainContent).toHaveAttribute('id', 'main-content');
            expect(navigation).toHaveAttribute('id', 'navigation');
            expect(mainContent).toHaveAttribute('tabindex', '-1');
            expect(navigation).toHaveAttribute('tabindex', '-1');
        });

        it('should focus target elements when skip links are activated', async () => {
            const user = userEvent.setup();

            render(
                <>
                    <SkipLinks />
                    <MainContentWrapper>
                        <h1>Main Content</h1>
                    </MainContentWrapper>
                </>
            );

            const skipLink = screen.getByText('Skip to main content');
            const mainContent = screen.getByRole('main');

            // Focus skip link
            skipLink.focus();
            expect(skipLink).toHaveFocus();

            // Activate skip link
            await user.keyboard('{Enter}');

            // Main content should receive focus after a delay
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(mainContent).toHaveFocus();
        });
    });

    describe('Focus Management Hook', () => {
        it('should trap focus within container', async () => {
            const user = userEvent.setup();

            render(<TestFocusManagement />);

            const container = screen.getByTestId('focus-container');
            const buttons = screen.getAllByRole('button');

            // Focus the container first (autoFocus: true)
            const container = screen.getByTestId('focus-container');
            container.focus();

            // Then focus first button
            buttons[0].focus();
            expect(buttons[0]).toHaveFocus();

            // Tab to last button
            await user.tab();
            await user.tab();
            expect(buttons[2]).toHaveFocus();

            // Tab should wrap to first button
            await user.tab();
            expect(buttons[0]).toHaveFocus();

            // Shift+Tab should wrap to last button
            await user.keyboard('{Shift>}{Tab}{/Shift}');
            expect(buttons[2]).toHaveFocus();
        });

        it('should provide focus utility functions', async () => {
            const user = userEvent.setup();

            render(<TestFocusManagement />);

            const focusFirstBtn = screen.getByText('Focus First');
            const focusLastBtn = screen.getByText('Focus Last');
            const buttons = screen.getAllByRole('button');

            // Click focus last button
            await user.click(focusLastBtn);
            expect(buttons[2]).toHaveFocus();

            // Click focus first button
            await user.click(focusFirstBtn);
            expect(buttons[0]).toHaveFocus();
        });
    });

    describe('Keyboard Navigation Hook', () => {
        it('should handle arrow key navigation', async () => {
            const user = userEvent.setup();

            render(<TestKeyboardNavigation />);

            const container = screen.getByTestId('keyboard-nav-container');
            const buttons = screen.getAllByRole('button');

            // Focus first button
            buttons[0].focus();
            expect(buttons[0]).toHaveFocus();

            // Arrow down should move to next button
            await user.keyboard('{ArrowDown}');
            expect(buttons[1]).toHaveFocus();

            // Arrow right should also move to next button
            await user.keyboard('{ArrowRight}');
            expect(buttons[2]).toHaveFocus();

            // Arrow up should move to previous button
            await user.keyboard('{ArrowUp}');
            expect(buttons[1]).toHaveFocus();

            // Arrow left should also move to previous button
            await user.keyboard('{ArrowLeft}');
            expect(buttons[0]).toHaveFocus();
        });

        it('should handle Home and End keys', async () => {
            const user = userEvent.setup();

            render(<TestKeyboardNavigation />);

            const buttons = screen.getAllByRole('button');

            // Focus middle button
            buttons[1].focus();
            expect(buttons[1]).toHaveFocus();

            // Home should move to first button
            await user.keyboard('{Home}');
            expect(buttons[0]).toHaveFocus();

            // End should move to last button
            await user.keyboard('{End}');
            expect(buttons[3]).toHaveFocus();
        });

        it('should wrap navigation when enabled', async () => {
            const user = userEvent.setup();

            render(<TestKeyboardNavigation />);

            const buttons = screen.getAllByRole('button');

            // Focus last button
            buttons[3].focus();
            expect(buttons[3]).toHaveFocus();

            // Arrow down should wrap to first button
            await user.keyboard('{ArrowDown}');
            expect(buttons[0]).toHaveFocus();

            // Arrow up should wrap to last button
            await user.keyboard('{ArrowUp}');
            expect(buttons[3]).toHaveFocus();
        });
    });

    describe('Touch Targets', () => {
        it('should have minimum touch target sizes on mobile', () => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            });

            render(
                <div>
                    <Button size="sm">Small Button</Button>
                    <Button>Default Button</Button>
                    <Button size="lg">Large Button</Button>
                </div>
            );

            const buttons = screen.getAllByRole('button');

            buttons.forEach(button => {
                const styles = window.getComputedStyle(button);
                // All buttons should have minimum dimensions (checked via CSS)
                const computedStyle = window.getComputedStyle(button);
                // Note: In actual implementation, touch targets are handled via CSS
                expect(button.className).toContain('min-w-');
            });
        });
    });

    describe('High Contrast Mode', () => {
        it('should enhance focus indicators in high contrast mode', () => {
            // Mock high contrast preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-contrast: high)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });

            render(<Button>High Contrast Button</Button>);
            const button = screen.getByRole('button');

            // Should have enhanced contrast classes
            expect(button).toHaveClass('contrast-more:border-2');
        });
    });

    describe('Reduced Motion', () => {
        it('should respect reduced motion preferences', () => {
            // Mock reduced motion preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });

            render(<Button>Reduced Motion Button</Button>);
            const button = screen.getByRole('button');

            // Should have reduced motion classes
            expect(button).toHaveClass('motion-reduce:transition-none');
            expect(button).toHaveClass('motion-reduce:hover:scale-100');
            expect(button).toHaveClass('motion-reduce:active:scale-100');
        });
    });
});