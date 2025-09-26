import { prisma } from '@/lib/prisma'

export interface ServiceSelection {
    serviceId: string
    serviceName: string
    price: number
    duration: number
    serviceOrder: number
    dependencies?: string[] // Service IDs that must be completed before this service
}

export interface MultiServiceValidationResult {
    isValid: boolean
    errors: string[]
    totalDuration: number
    totalPrice: number
    orderedServices: ServiceSelection[]
}

export interface StaffServiceCapability {
    staffId: string
    serviceIds: string[]
}

export class MultiServiceAppointmentService {
    /**
     * Validates and processes multiple services for an appointment
     */
    async validateMultiServiceAppointment(
        businessId: string,
        staffId: string,
        services: ServiceSelection[]
    ): Promise<MultiServiceValidationResult> {
        const result: MultiServiceValidationResult = {
            isValid: true,
            errors: [],
            totalDuration: 0,
            totalPrice: 0,
            orderedServices: []
        }

        // Validate that services exist and are active
        const serviceIds = services.map(s => s.serviceId)
        const existingServices = await prisma.service.findMany({
            where: {
                id: { in: serviceIds },
                businessId,
                isActive: true
            }
        })

        if (existingServices.length !== serviceIds.length) {
            const foundIds = existingServices.map(s => s.id)
            const missingIds = serviceIds.filter(id => !foundIds.includes(id))
            result.errors.push(`Services not found or inactive: ${missingIds.join(', ')}`)
            result.isValid = false
        }

        // Validate staff can perform all services
        const staffServices = await prisma.staffService.findMany({
            where: {
                staffId,
                serviceId: { in: serviceIds }
            }
        })

        const staffServiceIds = staffServices.map(ss => ss.serviceId)
        const unauthorizedServices = serviceIds.filter(id => !staffServiceIds.includes(id))
        if (unauthorizedServices.length > 0) {
            result.errors.push(`Staff member cannot perform services: ${unauthorizedServices.join(', ')}`)
            result.isValid = false
        }

        // Validate service dependencies and order
        const orderedServices = this.orderServicesByDependencies(services)
        if (!orderedServices) {
            result.errors.push('Circular dependency detected in service ordering')
            result.isValid = false
            return result
        }

        // Calculate totals
        result.totalPrice = services.reduce((sum, service) => sum + service.price, 0)
        result.totalDuration = services.reduce((sum, service) => sum + service.duration, 0)
        result.orderedServices = orderedServices

        return result
    }

    /**
     * Orders services based on dependencies and service order
     */
    private orderServicesByDependencies(services: ServiceSelection[]): ServiceSelection[] | null {
        const serviceMap = new Map(services.map(s => [s.serviceId, s]))
        const visited = new Set<string>()
        const visiting = new Set<string>()
        const ordered: ServiceSelection[] = []

        const visit = (serviceId: string): boolean => {
            if (visiting.has(serviceId)) {
                // Circular dependency detected
                return false
            }
            if (visited.has(serviceId)) {
                return true
            }

            const service = serviceMap.get(serviceId)
            if (!service) return true

            visiting.add(serviceId)

            // Visit dependencies first
            if (service.dependencies) {
                for (const depId of service.dependencies) {
                    if (!visit(depId)) {
                        return false
                    }
                }
            }

            visiting.delete(serviceId)
            visited.add(serviceId)
            ordered.push(service)
            return true
        }

        // Sort by service order first, then process dependencies
        const sortedServices = [...services].sort((a, b) => a.serviceOrder - b.serviceOrder)
        for (const service of sortedServices) {
            if (!visit(service.serviceId)) {
                return null // Circular dependency
            }
        }

        return ordered
    }

    /**
     * Calculates appointment end time based on service durations
     */
    calculateAppointmentEndTime(startTime: Date, services: ServiceSelection[]): Date {
        const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)
        return new Date(startTime.getTime() + totalDuration * 60000) // Convert minutes to milliseconds
    }

    /**
     * Gets staff members who can perform all selected services
     */
    async getQualifiedStaff(businessId: string, serviceIds: string[]): Promise<StaffServiceCapability[]> {
        const staffServices = await prisma.staffService.findMany({
            where: {
                serviceId: { in: serviceIds },
                staff: {
                    businessId,
                    isActive: true
                }
            },
            include: {
                staff: {
                    include: {
                        user: true
                    }
                }
            }
        })

        // Group by staff and check if they can perform all services
        const staffCapabilities = new Map<string, Set<string>>()
        for (const staffService of staffServices) {
            if (!staffCapabilities.has(staffService.staffId)) {
                staffCapabilities.set(staffService.staffId, new Set())
            }
            staffCapabilities.get(staffService.staffId)!.add(staffService.serviceId)
        }

        // Filter staff who can perform all services
        const qualifiedStaff: StaffServiceCapability[] = []
        for (const [staffId, serviceSet] of staffCapabilities) {
            if (serviceIds.every(id => serviceSet.has(id))) {
                qualifiedStaff.push({
                    staffId,
                    serviceIds: Array.from(serviceSet)
                })
            }
        }

        return qualifiedStaff
    }

    /**
     * Validates service sequence and timing
     */
    validateServiceSequence(services: ServiceSelection[]): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // Check for duplicate service orders
        const orders = services.map(s => s.serviceOrder)
        const uniqueOrders = new Set(orders)
        if (orders.length !== uniqueOrders.size) {
            errors.push('Duplicate service order numbers detected')
        }

        // Check for gaps in service order
        const sortedOrders = [...uniqueOrders].sort((a, b) => a - b)
        for (let i = 0; i < sortedOrders.length - 1; i++) {
            if (sortedOrders[i + 1] - sortedOrders[i] > 1) {
                errors.push('Gaps in service order sequence detected')
            }
        }

        // Validate dependencies exist in the service list
        const serviceIds = new Set(services.map(s => s.serviceId))
        for (const service of services) {
            if (service.dependencies) {
                for (const depId of service.dependencies) {
                    if (!serviceIds.has(depId)) {
                        errors.push(`Service ${service.serviceName} depends on service ${depId} which is not in the appointment`)
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Generates service breakdown for appointment confirmation
     */
    generateServiceBreakdown(services: ServiceSelection[]): {
        services: Array<{
            name: string
            duration: number
            price: number
            order: number
        }>
        totalDuration: number
        totalPrice: number
        estimatedEndTime?: Date
    } {
        const orderedServices = [...services].sort((a, b) => a.serviceOrder - b.serviceOrder)

        return {
            services: orderedServices.map(s => ({
                name: s.serviceName,
                duration: s.duration,
                price: s.price,
                order: s.serviceOrder
            })),
            totalDuration: services.reduce((sum, s) => sum + s.duration, 0),
            totalPrice: services.reduce((sum, s) => sum + s.price, 0)
        }
    }
}

export const multiServiceAppointmentService = new MultiServiceAppointmentService()