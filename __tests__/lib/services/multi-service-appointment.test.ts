
jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    prisma: {
        service: {
            findMany: jest.fn(),
        },
        staffService: {
            findMany: jest.fn(),
        },
    },
}))

import { prisma } from '@/lib/prisma'
import { MultiServiceAppointmentService, ServiceSelection } from '../../../lib/services/multi-service-appointment'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('MultiServiceAppointmentService', () => {
    let service: MultiServiceAppointmentService
    const mockBusinessId = 'business-123'
    const mockStaffId = 'staff-123'

    beforeEach(() => {
        jest.clearAllMocks()
        service = new MultiServiceAppointmentService()
    })

    describe('validateMultiServiceAppointment', () => {
        const mockServices: ServiceSelection[] = [
            {
                serviceId: 'service-1',
                serviceName: 'Haircut',
                price: 50,
                duration: 30,
                serviceOrder: 1
            },
            {
                serviceId: 'service-2',
                serviceName: 'Styling',
                price: 30,
                duration: 20,
                serviceOrder: 2,
                dependencies: ['service-1']
            }
        ]

        it('should validate services successfully when all conditions are met', async () => {
            // Mock existing services
            mockPrisma.service.findMany.mockResolvedValue([
                { id: 'service-1', businessId: mockBusinessId, isActive: true },
                { id: 'service-2', businessId: mockBusinessId, isActive: true }
            ] as any)

            // Mock staff services
            mockPrisma.staffService.findMany.mockResolvedValue([
                { staffId: mockStaffId, serviceId: 'service-1' },
                { staffId: mockStaffId, serviceId: 'service-2' }
            ] as any)

            const result = await service.validateMultiServiceAppointment(
                mockBusinessId,
                mockStaffId,
                mockServices
            )

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
            expect(result.totalPrice).toBe(80)
            expect(result.totalDuration).toBe(50)
            expect(result.orderedServices).toHaveLength(2)
        })

        it('should fail validation when services do not exist', async () => {
            mockPrisma.service.findMany.mockResolvedValue([
                { id: 'service-1', businessId: mockBusinessId, isActive: true }
            ] as any)

            mockPrisma.staffService.findMany.mockResolvedValue([
                { staffId: mockStaffId, serviceId: 'service-1' }
            ] as any)

            const result = await service.validateMultiServiceAppointment(
                mockBusinessId,
                mockStaffId,
                mockServices
            )

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Services not found or inactive: service-2')
        })

        it('should fail validation when staff cannot perform services', async () => {
            mockPrisma.service.findMany.mockResolvedValue([
                { id: 'service-1', businessId: mockBusinessId, isActive: true },
                { id: 'service-2', businessId: mockBusinessId, isActive: true }
            ] as any)

            mockPrisma.staffService.findMany.mockResolvedValue([
                { staffId: mockStaffId, serviceId: 'service-1' }
            ] as any)

            const result = await service.validateMultiServiceAppointment(
                mockBusinessId,
                mockStaffId,
                mockServices
            )

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Staff member cannot perform services: service-2')
        })

        it('should detect circular dependencies', async () => {
            const circularServices: ServiceSelection[] = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Service A',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1,
                    dependencies: ['service-2']
                },
                {
                    serviceId: 'service-2',
                    serviceName: 'Service B',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2,
                    dependencies: ['service-1']
                }
            ]

            mockPrisma.service.findMany.mockResolvedValue([
                { id: 'service-1', businessId: mockBusinessId, isActive: true },
                { id: 'service-2', businessId: mockBusinessId, isActive: true }
            ] as any)

            mockPrisma.staffService.findMany.mockResolvedValue([
                { staffId: mockStaffId, serviceId: 'service-1' },
                { staffId: mockStaffId, serviceId: 'service-2' }
            ] as any)

            const result = await service.validateMultiServiceAppointment(
                mockBusinessId,
                mockStaffId,
                circularServices
            )

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Circular dependency detected in service ordering')
        })
    })

    describe('calculateAppointmentEndTime', () => {
        it('should calculate correct end time based on service durations', () => {
            const startTime = new Date('2024-01-15T10:00:00Z')
            const services: ServiceSelection[] = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                },
                {
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2
                }
            ]

            const endTime = service.calculateAppointmentEndTime(startTime, services)

            expect(endTime).toEqual(new Date('2024-01-15T10:50:00Z'))
        })
    })

    describe('getQualifiedStaff', () => {
        it('should return staff who can perform all services', async () => {
            const serviceIds = ['service-1', 'service-2']

            mockPrisma.staffService.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    serviceId: 'service-1',
                    staff: { businessId: mockBusinessId, isActive: true, user: { name: 'John' } }
                },
                {
                    staffId: 'staff-1',
                    serviceId: 'service-2',
                    staff: { businessId: mockBusinessId, isActive: true, user: { name: 'John' } }
                },
                {
                    staffId: 'staff-2',
                    serviceId: 'service-1',
                    staff: { businessId: mockBusinessId, isActive: true, user: { name: 'Jane' } }
                }
            ] as any)

            const result = await service.getQualifiedStaff(mockBusinessId, serviceIds)

            expect(result).toHaveLength(1)
            expect(result[0].staffId).toBe('staff-1')
            expect(result[0].serviceIds).toContain('service-1')
            expect(result[0].serviceIds).toContain('service-2')
        })

        it('should return empty array when no staff can perform all services', async () => {
            const serviceIds = ['service-1', 'service-2', 'service-3']

            mockPrisma.staffService.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    serviceId: 'service-1',
                    staff: { businessId: mockBusinessId, isActive: true, user: { name: 'John' } }
                },
                {
                    staffId: 'staff-1',
                    serviceId: 'service-2',
                    staff: { businessId: mockBusinessId, isActive: true, user: { name: 'John' } }
                }
            ] as any)

            const result = await service.getQualifiedStaff(mockBusinessId, serviceIds)

            expect(result).toHaveLength(0)
        })
    })

    describe('validateServiceSequence', () => {
        it('should validate correct service sequence', () => {
            const services: ServiceSelection[] = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                },
                {
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2
                }
            ]

            const result = service.validateServiceSequence(services)

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should detect duplicate service orders', () => {
            const services: ServiceSelection[] = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                },
                {
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 1
                }
            ]

            const result = service.validateServiceSequence(services)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Duplicate service order numbers detected')
        })

        it('should detect gaps in service order', () => {
            const services: ServiceSelection[] = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                },
                {
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 3
                }
            ]

            const result = service.validateServiceSequence(services)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Gaps in service order sequence detected')
        })

        it('should detect missing dependencies', () => {
            const services: ServiceSelection[] = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 1,
                    dependencies: ['service-2']
                }
            ]

            const result = service.validateServiceSequence(services)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Service Styling depends on service service-2 which is not in the appointment')
        })
    })

    describe('generateServiceBreakdown', () => {
        it('should generate correct service breakdown', () => {
            const services: ServiceSelection[] = [
                {
                    serviceId: 'service-2',
                    serviceName: 'Styling',
                    price: 30,
                    duration: 20,
                    serviceOrder: 2
                },
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    duration: 30,
                    serviceOrder: 1
                }
            ]

            const result = service.generateServiceBreakdown(services)

            expect(result.services).toHaveLength(2)
            expect(result.services[0].name).toBe('Haircut')
            expect(result.services[0].order).toBe(1)
            expect(result.services[1].name).toBe('Styling')
            expect(result.services[1].order).toBe(2)
            expect(result.totalDuration).toBe(50)
            expect(result.totalPrice).toBe(80)
        })
    })
})