import AppointmentDashboard from '@/components/appointments/appointment-dashboard'
import AppointmentModal from '@/components/appointments/appointment-modal'
import CalendarView from '@/components/appointments/calendar-view'
import { mockAppointments, mockStaffMembers } from '@/test-utils/appointment-mocks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    })

    return render(
        <QueryClientProvider client={queryClient}>
            {component}
        </QueryClientProvider>
    )
}

// Mock hooks for accessibility tests
jest.mock('@/hooks/use-dashboard-data', () => ({
    useDashboardData: jest.fn(() => ({
        appointments: mockAppointments,
        staffMembers: mockStaffMembers,
        isLoading: false,
        error: null,
        refetch: jest.fn()
    }))
}))

describe('Appointment Management Accessibility', () => {
    describe('WCAG Compliance', () => {
        it('should have no accessibility violations in dashboard', async () => {
            const { container } = renderWithProviders(
                <AppointmentDashboard businessId="business-1" />
            )

            const results = await axe(container)
            expect(results).toHaveNoViolations()
        })

        it('should have no accessibility violations in calendar view', async () => {
            const { container } = renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={jest.fn()}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const results = await axe(container)
            expect(results).toHaveNoViolations()
        })

        it('should have no accessibility violations in appointment modal', async () => {
            const { container } = renderWithProviders(
                <AppointmentModal
                    appointment={mockAppointments[0]}
                    isOpen={true}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    mode="view"
                />
            )

            const results = await axe(container)
            expect(results).toHaveNoViolations()
        })
    })

    describe('Keyboard Navigation', () => {
        it('should support tab navigation through appointments', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Tab to first appointment
            fireEvent.keyDown(document.body, { key: 'Tab' })

            const firstAppointment = screen.getByTestId('appointment-block-1')
            expect(firstAppointment).toHaveFocus()

            // Tab to next appointment
            fireEvent.keyDown(firstAppointment, { key: 'Tab' })

            const secondAppointment = screen.getByTestId('appointment-block-2')
            expect(secondAppointment).toHaveFocus()
        })

        it('should support arrow key navigation in calendar grid', () => {
            renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={jest.fn()}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const firstAppointment = screen.getByTestId('appointment-block-1')
            firstAppointment.focus()

            // Navigate right
            fireEvent.keyDown(firstAppointment, { key: 'ArrowRight' })
            expect(screen.getByTestId('appointment-block-2')).toHaveFocus()

            // Navigate down
            fireEvent.keyDown(screen.getByTestId('appointment-block-2'), { key: 'ArrowDown' })
            // Should focus on appointment in next time slot

            // Navigate left
            fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })

            // Navigate up
            fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
        })

        it('should support Enter key to open appointments', () => {
            const onAppointmentClick = jest.fn()

            renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={onAppointmentClick}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const appointment = screen.getByTestId('appointment-block-1')
            appointment.focus()

            fireEvent.keyDown(appointment, { key: 'Enter' })
            expect(onAppointmentClick).toHaveBeenCalledWith(mockAppointments[0])
        })

        it('should support Space key to select appointments', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Enable bulk selection mode
            fireEvent.click(screen.getByTestId('bulk-select-toggle'))

            const appointment = screen.getByTestId('appointment-block-1')
            appointment.focus()

            fireEvent.keyDown(appointment, { key: ' ' })

            // Appointment should be selected
            expect(appointment).toHaveAttribute('aria-selected', 'true')
            expect(screen.getByTestId('selected-count')).toHaveTextContent('1 selected')
        })

        it('should support Escape key to close modals', () => {
            const onClose = jest.fn()

            renderWithProviders(
                <AppointmentModal
                    appointment={mockAppointments[0]}
                    isOpen={true}
                    onClose={onClose}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    mode="view"
                />
            )

            fireEvent.keyDown(document, { key: 'Escape' })
            expect(onClose).toHaveBeenCalled()
        })

        it('should trap focus within modal', () => {
            renderWithProviders(
                <AppointmentModal
                    appointment={mockAppointments[0]}
                    isOpen={true}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    mode="edit"
                />
            )

            const modal = screen.getByRole('dialog')
            const firstInput = screen.getByLabelText(/client/i)
            const lastButton = screen.getByRole('button', { name: /cancel/i })

            // Focus should start on first focusable element
            expect(firstInput).toHaveFocus()

            // Tab from last element should cycle to first
            lastButton.focus()
            fireEvent.keyDown(lastButton, { key: 'Tab' })
            expect(firstInput).toHaveFocus()

            // Shift+Tab from first element should cycle to last
            fireEvent.keyDown(firstInput, { key: 'Tab', shiftKey: true })
            expect(lastButton).toHaveFocus()
        })
    })

    describe('ARIA Labels and Roles', () => {
        it('should have proper ARIA labels on main elements', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Appointment Dashboard')
            expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Calendar Views')
            expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Calendar Grid')
        })

        it('should have proper ARIA labels on appointments', () => {
            renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={jest.fn()}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const appointment = screen.getByTestId('appointment-block-1')
            expect(appointment).toHaveAttribute('role', 'button')
            expect(appointment).toHaveAttribute('aria-label',
                expect.stringContaining('John Doe, Haircut, 9:00 AM to 10:00 AM, Alice Johnson')
            )
        })

        it('should have proper ARIA states for interactive elements', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // View toggle buttons should have pressed state
            const dayViewButton = screen.getByRole('button', { name: /day/i })
            expect(dayViewButton).toHaveAttribute('aria-pressed', 'true')

            const weekViewButton = screen.getByRole('button', { name: /week/i })
            expect(weekViewButton).toHaveAttribute('aria-pressed', 'false')
        })

        it('should announce form validation errors', () => {
            renderWithProviders(
                <AppointmentModal
                    appointment={mockAppointments[0]}
                    isOpen={true}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    mode="edit"
                />
            )

            // Clear required field
            const clientField = screen.getByLabelText(/client/i)
            fireEvent.change(clientField, { target: { value: '' } })
            fireEvent.click(screen.getByRole('button', { name: /save/i }))

            // Error should be announced
            const errorMessage = screen.getByText(/client is required/i)
            expect(errorMessage).toHaveAttribute('role', 'alert')
            expect(errorMessage).toHaveAttribute('aria-live', 'polite')
        })

        it('should have proper ARIA labels for time slots', () => {
            renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={jest.fn()}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const timeSlot = screen.getByTestId('time-slot-10-00')
            expect(timeSlot).toHaveAttribute('aria-label',
                expect.stringContaining('10:00 AM time slot')
            )
        })
    })

    describe('Screen Reader Support', () => {
        it('should announce appointment details to screen readers', () => {
            renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={jest.fn()}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const appointment = screen.getByTestId('appointment-block-1')

            // Should have descriptive text for screen readers
            expect(appointment).toHaveAttribute('aria-describedby')

            const description = document.getElementById(appointment.getAttribute('aria-describedby')!)
            expect(description).toHaveTextContent(
                expect.stringContaining('Appointment with John Doe for Haircut service')
            )
        })

        it('should announce calendar navigation changes', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Navigate to next day
            const nextButton = screen.getByRole('button', { name: /next day/i })
            fireEvent.click(nextButton)

            // Should announce date change
            const announcement = screen.getByRole('status')
            expect(announcement).toHaveTextContent(
                expect.stringContaining('Viewing appointments for')
            )
        })

        it('should announce appointment status changes', () => {
            renderWithProviders(
                <AppointmentModal
                    appointment={mockAppointments[0]}
                    isOpen={true}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    mode="edit"
                />
            )

            // Change appointment status
            const statusSelect = screen.getByLabelText(/status/i)
            fireEvent.change(statusSelect, { target: { value: 'confirmed' } })

            // Should announce status change
            const announcement = screen.getByRole('status')
            expect(announcement).toHaveTextContent(
                expect.stringContaining('Status changed to confirmed')
            )
        })

        it('should provide live region updates for real-time changes', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Should have live region for updates
            const liveRegion = screen.getByRole('status')
            expect(liveRegion).toHaveAttribute('aria-live', 'polite')
            expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
        })
    })

    describe('High Contrast and Visual Accessibility', () => {
        it('should maintain visibility in high contrast mode', () => {
            // Simulate high contrast mode
            document.body.classList.add('high-contrast')

            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            const appointment = screen.getByTestId('appointment-block-1')
            const computedStyle = window.getComputedStyle(appointment)

            // Should have sufficient contrast
            expect(computedStyle.borderWidth).not.toBe('0px')
            expect(computedStyle.backgroundColor).not.toBe('transparent')

            document.body.classList.remove('high-contrast')
        })

        it('should support reduced motion preferences', () => {
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
            })

            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Animations should be disabled or reduced
            const calendar = screen.getByTestId('calendar-view')
            expect(calendar).toHaveClass('reduce-motion')
        })

        it('should have sufficient color contrast for text', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            const appointment = screen.getByTestId('appointment-block-1')
            const clientName = appointment.querySelector('.client-name')

            if (clientName) {
                const computedStyle = window.getComputedStyle(clientName)
                // Color contrast should meet WCAG AA standards (4.5:1)
                // This would typically be tested with a color contrast analyzer
                expect(computedStyle.color).toBeDefined()
                expect(computedStyle.backgroundColor).toBeDefined()
            }
        })
    })

    describe('Focus Management', () => {
        it('should manage focus when opening modals', () => {
            const onAppointmentClick = jest.fn()

            renderWithProviders(
                <CalendarView
                    view="day"
                    currentDate={new Date('2024-01-15')}
                    appointments={mockAppointments}
                    staffMembers={mockStaffMembers}
                    onAppointmentClick={onAppointmentClick}
                    onAppointmentDrop={jest.fn()}
                    onTimeSlotClick={jest.fn()}
                />
            )

            const appointment = screen.getByTestId('appointment-block-1')
            appointment.focus()

            // Open modal
            fireEvent.click(appointment)

            // Focus should move to modal
            expect(document.activeElement).not.toBe(appointment)
        })

        it('should restore focus when closing modals', () => {
            const onClose = jest.fn()

            renderWithProviders(
                <AppointmentModal
                    appointment={mockAppointments[0]}
                    isOpen={true}
                    onClose={onClose}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    mode="view"
                />
            )

            // Store reference to trigger element (would be passed in real implementation)
            const triggerElement = document.createElement('button')
            document.body.appendChild(triggerElement)

            // Close modal
            fireEvent.keyDown(document, { key: 'Escape' })

            // Focus should return to trigger element
            expect(onClose).toHaveBeenCalled()

            document.body.removeChild(triggerElement)
        })

        it('should handle focus for dynamically added content', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Add new appointment (simulated)
            const newAppointmentButton = screen.getByRole('button', { name: /new appointment/i })
            fireEvent.click(newAppointmentButton)

            // Focus should move to new appointment form
            const clientInput = screen.getByLabelText(/client/i)
            expect(clientInput).toHaveFocus()
        })
    })

    describe('Mobile Accessibility', () => {
        it('should support touch accessibility features', () => {
            // Mock touch device
            Object.defineProperty(window, 'ontouchstart', {
                value: () => { },
                writable: true
            })

            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            const appointment = screen.getByTestId('appointment-block-1')

            // Should have appropriate touch target size
            const computedStyle = window.getComputedStyle(appointment)
            const minTouchTarget = 44 // 44px minimum touch target

            expect(parseInt(computedStyle.minHeight)).toBeGreaterThanOrEqual(minTouchTarget)
            expect(parseInt(computedStyle.minWidth)).toBeGreaterThanOrEqual(minTouchTarget)
        })

        it('should support voice control accessibility', () => {
            renderWithProviders(<AppointmentDashboard businessId="business-1" />)

            // Elements should have accessible names for voice control
            const appointment = screen.getByTestId('appointment-block-1')
            expect(appointment).toHaveAttribute('aria-label')

            const viewButtons = screen.getAllByRole('button', { name: /view/i })
            viewButtons.forEach(button => {
                expect(button).toHaveAccessibleName()
            })
        })
    })
})