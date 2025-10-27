import { mockAppointments, mockClients, mockServices, mockStaffMembers } from '@/test-utils/appointment-mocks'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

// Mock API handlers
export const handlers = [
    // Get appointments
    rest.get('/api/appointments', (req: any, res: any, ctx: any) => {
        const url = new URL(req.url)
        const businessId = url.searchParams.get('businessId')
        const searchTerm = url.searchParams.get('searchTerm')
        const staffIds = url.searchParams.getAll('staffIds')
        const serviceIds = url.searchParams.getAll('serviceIds')
        const startDate = url.searchParams.get('startDate')
        const endDate = url.searchParams.get('endDate')

        let filteredAppointments = mockAppointments.filter((apt: any) =>
            apt.businessId === businessId
        )

        // Apply search filter
        if (searchTerm) {
            filteredAppointments = filteredAppointments.filter((apt: any) =>
                apt.client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.services.some(service =>
                    service.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
            )
        }

        // Apply staff filter
        if (staffIds.length > 0) {
            filteredAppointments = filteredAppointments.filter((apt: any) =>
                staffIds.includes(apt.staffId)
            )
        }

        // Apply service filter
        if (serviceIds.length > 0) {
            filteredAppointments = filteredAppointments.filter((apt: any) =>
                apt.services.some(service => serviceIds.includes(service.id))
            )
        }

        // Apply date range filter
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            filteredAppointments = filteredAppointments.filter((apt: any) =>
                apt.startTime >= start && apt.startTime <= end
            )
        }

        return res(
            ctx.status(200),
            ctx.json({
                appointments: filteredAppointments,
                total: filteredAppointments.length
            })
        )
    }),

    // Get single appointment
    rest.get('/api/appointments/:id', (req: any, res: any, ctx: any) => {
        const { id } = req.params
        const appointment = mockAppointments.find((apt: any) => apt.id === id)

        if (!appointment) {
            return res(
                ctx.status(404),
                ctx.json({ error: 'Appointment not found' })
            )
        }

        return res(
            ctx.status(200),
            ctx.json(appointment)
        )
    }),

    // Create appointment
    rest.post('/api/appointments', async (req: any, res: any, ctx: any) => {
        const appointmentData = await req.json()

        // Simulate validation
        if (!appointmentData.client || !appointmentData.serviceId || !appointmentData.staffId) {
            return res(
                ctx.status(400),
                ctx.json({ error: 'Missing required fields' })
            )
        }

        // Simulate conflict checking
        const hasConflict = mockAppointments.some(apt =>
            apt.staffId === appointmentData.staffId &&
            apt.startTime <= new Date(appointmentData.endTime) &&
            apt.endTime >= new Date(appointmentData.startTime)
        )

        if (hasConflict) {
            return res(
                ctx.status(409),
                ctx.json({
                    error: 'Scheduling conflict',
                    conflicts: ['existing-appointment-1'],
                    suggestions: [
                        {
                            startTime: new Date('2024-01-15T12:00:00'),
                            endTime: new Date('2024-01-15T13:00:00')
                        }
                    ]
                })
            )
        }

        const newAppointment = {
            id: `appointment-${Date.now()}`,
            businessId: appointmentData.businessId,
            ...appointmentData,
            startTime: new Date(appointmentData.startTime),
            endTime: new Date(appointmentData.endTime),
            createdAt: new Date(),
            updatedAt: new Date()
        }

        return res(
            ctx.status(201),
            ctx.json(newAppointment)
        )
    }),

    // Update appointment
    rest.put('/api/appointments/:id', async (req: any, res: any, ctx: any) => {
        const { id } = req.params
        const updateData = await req.json()

        const appointmentIndex = mockAppointments.findIndex(apt => apt.id === id)
        if (appointmentIndex === -1) {
            return res(
                ctx.status(404),
                ctx.json({ error: 'Appointment not found' })
            )
        }

        // Simulate conflict checking for reschedule
        if (updateData.startTime || updateData.endTime) {
            const hasConflict = mockAppointments.some(apt =>
                apt.id !== id &&
                apt.staffId === (updateData.staffId || mockAppointments[appointmentIndex].staffId) &&
                new Date(apt.startTime) <= new Date(updateData.endTime || mockAppointments[appointmentIndex].endTime) &&
                new Date(apt.endTime) >= new Date(updateData.startTime || mockAppointments[appointmentIndex].startTime)
            )

            if (hasConflict) {
                return res(
                    ctx.status(409),
                    ctx.json({
                        error: 'Scheduling conflict',
                        conflicts: ['existing-appointment-2']
                    })
                )
            }
        }

        const updatedAppointment = {
            ...mockAppointments[appointmentIndex],
            ...updateData,
            updatedAt: new Date()
        }

        return res(
            ctx.status(200),
            ctx.json(updatedAppointment)
        )
    }),

    // Delete appointment
    rest.delete('/api/appointments/:id', (req: any, res: any, ctx: any) => {
        const { id } = req.params
        const appointmentIndex = mockAppointments.findIndex(apt => apt.id === id)

        if (appointmentIndex === -1) {
            return res(
                ctx.status(404),
                ctx.json({ error: 'Appointment not found' })
            )
        }

        return res(
            ctx.status(200),
            ctx.json({ success: true })
        )
    }),

    // Check availability
    rest.post('/api/appointments/check-availability', async (req: any, res: any, ctx: any) => {
        const { staffId, startTime, endTime, excludeAppointmentId } = await req.json()

        const hasConflict = mockAppointments.some(apt =>
            apt.id !== excludeAppointmentId &&
            apt.staffId === staffId &&
            new Date(apt.startTime) <= new Date(endTime) &&
            new Date(apt.endTime) >= new Date(startTime)
        )

        if (hasConflict) {
            return res(
                ctx.status(200),
                ctx.json({
                    available: false,
                    conflicts: ['existing-appointment-1'],
                    suggestions: [
                        {
                            startTime: new Date('2024-01-15T12:00:00'),
                            endTime: new Date('2024-01-15T13:00:00')
                        },
                        {
                            startTime: new Date('2024-01-15T14:00:00'),
                            endTime: new Date('2024-01-15T15:00:00')
                        }
                    ]
                })
            )
        }

        return res(
            ctx.status(200),
            ctx.json({ available: true })
        )
    }),

    // Get staff members
    rest.get('/api/staff', (req: any, res: any, ctx: any) => {
        const url = new URL(req.url)
        const businessId = url.searchParams.get('businessId')

        const filteredStaff = mockStaffMembers.filter(staff =>
            staff.businessId === businessId
        )

        return res(
            ctx.status(200),
            ctx.json(filteredStaff)
        )
    }),

    // Get services
    rest.get('/api/services', (req: any, res: any, ctx: any) => {
        const url = new URL(req.url)
        const businessId = url.searchParams.get('businessId')

        const filteredServices = mockServices.filter(service =>
            service.businessId === businessId
        )

        return res(
            ctx.status(200),
            ctx.json(filteredServices)
        )
    }),

    // Get clients
    rest.get('/api/clients', (req: any, res: any, ctx: any) => {
        const url = new URL(req.url)
        const businessId = url.searchParams.get('businessId')
        const searchTerm = url.searchParams.get('searchTerm')

        let filteredClients = mockClients.filter(client =>
            client.businessId === businessId
        )

        if (searchTerm) {
            filteredClients = filteredClients.filter(client =>
                client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        return res(
            ctx.status(200),
            ctx.json(filteredClients)
        )
    }),

    // Bulk operations
    rest.post('/api/appointments/bulk-update', async (req: any, res: any, ctx: any) => {
        const { appointmentIds, updateData } = await req.json()

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000))

        const updatedAppointments = appointmentIds.map((id: string) => ({
            id,
            ...updateData,
            updatedAt: new Date()
        }))

        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                updatedCount: appointmentIds.length,
                appointments: updatedAppointments
            })
        )
    }),

    rest.post('/api/appointments/bulk-delete', async (req: any, res: any, ctx: any) => {
        const { appointmentIds } = await req.json()

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800))

        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                deletedCount: appointmentIds.length
            })
        )
    }),

    // Error simulation handlers
    rest.get('/api/appointments/error', (req: any, res: any, ctx: any) => {
        return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
        )
    }),

    rest.post('/api/appointments/network-error', (req: any, res: any, ctx: any) => {
        return res.networkError('Network connection failed')
    }),

    // WebSocket simulation (for testing purposes)
    rest.get('/api/appointments/websocket-token', (req: any, res: any, ctx: any) => {
        return res(
            ctx.status(200),
            ctx.json({ token: 'mock-websocket-token' })
        )
    })
]

// Create server instance
export const server = setupServer(...handlers)

// Helper functions for test scenarios
export const simulateNetworkError = () => {
    server.use(
        rest.get('/api/appointments', (req: any, res: any, ctx: any) => {
            return res.networkError('Network connection failed')
        })
    )
}

export const simulateServerError = () => {
    server.use(
        rest.get('/api/appointments', (req: any, res: any, ctx: any) => {
            return res(
                ctx.status(500),
                ctx.json({ error: 'Internal server error' })
            )
        })
    )
}

export const simulateSlowResponse = (delay: number = 2000) => {
    server.use(
        rest.get('/api/appointments', (req: any, res: any, ctx: any) => {
            return res(
                ctx.delay(delay),
                ctx.status(200),
                ctx.json({
                    appointments: mockAppointments,
                    total: mockAppointments.length
                })
            )
        })
    )
}

export const resetToDefaultHandlers = () => {
    server.resetHandlers(...handlers)
}