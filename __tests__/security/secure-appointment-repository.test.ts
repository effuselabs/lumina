import { prisma } from '@/lib/prisma'
import { SecureAppointmentRepository } from '@/lib/repositories/secure-appointment-repository'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { AppointmentStatus, BusinessRole, UserRole } from '@prisma/client'

// Mock the auth module
jest.mock('@/lib/auth', () => ({
    getCurrentUser: jest.fn(),
    requireBusinessAccess: jest.fn()
}))

describe('SecureAppointmentRepository', () => {
    let repository: SecureAppointmentRepository
    let testBusinessId: string
    let testUserId: string
    let testStaffId: string
    let testClientId: string
    let testServiceId: string
    let managerUserId: string
    let managerStaffId: string

    beforeEach(async () => {
        repository = new SecureAppointmentRepository()

        // Create test business
        const business = await prisma.business.create({
            data: {
                name: 'Secure Test Business',
                slug: 'secure-test-business',
                email: 'secure@test.com',
                phone: '555-0200',
                address: '123 Secure St',
                city: 'Secure City',
                state: 'SC',
                zipCode: '12345',
                country: 'US',
                timezone: 'America/New_York'
            }
        })
        testBusinessId = business.id

        // Create test staff user
        const staffUser = await prisma.user.create({
            data: {
                email: 'staff@secure-test.com',
                name: 'Test Staff User',
                role: UserRole.STAFF
            }
        })
        testUserId = staffUser.id

        // Create manager user
        const managerUser = await prisma.user.create({
            data: {
                email: 'manager@secure-test.com',
                name: 'Test Manager User',
                role: UserRole.STAFF
            }
        })
        managerUserId = managerUser.id

        // Create business user relationships
        await prisma.businessUser.create({
            data: {
                businessId: testBusinessId,
                userId: testUserId,
                role: BusinessRole.STAFF
            }
        })

        await prisma.businessUser.create({
            data: {
                businessId: testBusinessId,
                userId: managerUserId,
                role: BusinessRole.MANAGER
            }
        })

        // Create test staff profiles
        const staff = await prisma.staff.create({
            data: {
                businessId: testBusinessId,
                userId: testUserId,
                displayName: 'Test Staff',
                employmentType: 'COMMISSION',
                commissionRate: 50
            }
        })
        testStaffId = staff.id

        const managerStaff = await prisma.staff.create({
            data: {
                businessId: testBusinessId,
                userId: managerUserId,
                displayName: 'Test Manager',
                employmentType: 'COMMISSION',
                commissionRate: 60
            }
        })
        managerStaffId = managerStaff.id

        // Create test client
        const client = await prisma.client.create({
            data: {
                businessId: testBusinessId,
                firstName: 'Secure',
                lastName: 'Client',
                email: 'client@secure-test.com',
                phone: '555-0201'
            }
        })
        testClientId = client.id

        // Create test service
        const service = await prisma.service.create({
            data: {
                businessId: testBusinessId,
                name: 'Test Service',
                description: 'A test service',
                duration: 60,
                price: 100,
                isActive: true
            }
        })
        testServiceId = service.id
    })

    afterEach(async () => {
        // Clean up test data
        await prisma.appointmentService.deleteMany({ where: { appointment: { businessId: testBusinessId } } })
        await prisma.appointment.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.service.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.client.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.staff.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.businessUser.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.user.deleteMany({ where: { id: { in: [testUserId, managerUserId] } } })
        await prisma.business.deleteMany({ where: { id: testBusinessId } })
        await prisma.securityLog.deleteMany({})
        await prisma.auditLog.deleteMany({})
    })

    describe('create', () => {
        it('should create appointment with valid security context', async () => {
            const appointmentRequest = {
                businessId: testBusinessId,
                clientId: testClientId,
                staffId: testStaffId,
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                totalDuration: 60,
                totalPrice: 100,
                services: [{
                    serviceId: testServiceId,
                    serviceName: 'Test Service',
                    price: 100,
                    duration: 60,
                    serviceOrder: 1
                }]
            }

            const appointment = await repository.create(appointmentRequest, testUserId)

            expect(appointment).toBeDefined()
            expect(appointment.businessId).toBe(testBusinessId)
            expect(appointment.staffId).toBe(testStaffId)
            expect(appointment.clientId).toBe(testClientId)

            // Verify audit log was created
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    userId: testUserId,
                    action: 'CREATE_APPOINTMENT',
                    resourceId: appointment.id
                }
            })
            expect(auditLogs).toHaveLength(1)
        })

        it('should reject appointment creation for unauthorized user', async () => {
            // Create user not in business
            const unauthorizedUser = await prisma.user.create({
                data: {
                    email: 'unauthorized@test.com',
                    name: 'Unauthorized User',
                    role: UserRole.STAFF
                }
            })

            const appointmentRequest = {
                businessId: testBusinessId,
                clientId: testClientId,
                staffId: testStaffId,
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                totalDuration: 60,
                totalPrice: 100,
                services: [{
                    serviceId: testServiceId,
                    serviceName: 'Test Service',
                    price: 100,
                    duration: 60,
                    serviceOrder: 1
                }]
            }

            await expect(
                repository.create(appointmentRequest, unauthorizedUser.id)
            ).rejects.toThrow('Unauthorized: Cannot create appointment in this business context')

            // Verify security violation was logged
            const securityLogs = await prisma.securityLog.findMany({
                where: { userId: unauthorizedUser.id }
            })
            expect(securityLogs.length).toBeGreaterThan(0)

            // Cleanup
            await prisma.user.delete({ where: { id: unauthorizedUser.id } })
        })

        it('should reject appointment with invalid staff assignment', async () => {
            // Create staff from different business
            const otherBusiness = await prisma.business.create({
                data: {
                    name: 'Other Business',
                    slug: 'other-business',
                    email: 'other@test.com',
                    phone: '555-0300',
                    address: '456 Other St',
                    city: 'Other City',
                    state: 'OC',
                    zipCode: '54321',
                    country: 'US',
                    timezone: 'America/Los_Angeles'
                }
            })

            const otherStaff = await prisma.staff.create({
                data: {
                    businessId: otherBusiness.id,
                    displayName: 'Other Staff',
                    employmentType: 'COMMISSION',
                    commissionRate: 50
                }
            })

            const appointmentRequest = {
                businessId: testBusinessId,
                clientId: testClientId,
                staffId: otherStaff.id, // Staff from different business
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                totalDuration: 60,
                totalPrice: 100,
                services: [{
                    serviceId: testServiceId,
                    serviceName: 'Test Service',
                    price: 100,
                    duration: 60,
                    serviceOrder: 1
                }]
            }

            await expect(
                repository.create(appointmentRequest, testUserId)
            ).rejects.toThrow('Unauthorized: Staff member not found or access denied')

            // Cleanup
            await prisma.staff.delete({ where: { id: otherStaff.id } })
            await prisma.business.delete({ where: { id: otherBusiness.id } })
        })
    })

    describe('findById', () => {
        let testAppointmentId: string

        beforeEach(async () => {
            const appointment = await prisma.appointment.create({
                data: {
                    businessId: testBusinessId,
                    clientId: testClientId,
                    staffId: testStaffId,
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 100,
                    status: 'SCHEDULED'
                }
            })
            testAppointmentId = appointment.id
        })

        it('should find appointment with valid access', async () => {
            const appointment = await repository.findById(
                testAppointmentId,
                testBusinessId,
                testUserId
            )

            expect(appointment).toBeDefined()
            expect(appointment?.id).toBe(testAppointmentId)

            // Verify audit log was created
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    userId: testUserId,
                    action: 'VIEW_APPOINTMENT',
                    resourceId: testAppointmentId
                }
            })
            expect(auditLogs).toHaveLength(1)
        })

        it('should return null for unauthorized access', async () => {
            // Create user not in business
            const unauthorizedUser = await prisma.user.create({
                data: {
                    email: 'unauthorized2@test.com',
                    name: 'Unauthorized User 2',
                    role: UserRole.STAFF
                }
            })

            const appointment = await repository.findById(
                testAppointmentId,
                testBusinessId,
                unauthorizedUser.id
            )

            expect(appointment).toBeNull()

            // Cleanup
            await prisma.user.delete({ where: { id: unauthorizedUser.id } })
        })

        it('should return null for cross-tenant access attempt', async () => {
            // Create another business
            const otherBusiness = await prisma.business.create({
                data: {
                    name: 'Other Business 2',
                    slug: 'other-business-2',
                    email: 'other2@test.com',
                    phone: '555-0400',
                    address: '789 Other Ave',
                    city: 'Other City 2',
                    state: 'O2',
                    zipCode: '67890',
                    country: 'US',
                    timezone: 'America/Chicago'
                }
            })

            const appointment = await repository.findById(
                testAppointmentId,
                otherBusiness.id, // Wrong business
                testUserId
            )

            expect(appointment).toBeNull()

            // Cleanup
            await prisma.business.delete({ where: { id: otherBusiness.id } })
        })
    })

    describe('update', () => {
        let testAppointmentId: string

        beforeEach(async () => {
            const appointment = await prisma.appointment.create({
                data: {
                    businessId: testBusinessId,
                    clientId: testClientId,
                    staffId: testStaffId,
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 100,
                    status: 'SCHEDULED',
                    notes: 'Original notes'
                }
            })
            testAppointmentId = appointment.id
        })

        it('should allow manager to update any appointment', async () => {
            const updates = {
                notes: 'Updated by manager',
                totalPrice: 120
            }

            const updatedAppointment = await repository.update(
                testAppointmentId,
                testBusinessId,
                updates,
                managerUserId
            )

            expect(updatedAppointment.notes).toBe('Updated by manager')
            expect(Number(updatedAppointment.totalPrice)).toBe(120)

            // Verify audit log was created
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    userId: managerUserId,
                    action: 'UPDATE_APPOINTMENT',
                    resourceId: testAppointmentId
                }
            })
            expect(auditLogs).toHaveLength(1)
            expect(auditLogs[0].oldValues).toHaveProperty('notes', 'Original notes')
            expect(auditLogs[0].newValues).toHaveProperty('notes', 'Updated by manager')
        })

        it('should allow staff to update their own appointment', async () => {
            const updates = {
                notes: 'Updated by assigned staff'
            }

            const updatedAppointment = await repository.update(
                testAppointmentId,
                testBusinessId,
                updates,
                testUserId
            )

            expect(updatedAppointment.notes).toBe('Updated by assigned staff')
        })

        it('should reject staff updating other staff appointments', async () => {
            // Create another staff member
            const otherStaffUser = await prisma.user.create({
                data: {
                    email: 'otherstaff@test.com',
                    name: 'Other Staff User',
                    role: UserRole.STAFF
                }
            })

            await prisma.businessUser.create({
                data: {
                    businessId: testBusinessId,
                    userId: otherStaffUser.id,
                    role: BusinessRole.STAFF
                }
            })

            const otherStaff = await prisma.staff.create({
                data: {
                    businessId: testBusinessId,
                    userId: otherStaffUser.id,
                    displayName: 'Other Staff',
                    employmentType: 'COMMISSION',
                    commissionRate: 50
                }
            })

            const updates = {
                notes: 'Unauthorized update attempt'
            }

            await expect(
                repository.update(testAppointmentId, testBusinessId, updates, otherStaffUser.id)
            ).rejects.toThrow('Unauthorized: Can only modify your own appointments')

            // Verify security violation was logged
            const securityLogs = await prisma.securityLog.findMany({
                where: {
                    userId: otherStaffUser.id,
                    resourceId: testAppointmentId
                }
            })
            expect(securityLogs.length).toBeGreaterThan(0)

            // Cleanup
            await prisma.staff.delete({ where: { id: otherStaff.id } })
            await prisma.businessUser.deleteMany({ where: { userId: otherStaffUser.id } })
            await prisma.user.delete({ where: { id: otherStaffUser.id } })
        })
    })

    describe('delete', () => {
        let testAppointmentId: string

        beforeEach(async () => {
            const appointment = await prisma.appointment.create({
                data: {
                    businessId: testBusinessId,
                    clientId: testClientId,
                    staffId: testStaffId,
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 100,
                    status: 'SCHEDULED'
                }
            })
            testAppointmentId = appointment.id
        })

        it('should allow manager to delete appointment', async () => {
            await repository.delete(testAppointmentId, testBusinessId, managerUserId)

            // Verify appointment was deleted
            const deletedAppointment = await prisma.appointment.findUnique({
                where: { id: testAppointmentId }
            })
            expect(deletedAppointment).toBeNull()

            // Verify audit log was created
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    userId: managerUserId,
                    action: 'DELETE_APPOINTMENT',
                    resourceId: testAppointmentId
                }
            })
            expect(auditLogs).toHaveLength(1)
        })

        it('should reject staff deletion attempt', async () => {
            await expect(
                repository.delete(testAppointmentId, testBusinessId, testUserId)
            ).rejects.toThrow('Unauthorized: Only owners and managers can delete appointments')

            // Verify security violation was logged
            const securityLogs = await prisma.securityLog.findMany({
                where: {
                    userId: testUserId,
                    resourceId: testAppointmentId
                }
            })
            expect(securityLogs.length).toBeGreaterThan(0)

            // Verify appointment still exists
            const appointment = await prisma.appointment.findUnique({
                where: { id: testAppointmentId }
            })
            expect(appointment).toBeDefined()
        })
    })

    describe('updateStatus', () => {
        let testAppointmentId: string

        beforeEach(async () => {
            const appointment = await prisma.appointment.create({
                data: {
                    businessId: testBusinessId,
                    clientId: testClientId,
                    staffId: testStaffId,
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 100,
                    status: 'SCHEDULED'
                }
            })
            testAppointmentId = appointment.id
        })

        it('should allow staff to update status of their own appointment', async () => {
            const updatedAppointment = await repository.updateStatus(
                testAppointmentId,
                testBusinessId,
                AppointmentStatus.CONFIRMED,
                testUserId
            )

            expect(updatedAppointment.status).toBe(AppointmentStatus.CONFIRMED)

            // Verify audit log was created
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    userId: testUserId,
                    action: 'UPDATE_APPOINTMENT_STATUS',
                    resourceId: testAppointmentId
                }
            })
            expect(auditLogs).toHaveLength(1)
        })

        it('should allow manager to update any appointment status', async () => {
            const updatedAppointment = await repository.updateStatus(
                testAppointmentId,
                testBusinessId,
                AppointmentStatus.CANCELLED,
                managerUserId
            )

            expect(updatedAppointment.status).toBe(AppointmentStatus.CANCELLED)
        })

        it('should reject invalid status transitions for staff', async () => {
            // First set to completed
            await repository.updateStatus(
                testAppointmentId,
                testBusinessId,
                AppointmentStatus.COMPLETED,
                managerUserId
            )

            // Staff should not be able to change completed status
            await expect(
                repository.updateStatus(
                    testAppointmentId,
                    testBusinessId,
                    AppointmentStatus.SCHEDULED,
                    testUserId
                )
            ).rejects.toThrow('Cannot transition from COMPLETED to SCHEDULED')
        })

        it('should reject staff updating other staff appointment status', async () => {
            // Create another staff member
            const otherStaffUser = await prisma.user.create({
                data: {
                    email: 'otherstaff2@test.com',
                    name: 'Other Staff User 2',
                    role: UserRole.STAFF
                }
            })

            await prisma.businessUser.create({
                data: {
                    businessId: testBusinessId,
                    userId: otherStaffUser.id,
                    role: BusinessRole.STAFF
                }
            })

            await expect(
                repository.updateStatus(
                    testAppointmentId,
                    testBusinessId,
                    AppointmentStatus.CONFIRMED,
                    otherStaffUser.id
                )
            ).rejects.toThrow('Can only update status of your own appointments')

            // Cleanup
            await prisma.businessUser.deleteMany({ where: { userId: otherStaffUser.id } })
            await prisma.user.delete({ where: { id: otherStaffUser.id } })
        })
    })

    describe('findByBusinessSecure', () => {
        let appointment1Id: string
        let appointment2Id: string

        beforeEach(async () => {
            // Create appointments for different staff
            const appointment1 = await prisma.appointment.create({
                data: {
                    businessId: testBusinessId,
                    clientId: testClientId,
                    staffId: testStaffId,
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 100,
                    status: 'SCHEDULED'
                }
            })
            appointment1Id = appointment1.id

            const appointment2 = await prisma.appointment.create({
                data: {
                    businessId: testBusinessId,
                    clientId: testClientId,
                    staffId: managerStaffId,
                    startTime: new Date('2024-01-15T14:00:00Z'),
                    endTime: new Date('2024-01-15T15:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 120,
                    status: 'CONFIRMED'
                }
            })
            appointment2Id = appointment2.id
        })

        it('should allow manager to see all appointments', async () => {
            const result = await repository.findByBusinessSecure(
                testBusinessId,
                {},
                managerUserId
            )

            expect(result.appointments).toHaveLength(2)
            expect(result.appointments.map(a => a.id)).toContain(appointment1Id)
            expect(result.appointments.map(a => a.id)).toContain(appointment2Id)

            // Verify audit log was created
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    userId: managerUserId,
                    action: 'LIST_APPOINTMENTS'
                }
            })
            expect(auditLogs).toHaveLength(1)
        })

        it('should restrict staff to see only their own appointments', async () => {
            const result = await repository.findByBusinessSecure(
                testBusinessId,
                {},
                testUserId
            )

            expect(result.appointments).toHaveLength(1)
            expect(result.appointments[0].id).toBe(appointment1Id)
            expect(result.appointments[0].staffId).toBe(testStaffId)
        })

        it('should reject unauthorized business access', async () => {
            // Create user not in business
            const unauthorizedUser = await prisma.user.create({
                data: {
                    email: 'unauthorized3@test.com',
                    name: 'Unauthorized User 3',
                    role: UserRole.STAFF
                }
            })

            await expect(
                repository.findByBusinessSecure(testBusinessId, {}, unauthorizedUser.id)
            ).rejects.toThrow('Unauthorized: Cannot access appointments for this business')

            // Cleanup
            await prisma.user.delete({ where: { id: unauthorizedUser.id } })
        })
    })

    describe('Audit trail completeness', () => {
        it('should create comprehensive audit trail for appointment lifecycle', async () => {
            // Create appointment
            const appointmentRequest = {
                businessId: testBusinessId,
                clientId: testClientId,
                staffId: testStaffId,
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                totalDuration: 60,
                totalPrice: 100,
                services: [{
                    serviceId: testServiceId,
                    serviceName: 'Test Service',
                    price: 100,
                    duration: 60,
                    serviceOrder: 1
                }]
            }

            const appointment = await repository.create(appointmentRequest, testUserId)

            // Update appointment
            await repository.update(
                appointment.id,
                testBusinessId,
                { notes: 'Updated notes' },
                testUserId
            )

            // Update status
            await repository.updateStatus(
                appointment.id,
                testBusinessId,
                AppointmentStatus.CONFIRMED,
                testUserId
            )

            // View appointment
            await repository.findById(appointment.id, testBusinessId, testUserId)

            // Verify complete audit trail
            const auditLogs = await prisma.auditLog.findMany({
                where: { resourceId: appointment.id },
                orderBy: { createdAt: 'asc' }
            })

            expect(auditLogs).toHaveLength(4)
            expect(auditLogs[0].action).toBe('CREATE_APPOINTMENT')
            expect(auditLogs[1].action).toBe('UPDATE_APPOINTMENT')
            expect(auditLogs[2].action).toBe('UPDATE_APPOINTMENT_STATUS')
            expect(auditLogs[3].action).toBe('VIEW_APPOINTMENT')

            // Verify audit log details
            expect(auditLogs[1].oldValues).toHaveProperty('notes', null)
            expect(auditLogs[1].newValues).toHaveProperty('notes', 'Updated notes')
            expect(auditLogs[2].oldValues).toHaveProperty('status', 'SCHEDULED')
            expect(auditLogs[2].newValues).toHaveProperty('status', 'CONFIRMED')
        })
    })
})