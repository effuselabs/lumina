import AppointmentDashboard from '@/components/appointments/appointment-dashboard'
import { mockAppointments } from '@/test-utils/appointment-mocks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Mock API calls
const mockApiCalls = {
    createAppointment: jest.fn(),
    updateAppointment: jest.fn(),
    deleteAppointment: jest.fn(),
    getAppointments: jest.fn(),
    checkAvailability: jest.fn()
}

jest.mock('@/lib/services/appointment-service', () => ({
    appointmentService: mockApiCalls
}))

const mockSession = {
    user: {
        id: 'user-1',
        businessId: 'business-1',
        role: 'manager'
    }
}

const renderIntegrationTest = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <SessionProvider session={mockSession}>
                <DndProvider backend={HTML5Backend}>
                    {component}
                </DndProvider>
            </SessionProvider>
        </QueryClientProvider>
    )
}

describe('Appointment Management Workflows', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockApiCalls.getAppointments.mockResolvedValue(mockAppointments)
        mockApiCalls.checkAvailability.mockResolvedValue({ available: true })
    })

    describe('Complete Appointment Creation Workflow', () => {
        it('should create new appointment from time slot click', async () => {
            mockApiCalls.createAppointment.mockResolvedValue({
                id: 'new-appointment',
                ...mockAppointments[0]
            })

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            // Wait for initial load
            await waitFor(() => {
                expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
            })

            // Click on empty time slot
            const emptySlot = screen.getByTestId('time-slot-11-00')
            fireEvent.click(emptySlot)

            // Modal should open in create mode
            await waitFor(() => {
                expect(screen.getByText('New Appointment')).toBeInTheDocument()
            })

            // Fill appointment form
            fireEvent.change(screen.getByLabelText(/client/i), {
                target: { value: 'Jane Smith' }
            })
            fireEvent.change(screen.getByLabelText(/service/i), {
                target: { value: 'service-1' }
            })
            fireEvent.change(screen.getByLabelText(/staff member/i), {
                target: { value: 'staff-1' }
            })

            // Create appointment
            fireEvent.click(screen.getByRole('button', { name: /create/i }))

            // Verify API call
            await waitFor(() => {
                expect(mockApiCalls.createAppointment).toHaveBeenCalledWith(
                    expect.objectContaining({
                        client: expect.objectContaining({ firstName: 'Jane', lastName: 'Smith' }),
                        serviceId: 'service-1',
                        staffId: 'staff-1',
                        startTime: expect.any(Date),
                        endTime: expect.any(Date)
                    })
                )
            })

            // Modal should close and calendar should refresh
            await waitFor(() => {
                expect(screen.queryByText('New Appointment')).not.toBeInTheDocument()
            })
        })

        it('should handle appointment creation with conflicts', async () => {
            mockApiCalls.checkAvailability.mockResolvedValue({
                available: false,
                conflicts: ['existing-appointment-1'],
                suggestions: [
                    { startTime: new Date('2024-01-15T12:00:00'), endTime: new Date('2024-01-15T13:00:00') }
                ]
            })

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
            })

            // Click on conflicting time slot
            const conflictSlot = screen.getByTestId('time-slot-10-00')
            fireEvent.click(conflictSlot)

            await waitFor(() => {
                expect(screen.getByText('New Appointment')).toBeInTheDocument()
            })

            // Fill form
            fireEvent.change(screen.getByLabelText(/client/i), { target: { value: 'Jane Smith' } })
            fireEvent.change(screen.getByLabelText(/service/i), { target: { value: 'service-1' } })
            fireEvent.change(screen.getByLabelText(/staff member/i), { target: { value: 'staff-1' } })

            // Try to create
            fireEvent.click(screen.getByRole('button', { name: /create/i }))

            // Should show conflict warning
            await waitFor(() => {
                expect(screen.getByText(/time slot conflicts/i)).toBeInTheDocument()
                expect(screen.getByText(/suggested times/i)).toBeInTheDocument()
            })

            // Select suggested time
            fireEvent.click(screen.getByText('12:00 PM'))

            // Create with new time
            fireEvent.click(screen.getByRole('button', { name: /create/i }))

            await waitFor(() => {
                expect(mockApiCalls.createAppointment).toHaveBeenCalled()
            })
        })
    })

    describe('Appointment Editing Workflow', () => {
        it('should edit existing appointment', async () => {
            mockApiCalls.updateAppointment.mockResolvedValue({
                ...mockAppointments[0],
                notes: 'Updated notes'
            })

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })

            // Click on appointment
            fireEvent.click(screen.getByTestId('appointment-block-1'))

            // Modal opens in view mode
            await waitFor(() => {
                expect(screen.getByText('Appointment Details')).toBeInTheDocument()
            })

            // Switch to edit mode
            fireEvent.click(screen.getByRole('button', { name: /edit/i }))

            await waitFor(() => {
                expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
            })

            // Update notes
            fireEvent.change(screen.getByLabelText(/notes/i), {
                target: { value: 'Updated notes' }
            })

            // Save changes
            fireEvent.click(screen.getByRole('button', { name: /save/i }))

            // Verify API call
            await waitFor(() => {
                expect(mockApiCalls.updateAppointment).toHaveBeenCalledWith(
                    'appointment-1',
                    expect.objectContaining({
                        notes: 'Updated notes'
                    })
                )
            })

            // Modal should close
            await waitFor(() => {
                expect(screen.queryByText('Appointment Details')).not.toBeInTheDocument()
            })
        })

        it('should handle service change with price recalculation', async () => {
            const updatedAppointment = {
                ...mockAppointments[0],
                services: [{ id: 'service-2', name: 'Color Treatment', price: 75, duration: 90 }],
                totalPrice: 75,
                totalDuration: 90
            }
            mockApiCalls.updateAppointment.mockResolvedValue(updatedAppointment)

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })

            // Open appointment and edit
            fireEvent.click(screen.getByTestId('appointment-block-1'))
            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /edit/i }))
            })

            // Change service
            await waitFor(() => {
                const serviceSelect = screen.getByLabelText(/service/i)
                fireEvent.change(serviceSelect, { target: { value: 'service-2' } })
            })

            // Price should update automatically
            await waitFor(() => {
                expect(screen.getByText('$75.00')).toBeInTheDocument()
                expect(screen.getByText('90 minutes')).toBeInTheDocument()
            })

            // Save changes
            fireEvent.click(screen.getByRole('button', { name: /save/i }))

            await waitFor(() => {
                expect(mockApiCalls.updateAppointment).toHaveBeenCalledWith(
                    'appointment-1',
                    expect.objectContaining({
                        services: expect.arrayContaining([
                            expect.objectContaining({ id: 'service-2' })
                        ]),
                        totalPrice: 75,
                        totalDuration: 90
                    })
                )
            })
        })
    })

    describe('Drag-and-Drop Rescheduling Workflow', () => {
        it('should reschedule appointment via drag and drop', async () => {
            const rescheduledAppointment = {
                ...mockAppointments[0],
                startTime: new Date('2024-01-15T11:00:00'),
                endTime: new Date('2024-01-15T12:00:00')
            }
            mockApiCalls.updateAppointment.mockResolvedValue(rescheduledAppointment)

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })

            // Drag appointment to new time slot
            const appointment = screen.getByTestId('appointment-block-1')
            const targetSlot = screen.getByTestId('time-slot-11-00')

            fireEvent.dragStart(appointment)
            fireEvent.dragOver(targetSlot)
            fireEvent.drop(targetSlot)

            // Should show confirmation dialog
            await waitFor(() => {
                expect(screen.getByText(/confirm reschedule/i)).toBeInTheDocument()
            })

            // Confirm reschedule
            fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

            // Verify API call
            await waitFor(() => {
                expect(mockApiCalls.updateAppointment).toHaveBeenCalledWith(
                    'appointment-1',
                    expect.objectContaining({
                        startTime: expect.any(Date),
                        endTime: expect.any(Date)
                    })
                )
            })
        })

        it('should handle drag and drop with conflicts', async () => {
            mockApiCalls.checkAvailability.mockResolvedValue({
                available: false,
                conflicts: ['existing-appointment-2']
            })

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })

            // Drag to conflicting slot
            const appointment = screen.getByTestId('appointment-block-1')
            const conflictSlot = screen.getByTestId('time-slot-10-30')

            fireEvent.dragStart(appointment)
            fireEvent.dragOver(conflictSlot)
            fireEvent.drop(conflictSlot)

            // Should show conflict warning
            await waitFor(() => {
                expect(screen.getByText(/scheduling conflict/i)).toBeInTheDocument()
            })

            // Should revert to original position
            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })
        })
    })

    describe('Appointment Cancellation Workflow', () => {
        it('should cancel appointment with confirmation', async () => {
            mockApiCalls.deleteAppointment.mockResolvedValue({ success: true })

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })

            // Open appointment
            fireEvent.click(screen.getByTestId('appointment-block-1'))

            await waitFor(() => {
                expect(screen.getByText('Appointment Details')).toBeInTheDocument()
            })

            // Click cancel button
            fireEvent.click(screen.getByRole('button', { name: /cancel appointment/i }))

            // Confirmation dialog should appear
            await waitFor(() => {
                expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
            })

            // Confirm cancellation
            fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

            // Verify API call
            await waitFor(() => {
                expect(mockApiCalls.deleteAppointment).toHaveBeenCalledWith('appointment-1')
            })

            // Appointment should be removed from calendar
            await waitFor(() => {
                expect(screen.queryByTestId('appointment-block-1')).not.toBeInTheDocument()
            })
        })
    })

    describe('Search and Filter Workflow', () => {
        it('should filter appointments by search term', async () => {
            const filteredAppointments = [mockAppointments[0]]
            mockApiCalls.getAppointments.mockResolvedValue(filteredAppointments)

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
            })

            // Enter search term
            const searchInput = screen.getByPlaceholderText(/search appointments/i)
            fireEvent.change(searchInput, { target: { value: 'John Doe' } })

            // Should trigger API call with filter
            await waitFor(() => {
                expect(mockApiCalls.getAppointments).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchTerm: 'John Doe'
                    })
                )
            })

            // Should show filtered results
            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
                expect(screen.queryByTestId('appointment-block-2')).not.toBeInTheDocument()
            })
        })

        it('should combine multiple filters', async () => {
            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
            })

            // Apply staff filter
            const staffFilter = screen.getByTestId('staff-filter')
            fireEvent.change(staffFilter, { target: { value: 'staff-1' } })

            // Apply service filter
            const serviceFilter = screen.getByTestId('service-filter')
            fireEvent.change(serviceFilter, { target: { value: 'service-1' } })

            // Should trigger API call with combined filters
            await waitFor(() => {
                expect(mockApiCalls.getAppointments).toHaveBeenCalledWith(
                    expect.objectContaining({
                        staffIds: ['staff-1'],
                        serviceIds: ['service-1']
                    })
                )
            })
        })
    })

    describe('Real-time Updates Workflow', () => {
        it('should handle real-time appointment updates', async () => {
            const { rerender } = renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument()
            })

            // Simulate real-time update
            const updatedAppointments = [
                {
                    ...mockAppointments[0],
                    client: { ...mockAppointments[0].client, firstName: 'Johnny' }
                },
                ...mockAppointments.slice(1)
            ]

            mockApiCalls.getAppointments.mockResolvedValue(updatedAppointments)

            // Trigger re-render with updated data
            rerender(<AppointmentDashboard businessId="business-1" />)

            // Should show updated appointment
            await waitFor(() => {
                expect(screen.getByText('Johnny Doe')).toBeInTheDocument()
            })
        })

        it('should handle new appointment notifications', async () => {
            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
            })

            // Simulate new appointment notification
            const newAppointment = {
                id: 'new-appointment',
                client: { firstName: 'New', lastName: 'Client' },
                startTime: new Date('2024-01-15T14:00:00'),
                endTime: new Date('2024-01-15T15:00:00')
            }

            const updatedAppointments = [...mockAppointments, newAppointment]
            mockApiCalls.getAppointments.mockResolvedValue(updatedAppointments)

            // Should show notification
            await waitFor(() => {
                expect(screen.getByText(/new appointment/i)).toBeInTheDocument()
            })
        })
    })

    describe('Error Handling Workflows', () => {
        it('should handle API errors gracefully', async () => {
            mockApiCalls.createAppointment.mockRejectedValue(new Error('Server error'))

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            await waitFor(() => {
                expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
            })

            // Try to create appointment
            const emptySlot = screen.getByTestId('time-slot-11-00')
            fireEvent.click(emptySlot)

            await waitFor(() => {
                fireEvent.change(screen.getByLabelText(/client/i), { target: { value: 'Jane Smith' } })
                fireEvent.change(screen.getByLabelText(/service/i), { target: { value: 'service-1' } })
                fireEvent.click(screen.getByRole('button', { name: /create/i }))
            })

            // Should show error message
            await waitFor(() => {
                expect(screen.getByText(/failed to create appointment/i)).toBeInTheDocument()
            })

            // Should provide retry option
            expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
        })

        it('should handle network connectivity issues', async () => {
            mockApiCalls.getAppointments.mockRejectedValue(new Error('Network error'))

            renderIntegrationTest(<AppointmentDashboard businessId="business-1" />)

            // Should show offline indicator
            await waitFor(() => {
                expect(screen.getByText(/offline/i)).toBeInTheDocument()
            })

            // Should provide refresh option
            expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
        })
    })
})