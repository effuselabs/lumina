import { prisma } from '@/lib/prisma'
import {
    SecurityViolationType,
    businessContextSecurity
} from '@/lib/security/business-context-security'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { BusinessRole, UserRole } from '@prisma/client'

// Mock the auth module
jest.mock('@/lib/auth', () => ({
    getCurrentUser: jest.fn(),
    requireBusinessAccess: jest.fn()
}))

describe('BusinessContextSecurityService', () => {
    let testBusinessId: string
    let testUserId: string
    let testStaffId: string
    let testClientId: string
    let testAppointmentId: string

    beforeEach(async () => {
        // Create test business
        const business = await prisma.business.create({
            data: {
                name: 'Test Security Business',
                slug: 'test-security-business',
                email: 'security@test.com',
                phone: '555-0123',
                address: '123 Security St',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345',
                country: 'US',
                timezone: 'America/New_York'
            }
        })
        testBusinessId = business.id

        // Create test user
        const user = await prisma.user.create({
            data: {
                email: 'security-test@example.com',
                name: 'Security Test User',
                role: UserRole.STAFF
            }
        })
        testUserId = user.id

        // Create business user relationship
        await prisma.businessUser.create({
            data: {
                businessId: testBusinessId,
                userId: testUserId,
                role: BusinessRole.STAFF
            }
        })

        // Create test staff
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

        // Create test client
        const client = await prisma.client.create({
            data: {
                businessId: testBusinessId,
                firstName: 'Test',
                lastName: 'Client',
                email: 'client@test.com',
                phone: '555-0124'
            }
        })
        testClientId = client.id

        // Create test appointment
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

    afterEach(async () => {
        // Clean up test data
        await prisma.appointment.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.client.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.staff.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.businessUser.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.user.deleteMany({ where: { id: testUserId } })
        await prisma.business.deleteMany({ where: { id: testBusinessId } })
        await prisma.securityLog.deleteMany({})
        await prisma.auditLog.deleteMany({})
    })

    describe('validateBusinessContext', () => {
        it('should validate valid business context', async () => {
            const result = await businessContextSecurity.validateBusinessContext(
                testBusinessId,
                testUserId,
                [BusinessRole.STAFF]
            )

            expect(result.isValid).toBe(true)
            expect(result.securityContext).toBeDefined()
            expect(result.securityContext?.businessId).toBe(testBusinessId)
            expect(result.securityContext?.userId).toBe(testUserId)
            expect(result.violations).toHaveLength(0)
        })

        it('should reject invalid business context - user not in business', async () => {
            // Create another user not in the business
            const otherUser = await prisma.user.create({
                data: {
                    email: 'other@example.com',
                    name: 'Other User',
                    role: UserRole.STAFF
                }
            })

            const result = await businessContextSecurity.validateBusinessContext(
                testBusinessId,
                otherUser.id,
                [BusinessRole.STAFF]
            )

            expect(result.isValid).toBe(false)
            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.INVALID_BUSINESS_CONTEXT)

            // Check security log was created
            const securityLogs = await prisma.securityLog.findMany({
                where: { userId: otherUser.id }
            })
            expect(securityLogs).toHaveLength(1)

            // Cleanup
            await prisma.user.delete({ where: { id: otherUser.id } })
        })

        it('should reject insufficient permissions', async () => {
            const result = await businessContextSecurity.validateBusinessContext(
                testBusinessId,
                testUserId,
                [BusinessRole.OWNER] // User is STAFF, requires OWNER
            )

            expect(result.isValid).toBe(false)
            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.INSUFFICIENT_PERMISSIONS)
        })

        it('should handle non-existent user', async () => {
            const result = await businessContextSecurity.validateBusinessContext(
                testBusinessId,
                'non-existent-user-id',
                [BusinessRole.STAFF]
            )

            expect(result.isValid).toBe(false)
            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS)
        })
    })

    describe('validateResourceOwnership', () => {
        it('should validate appointment ownership', async () => {
            const result = await businessContextSecurity.validateResourceOwnership(
                'appointment',
                testAppointmentId,
                testBusinessId,
                testUserId
            )

            expect(result.isValid).toBe(true)
            expect(result.securityContext).toBeDefined()
        })

        it('should reject cross-tenant appointment access', async () => {
            // Create another business
            const otherBusiness = await prisma.business.create({
                data: {
                    name: 'Other Business',
                    slug: 'other-business',
                    email: 'other@test.com',
                    phone: '555-0125',
                    address: '456 Other St',
                    city: 'Other City',
                    state: 'OS',
                    zipCode: '54321',
                    country: 'US',
                    timezone: 'America/New_York'
                }
            })

            const result = await businessContextSecurity.validateResourceOwnership(
                'appointment',
                testAppointmentId,
                otherBusiness.id, // Wrong business
                testUserId
            )

            expect(result.isValid).toBe(false)
            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.INVALID_BUSINESS_CONTEXT)

            // Cleanup
            await prisma.business.delete({ where: { id: otherBusiness.id } })
        })

        it('should validate client ownership', async () => {
            const result = await businessContextSecurity.validateResourceOwnership(
                'client',
                testClientId,
                testBusinessId,
                testUserId
            )

            expect(result.isValid).toBe(true)
        })

        it('should validate staff ownership', async () => {
            const result = await businessContextSecurity.validateResourceOwnership(
                'staff',
                testStaffId,
                testBusinessId,
                testUserId
            )

            expect(result.isValid).toBe(true)
        })

        it('should reject invalid resource ownership', async () => {
            const result = await businessContextSecurity.validateResourceOwnership(
                'appointment',
                'non-existent-appointment',
                testBusinessId,
                testUserId
            )

            expect(result.isValid).toBe(false)
            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.INVALID_RESOURCE_OWNERSHIP)
        })
    })

    describe('logSecurityViolation', () => {
        it('should log security violations', async () => {
            const violation = {
                type: SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS,
                userId: testUserId,
                businessId: testBusinessId,
                resourceType: 'appointment',
                attemptedAction: 'test_action',
                details: { test: 'data' }
            }

            await businessContextSecurity.logSecurityViolation(violation)

            const logs = await prisma.securityLog.findMany({
                where: { userId: testUserId }
            })

            expect(logs).toHaveLength(1)
            expect(logs[0].type).toBe(SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS)
            expect(logs[0].resourceType).toBe('appointment')
            expect(logs[0].attemptedAction).toBe('test_action')
        })

        it('should set appropriate severity levels', async () => {
            const highSeverityViolation = {
                type: SecurityViolationType.CROSS_TENANT_DATA_ACCESS,
                userId: testUserId,
                businessId: testBusinessId,
                resourceType: 'appointment',
                attemptedAction: 'cross_tenant_access',
                details: {}
            }

            await businessContextSecurity.logSecurityViolation(highSeverityViolation)

            const logs = await prisma.securityLog.findMany({
                where: { type: SecurityViolationType.CROSS_TENANT_DATA_ACCESS }
            })

            expect(logs).toHaveLength(1)
            expect(logs[0].severity).toBe('HIGH')
        })
    })

    describe('createAuditLog', () => {
        it('should create audit log entries', async () => {
            const auditEntry = {
                userId: testUserId,
                businessId: testBusinessId,
                action: 'CREATE_APPOINTMENT',
                resourceType: 'appointment',
                resourceId: testAppointmentId,
                newValues: { status: 'SCHEDULED' },
                metadata: { test: 'metadata' }
            }

            await businessContextSecurity.createAuditLog(auditEntry)

            const logs = await prisma.auditLog.findMany({
                where: { userId: testUserId }
            })

            expect(logs).toHaveLength(1)
            expect(logs[0].action).toBe('CREATE_APPOINTMENT')
            expect(logs[0].resourceType).toBe('appointment')
            expect(logs[0].resourceId).toBe(testAppointmentId)
        })
    })

    describe('getSecurityViolations', () => {
        beforeEach(async () => {
            // Create test security violations
            await prisma.securityLog.createMany({
                data: [
                    {
                        type: SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS,
                        userId: testUserId,
                        businessId: testBusinessId,
                        resourceType: 'appointment',
                        attemptedAction: 'test_action_1',
                        severity: 'HIGH',
                        details: {}
                    },
                    {
                        type: SecurityViolationType.INSUFFICIENT_PERMISSIONS,
                        userId: testUserId,
                        businessId: testBusinessId,
                        resourceType: 'client',
                        attemptedAction: 'test_action_2',
                        severity: 'MEDIUM',
                        details: {}
                    }
                ]
            })
        })

        it('should retrieve security violations for business', async () => {
            const result = await businessContextSecurity.getSecurityViolations(testBusinessId)

            expect(result.violations).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.summary).toHaveProperty(SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS)
            expect(result.summary).toHaveProperty(SecurityViolationType.INSUFFICIENT_PERMISSIONS)
        })

        it('should filter violations by type', async () => {
            const result = await businessContextSecurity.getSecurityViolations(testBusinessId, {
                types: [SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS]
            })

            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS)
        })

        it('should paginate results', async () => {
            const result = await businessContextSecurity.getSecurityViolations(testBusinessId, {
                limit: 1,
                offset: 0
            })

            expect(result.violations).toHaveLength(1)
            expect(result.total).toBe(2)
        })
    })

    describe('getAuditTrail', () => {
        beforeEach(async () => {
            // Create test audit logs
            await prisma.auditLog.createMany({
                data: [
                    {
                        userId: testUserId,
                        businessId: testBusinessId,
                        action: 'CREATE_APPOINTMENT',
                        resourceType: 'appointment',
                        resourceId: testAppointmentId,
                        newValues: { status: 'SCHEDULED' }
                    },
                    {
                        userId: testUserId,
                        businessId: testBusinessId,
                        action: 'UPDATE_APPOINTMENT',
                        resourceType: 'appointment',
                        resourceId: testAppointmentId,
                        oldValues: { status: 'SCHEDULED' },
                        newValues: { status: 'CONFIRMED' }
                    }
                ]
            })
        })

        it('should retrieve audit trail for resource', async () => {
            const result = await businessContextSecurity.getAuditTrail(
                'appointment',
                testAppointmentId,
                testBusinessId
            )

            expect(result.entries).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.entries[0].action).toBe('UPDATE_APPOINTMENT') // Most recent first
            expect(result.entries[1].action).toBe('CREATE_APPOINTMENT')
        })

        it('should paginate audit trail', async () => {
            const result = await businessContextSecurity.getAuditTrail(
                'appointment',
                testAppointmentId,
                testBusinessId,
                { limit: 1, offset: 0 }
            )

            expect(result.entries).toHaveLength(1)
            expect(result.total).toBe(2)
        })
    })

    describe('Multi-tenant isolation tests', () => {
        let otherBusinessId: string
        let otherUserId: string

        beforeEach(async () => {
            // Create another business and user
            const otherBusiness = await prisma.business.create({
                data: {
                    name: 'Other Test Business',
                    slug: 'other-test-business',
                    email: 'other@test.com',
                    phone: '555-0126',
                    address: '789 Other Ave',
                    city: 'Other City',
                    state: 'OC',
                    zipCode: '67890',
                    country: 'US',
                    timezone: 'America/Los_Angeles'
                }
            })
            otherBusinessId = otherBusiness.id

            const otherUser = await prisma.user.create({
                data: {
                    email: 'other-user@example.com',
                    name: 'Other User',
                    role: UserRole.STAFF
                }
            })
            otherUserId = otherUser.id

            await prisma.businessUser.create({
                data: {
                    businessId: otherBusinessId,
                    userId: otherUserId,
                    role: BusinessRole.STAFF
                }
            })
        })

        afterEach(async () => {
            await prisma.businessUser.deleteMany({ where: { businessId: otherBusinessId } })
            await prisma.user.deleteMany({ where: { id: otherUserId } })
            await prisma.business.deleteMany({ where: { id: otherBusinessId } })
        })

        it('should prevent cross-tenant data access', async () => {
            // Try to access appointment from different business
            const result = await businessContextSecurity.validateResourceOwnership(
                'appointment',
                testAppointmentId,
                otherBusinessId, // Different business
                otherUserId
            )

            expect(result.isValid).toBe(false)
            expect(result.violations).toHaveLength(1)
            expect(result.violations[0].type).toBe(SecurityViolationType.INVALID_BUSINESS_CONTEXT)

            // Verify security violation was logged
            const securityLogs = await prisma.securityLog.findMany({
                where: {
                    userId: otherUserId,
                    type: SecurityViolationType.INVALID_BUSINESS_CONTEXT
                }
            })
            expect(securityLogs).toHaveLength(1)
        })

        it('should isolate security violations by business', async () => {
            // Create violations for both businesses
            await businessContextSecurity.logSecurityViolation({
                type: SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS,
                userId: testUserId,
                businessId: testBusinessId,
                resourceType: 'appointment',
                attemptedAction: 'test_business_1',
                details: {}
            })

            await businessContextSecurity.logSecurityViolation({
                type: SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS,
                userId: otherUserId,
                businessId: otherBusinessId,
                resourceType: 'appointment',
                attemptedAction: 'test_business_2',
                details: {}
            })

            // Each business should only see their own violations
            const business1Violations = await businessContextSecurity.getSecurityViolations(testBusinessId)
            const business2Violations = await businessContextSecurity.getSecurityViolations(otherBusinessId)

            expect(business1Violations.violations).toHaveLength(1)
            expect(business1Violations.violations[0].userId).toBe(testUserId)

            expect(business2Violations.violations).toHaveLength(1)
            expect(business2Violations.violations[0].userId).toBe(otherUserId)
        })
    })

    describe('Performance and rate limiting', () => {
        it('should handle multiple concurrent validation requests', async () => {
            const promises = Array.from({ length: 10 }, () =>
                businessContextSecurity.validateBusinessContext(
                    testBusinessId,
                    testUserId,
                    [BusinessRole.STAFF]
                )
            )

            const results = await Promise.all(promises)

            results.forEach((result: any) => {
                expect(result.isValid).toBe(true)
            })
        })

        it('should detect suspicious activity patterns', async () => {
            // Simulate rapid-fire invalid access attempts
            const promises = Array.from({ length: 5 }, () =>
                businessContextSecurity.validateResourceOwnership(
                    'appointment',
                    'non-existent-id',
                    testBusinessId,
                    testUserId
                )
            )

            await Promise.all(promises)

            const securityLogs = await prisma.securityLog.findMany({
                where: {
                    userId: testUserId,
                    type: SecurityViolationType.INVALID_RESOURCE_OWNERSHIP
                }
            })

            expect(securityLogs.length).toBeGreaterThanOrEqual(5)
        })
    })
})