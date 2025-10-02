
jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    prisma: {
        appointment: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
        },
        staff: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        client: {
            findFirst: jest.fn(),
        },
        service: {
            findMany: jest.fn(),
        },
        staffService: {
            findMany: jest.fn(),
        },
        appointmentService: {
            findMany: jest.fn(),
            createMany: jest.fn(),
            deleteMany: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
    },
}))

import { prisma } from '@/lib/prisma'
import { AppointmentRepository } from '@/lib/repositories/appointment-repository'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('AppointmentRepository', () => {
    let repository: AppointmentRepository
    const mockBusinessId = 'business-123'
    const mockStaffId = 'staff-123'
    const mockClientId = 'client-123'

    beforeEach(() => {
        jest.clearAllMocks()
        repository = new AppointmentRepository()
    })

    describe('create', () => {
        const mockAppointmentData = {
            businessId: mockBusinessId,
            clientId: mockClientId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            totalDuration: 60,
            totalPrice: 100,
            services: [
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                }
            ]
        }

        const mockCreatedAppointment = {
            id: 'appointment-123',
            ...mockAppointmentData,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        it('should create an appointment with services', async () => {
            // Mock staff validation
            asMock(mockPrisma.staff.findFirst).mockResolvedValue({ id: mockStaffId, businessId: mockBusinessId } as any)
            // Mock client validation
            asMock(mockPrisma.client.findFirst).mockResolvedValue({ id: mockClientId, businessId: mockBusinessId } as any)
            // Mock appointment creation
            asMock(mockPrisma.appointment.create).mockResolvedValue(mockCreatedAppointment as any)

            const result = await repository.create(mockAppointmentData)

            expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    clientId: mockClientId,
                    staffId: mockStaffId,
                    userId: undefined,
                    startTime: mockAppointmentData.startTime,
                    endTime: mockAppointmentData.endTime,
                    totalDuration: 60,
                    totalPrice: 100,
                    clientName: undefined,
                    clientEmail: undefined,
                    clientPhone: undefined,
                    notes: undefined,
                    internalNotes: undefined,
                    depositAmount: undefined,
                    depositPaid: false,
                    services: {
                        create: mockAppointmentData.services.map(service => ({
                            serviceId: service.serviceId,
                            serviceName: service.serviceName,
                            price: service.price,
                            duration: service.duration,
                            serviceOrder: service.serviceOrder,
                            startOffset: 0,
                            assignedStaffId: undefined
                        }))
                    }
                },
                include: {
                    client: true,
                    staff: {
                        include: {
                            user: true
                        }
                    },
                    services: {
                        include: {
                            service: true
                        },
                        orderBy: {
                            serviceOrder: 'asc'
                        }
                    },
                    transactions: true
                }
            })
            expect(result).toEqual(mockCreatedAppointment)
        })
    })

    describe('findById', () => {
        const mockAppointment = {
            id: 'appointment-123',
            businessId: mockBusinessId,
            client: { firstName: 'John', lastName: 'Doe' },
            staff: { user: { name: 'Jane Stylist' } },
            services: [{ serviceName: 'Haircut' }]
        }

        it('should find appointment by id with business validation', async () => {
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(mockAppointment as any)

            const result = await repository.findById('appointment-123', mockBusinessId)

            expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'appointment-123',
                    businessId: mockBusinessId
                },
                include: {
                    client: true,
                    staff: {
                        include: {
                            user: true
                        }
                    },
                    services: {
                        include: {
                            service: true
                        },
                        orderBy: {
                            serviceOrder: 'asc'
                        }
                    },
                    transactions: true
                }
            })
            expect(result).toEqual(mockAppointment)
        })

        it('should return null if appointment not found', async () => {
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(null)

            const result = await repository.findById('nonexistent', mockBusinessId)

            expect(result).toBeNull()
        })
    })

    describe('update', () => {
        const updateData = {
            status: 'CONFIRMED' as const,
            totalPrice: 120
        }

        const mockUpdatedAppointment = {
            id: 'appointment-123',
            ...updateData,
            businessId: mockBusinessId
        }

        it('should update appointment with business validation', async () => {
            // Mock findById for validation
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue({ id: 'appointment-123', businessId: mockBusinessId } as any)
            // Mock update
            asMock(mockPrisma.appointment.update).mockResolvedValue(mockUpdatedAppointment as any)

            const result = await repository.update('appointment-123', mockBusinessId, updateData)

            expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
                where: {
                    id: 'appointment-123'
                },
                data: updateData,
                include: {
                    client: true,
                    staff: {
                        include: {
                            user: true
                        }
                    },
                    services: {
                        include: {
                            service: true
                        },
                        orderBy: {
                            serviceOrder: 'asc'
                        }
                    },
                    transactions: true
                }
            })
            expect(result).toEqual(mockUpdatedAppointment)
        })
    })

    describe('delete', () => {
        it('should delete appointment with business validation', async () => {
            // Mock findById for validation
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue({ id: 'appointment-123', businessId: mockBusinessId } as any)
            // Mock delete
            asMock(mockPrisma.appointment.delete).mockResolvedValue({ id: 'appointment-123' } as any)

            await repository.delete('appointment-123', mockBusinessId)

            expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({
                where: {
                    id: 'appointment-123'
                }
            })
        })
    })

    describe('addServices', () => {
        const mockExistingAppointment = {
            id: 'appointment-123',
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            totalPrice: 50,
            totalDuration: 30,
            services: [
                {
                    id: 'service-1',
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                }
            ]
        }

        const newServices = [
            {
                serviceId: 'service-2',
                serviceName: 'Styling',
                price: 30,
                duration: 20,
                serviceOrder: 2
            }
        ]

        it('should add services to an existing appointment', async () => {
            // Mock findById
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(mockExistingAppointment as any)
            // Mock service validation
            asMock(mockPrisma.service.findMany).mockResolvedValue([
                { id: 'service-2', businessId: mockBusinessId, isActive: true }
            ] as any)
            asMock(mockPrisma.staffService.findMany).mockResolvedValue([
                { staffId: mockStaffId, serviceId: 'service-2' }
            ] as any)
            // Mock existing services query
            asMock(mockPrisma.appointmentService.findMany).mockResolvedValue([
                { serviceOrder: 1 }
            ] as any)
            // Mock service creation
            asMock(mockPrisma.appointmentService.createMany).mockResolvedValue({ count: 1 } as any)
            // Mock update
            asMock(mockPrisma.appointment.update).mockResolvedValue({
                ...mockExistingAppointment,
                totalPrice: 80,
                totalDuration: 50
            } as any)

            const result = await repository.addServices('appointment-123', mockBusinessId, newServices)

            expect(mockPrisma.appointmentService.createMany).toHaveBeenCalledWith({
                data: [{
                    appointmentId: 'appointment-123',
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2,
                    startOffset: 0,
                    assignedStaffId: undefined
                }]
            })
        })

        it('should throw error when appointment not found', async () => {
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(null)

            await expect(repository.addServices('nonexistent', mockBusinessId, newServices))
                .rejects.toThrow('Appointment not found or access denied')
        })
    })

    describe('removeServices', () => {
        const mockExistingAppointment = {
            id: 'appointment-123',
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            totalPrice: 80,
            totalDuration: 50,
            services: [
                {
                    id: 'service-1',
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                },
                {
                    id: 'service-2',
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2
                }
            ]
        }

        it('should remove services from an existing appointment', async () => {
            // Mock findById
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(mockExistingAppointment as any)
            // Mock service deletion
            asMock(mockPrisma.appointmentService.deleteMany).mockResolvedValue({ count: 1 } as any)
            // Mock service reordering
            asMock(mockPrisma.appointmentService.update).mockResolvedValue({} as any)
            // Mock appointment update
            asMock(mockPrisma.appointment.update).mockResolvedValue({
                ...mockExistingAppointment,
                totalPrice: 50,
                totalDuration: 30
            } as any)

            const result = await repository.removeServices('appointment-123', mockBusinessId, ['service-2'])

            expect(mockPrisma.appointmentService.deleteMany).toHaveBeenCalledWith({
                where: {
                    appointmentId: 'appointment-123',
                    serviceId: { in: ['service-2'] }
                }
            })
        })

        it('should throw error when trying to remove all services', async () => {
            const singleServiceAppointment = {
                ...mockExistingAppointment,
                services: [mockExistingAppointment.services[0]]
            }
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(singleServiceAppointment as any)

            await expect(repository.removeServices('appointment-123', mockBusinessId, ['service-1']))
                .rejects.toThrow('Cannot remove all services from an appointment')
        })
    })

    describe('reorderServices', () => {
        const mockExistingAppointment = {
            id: 'appointment-123',
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            services: [
                {
                    id: 'service-1',
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                },
                {
                    id: 'service-2',
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2
                }
            ]
        }

        it('should reorder services within an appointment', async () => {
            // Mock findById
            asMock(mockPrisma.appointment.findFirst).mockResolvedValue(mockExistingAppointment as any)
            // Mock service reordering
            asMock(mockPrisma.appointmentService.updateMany).mockResolvedValue({ count: 1 } as any)
            // Mock appointment update
            asMock(mockPrisma.appointment.update).mockResolvedValue(mockExistingAppointment as any)

            const serviceOrders = [
                { serviceId: 'service-1', newOrder: 2 },
                { serviceId: 'service-2', newOrder: 1 }
            ]

            const result = await repository.reorderServices('appointment-123', mockBusinessId, serviceOrders)

            expect(mockPrisma.appointmentService.updateMany).toHaveBeenCalledTimes(2)
            expect(mockPrisma.appointmentService.updateMany).toHaveBeenCalledWith({
                where: {
                    appointmentId: 'appointment-123',
                    serviceId: 'service-1'
                },
                data: { serviceOrder: 2 }
            })
        })
    })
})