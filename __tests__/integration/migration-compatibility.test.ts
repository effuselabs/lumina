import { BackwardCompatibilityService } from '@/lib/services/backward-compatibility'
import { DataMigrationService } from '@/lib/services/data-migration'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
const mockPrisma = {
    business: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
    },
    staff: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
    },
    businessHours: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    staffAvailability: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
} as any

describe('Migration and Compatibility Integration Tests', () => {
    let backwardCompatibilityService: BackwardCompatibilityService
    let dataMigrationService: DataMigrationService

    const businessId = 'business-123'
    const staffId = 'staff-123'

    beforeEach(() => {
        jest.clearAllMocks()
        backwardCompatibilityService = new BackwardCompatibilityService(mockPrisma)
        dataMigrationService = new DataMigrationService(mockPrisma)
    })

    describe('Backward Compatibility Service Integration', () => {
        describe('Business Hours Compatibility', () => {
            it('should return structured data when available', async () => {
                const mockStructuredHours = [
                    {
                        dayOfWeek: 1,
                        openTime: '09:00',
                        closeTime: '17:00',
                        isClosed: false,
                    },
                    {
                        dayOfWeek: 2,
                        openTime: '09:00',
                        closeTime: '17:00',
                        isClosed: false,
                    },
                ]

                asMock(mockPrisma.businessHours.findMany).mockResolvedValue(mockStructuredHours)

                const result = await backwardCompatibilityService.getBusinessHours(businessId)

                expect(result.source).toBe('structured')
                expect(result.hours).toHaveLength(2)
                expect(result.migrationNeeded).toBe(false)
                expect(result.deprecationWarning).toBeUndefined()
                expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
                    where: { businessId },
                    orderBy: { dayOfWeek: 'asc' },
                })
            })

            it('should fallback to JSON data when structured data unavailable', async () => {
                const mockJsonData = {
                    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    saturday: { isOpen: true, openTime: '09:00', closeTime: '16:00' },
                    sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
                }

                asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
                asMock(mockPrisma.business.findUnique).mockResolvedValue({
                    operatingHours: mockJsonData,
                })

                const result = await backwardCompatibilityService.getBusinessHours(businessId)

                expect(result.source).toBe('json')
                expect(result.hours).toHaveLength(7)
                expect(result.migrationNeeded).toBe(true)
                expect(result.deprecationWarning).toContain('deprecated JSON format')
                expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
                    where: { id: businessId },
                    select: { operatingHours: true },
                })
            })

            it('should use default hours when no data available', async () => {
                asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
                asMock(mockPrisma.business.findUnique).mockResolvedValue({
                    operatingHours: null,
                })

                const result = await backwardCompatibilityService.getBusinessHours(businessId)

                expect(result.source).toBe('default')
                expect(result.hours).toHaveLength(7)
                expect(result.migrationNeeded).toBe(false)
                expect(result.deprecationWarning).toBeUndefined()
            })

            it('should handle invalid JSON data gracefully', async () => {
                const invalidJsonData = {
                    monday: { isOpen: 'invalid', openTime: '25:00', closeTime: '17:00' },
                }

                asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
                asMock(mockPrisma.business.findUnique).mockResolvedValue({
                    operatingHours: invalidJsonData,
                })

                const result = await backwardCompatibilityService.getBusinessHours(businessId)

                expect(result.source).toBe('default')
                expect(result.hours).toHaveLength(7)
                expect(result.migrationNeeded).toBe(false)
            })

            it('should trigger automatic migration for JSON data', async () => {
                const mockJsonData = {
                    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    wednesday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
                    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    saturday: { isOpen: true, openTime: '09:00', closeTime: '16:00' },
                    sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
                }

                asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
                asMock(mockPrisma.business.findUnique).mockResolvedValue({
                    operatingHours: mockJsonData,
                })
                asMock(mockPrisma.businessHours.count).mockResolvedValue(0)
                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    return await callback(mockPrisma)
                })
                asMock(mockPrisma.businessHours.create).mockResolvedValue({
                    id: 'hours-1',
                    businessId,
                    dayOfWeek: 1,
                    openTime: '09:00',
                    closeTime: '17:00',
                    isClosed: false,
                })

                const result = await backwardCompatibilityService.getBusinessHours(businessId)

                expect(result.source).toBe('json')
                expect(result.migrationNeeded).toBe(true)

                // Wait for async migration to complete
                await new Promise(resolve => setTimeout(resolve, 100))

                expect(mockPrisma.businessHours.count).toHaveBeenCalledWith({
                    where: { businessId },
                })
            })
        })

        describe('Staff Availability Compatibility', () => {
            it('should return structured data when available', async () => {
                const mockStructuredAvailability = [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isRecurring: true,
                    },
                    {
                        dayOfWeek: 2,
                        startTime: '09:00',
                        endTime: '17:00',
                        isRecurring: true,
                    },
                ]

                asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(mockStructuredAvailability)

                const result = await backwardCompatibilityService.getStaffAvailability(staffId)

                expect(result.source).toBe('structured')
                expect(result.availability).toHaveLength(2)
                expect(result.migrationNeeded).toBe(false)
                expect(result.deprecationWarning).toBeUndefined()
                expect(mockPrisma.staffAvailability.findMany).toHaveBeenCalledWith({
                    where: { staffId },
                    orderBy: { dayOfWeek: 'asc' },
                })
            })

            it('should fallback to JSON data when structured data unavailable', async () => {
                const mockJsonData = {
                    monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    wednesday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                    thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    saturday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                    sunday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                }

                asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])
                asMock(mockPrisma.staff.findUnique).mockResolvedValue({
                    workingHours: mockJsonData,
                    businessId,
                })

                const result = await backwardCompatibilityService.getStaffAvailability(staffId)

                expect(result.source).toBe('json')
                expect(result.availability).toHaveLength(4) // Only available days
                expect(result.migrationNeeded).toBe(true)
                expect(result.deprecationWarning).toContain('deprecated JSON format')
                expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                    where: { id: staffId },
                    select: { workingHours: true, businessId: true },
                })
            })

            it('should return empty availability when no data available', async () => {
                asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])
                asMock(mockPrisma.staff.findUnique).mockResolvedValue({
                    workingHours: null,
                    businessId,
                })

                const result = await backwardCompatibilityService.getStaffAvailability(staffId)

                expect(result.source).toBe('default')
                expect(result.availability).toHaveLength(0)
                expect(result.migrationNeeded).toBe(false)
                expect(result.deprecationWarning).toBeUndefined()
            })

            it('should trigger automatic migration for JSON data', async () => {
                const mockJsonData = {
                    monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    wednesday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                    thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    saturday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                    sunday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                }

                asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])
                asMock(mockPrisma.staff.findUnique).mockResolvedValue({
                    workingHours: mockJsonData,
                    businessId,
                })
                asMock(mockPrisma.staffAvailability.count).mockResolvedValue(0)
                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    return await callback(mockPrisma)
                })
                asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                    id: 'availability-1',
                    staffId,
                    businessId,
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '17:00',
                    isRecurring: true,
                })

                const result = await backwardCompatibilityService.getStaffAvailability(staffId)

                expect(result.source).toBe('json')
                expect(result.migrationNeeded).toBe(true)

                // Wait for async migration to complete
                await new Promise(resolve => setTimeout(resolve, 100))

                expect(mockPrisma.staffAvailability.count).toHaveBeenCalledWith({
                    where: { staffId },
                })
            })
        })

        describe('Migration Status Checking', () => {
            it('should identify migration candidates', async () => {
                const mockBusinesses = [
                    { id: 'business-1', name: 'Business 1' },
                    { id: 'business-2', name: 'Business 2' },
                ]

                const mockStaff = [
                    { id: 'staff-1', displayName: 'Staff 1', businessId: 'business-1' },
                    { id: 'staff-2', displayName: 'Staff 2', businessId: 'business-2' },
                ]

                asMock(mockPrisma.business.findMany).mockResolvedValue(mockBusinesses)
                asMock(mockPrisma.staff.findMany).mockResolvedValue(mockStaff)

                const result = await backwardCompatibilityService.getMigrationCandidates()

                expect(result.businesses).toHaveLength(2)
                expect(result.staff).toHaveLength(2)
                expect(mockPrisma.business.findMany).toHaveBeenCalledWith({
                    where: {
                        operatingHours: { not: null },
                        businessHours: { none: {} },
                    },
                    select: { id: true, name: true },
                })
                expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
                    where: {
                        workingHours: { not: null },
                        staffAvailability: { none: {} },
                    },
                    select: { id: true, displayName: true, businessId: true },
                })
            })

            it('should check availability status for business hours', async () => {
                asMock(mockPrisma.businessHours.count).mockResolvedValue(5)
                asMock(mockPrisma.business.findUnique).mockResolvedValue({
                    operatingHours: { monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' } },
                })

                const result = await backwardCompatibilityService.hasBusinessHours(businessId)

                expect(result.hasStructured).toBe(true)
                expect(result.hasJson).toBe(true)
                expect(result.needsMigration).toBe(false) // Has structured data
            })

            it('should check availability status for staff availability', async () => {
                asMock(mockPrisma.staffAvailability.count).mockResolvedValue(0)
                asMock(mockPrisma.staff.findUnique).mockResolvedValue({
                    workingHours: { monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' } },
                })

                const result = await backwardCompatibilityService.hasStaffAvailability(staffId)

                expect(result.hasStructured).toBe(false)
                expect(result.hasJson).toBe(true)
                expect(result.needsMigration).toBe(true) // Has JSON but no structured data
            })
        })

        describe('Force Migration', () => {
            it('should force migrate business hours', async () => {
                const mockJsonData = {
                    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    wednesday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
                }

                asMock(mockPrisma.business.findUnique).mockResolvedValue({
                    operatingHours: mockJsonData,
                })
                asMock(mockPrisma.businessHours.count).mockResolvedValue(0)
                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    return await callback(mockPrisma)
                })
                asMock(mockPrisma.businessHours.create).mockResolvedValue({
                    id: 'hours-1',
                    businessId,
                    dayOfWeek: 1,
                    openTime: '09:00',
                    closeTime: '17:00',
                    isClosed: false,
                })

                const result = await backwardCompatibilityService.forceMigrateBusiness(businessId)

                expect(result.success).toBe(true)
                expect(result.migratedHours).toBe(3)
                expect(result.error).toBeUndefined()
            })

            it('should force migrate staff availability', async () => {
                const mockJsonData = {
                    monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                    wednesday: { isAvailable: false, startTime: '00:00', endTime: '00:00' },
                }

                asMock(mockPrisma.staff.findUnique).mockResolvedValue({
                    workingHours: mockJsonData,
                    businessId,
                })
                asMock(mockPrisma.staffAvailability.count).mockResolvedValue(0)
                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    return await callback(mockPrisma)
                })
                asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                    id: 'availability-1',
                    staffId,
                    businessId,
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '17:00',
                    isRecurring: true,
                })

                const result = await backwardCompatibilityService.forceMigrateStaff(staffId)

                expect(result.success).toBe(true)
                expect(result.migratedSlots).toBe(2) // Only available days
                expect(result.error).toBeUndefined()
            })
        })

        describe('Deprecation Statistics', () => {
            it('should provide comprehensive deprecation statistics', async () => {
                mockPrisma.business.count
                    .mockResolvedValueOnce(10) // businessesUsingJson
                    .mockResolvedValueOnce(20) // totalBusinesses
                    .mockResolvedValueOnce(15) // businessesWithStructured

                mockPrisma.staff.count
                    .mockResolvedValueOnce(25) // staffUsingJson
                    .mockResolvedValueOnce(50) // totalStaff
                    .mockResolvedValueOnce(30) // staffWithStructured

                const result = await backwardCompatibilityService.getDeprecationStatistics()

                expect(result.businessesUsingJson).toBe(10)
                expect(result.staffUsingJson).toBe(25)
                expect(result.totalBusinesses).toBe(20)
                expect(result.totalStaff).toBe(50)
                expect(result.migrationProgress.businesses).toBe(75) // 15/20 * 100
                expect(result.migrationProgress.staff).toBe(60) // 30/50 * 100
            })
        })
    })

    describe('Data Migration Service Integration', () => {
        describe('Full Migration Process', () => {
            it('should migrate all data successfully', async () => {
                const mockBusinesses = [
                    {
                        id: 'business-1',
                        operatingHours: {
                            monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                            tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                        },
                    },
                ]

                const mockStaff = [
                    {
                        id: 'staff-1',
                        businessId: 'business-1',
                        workingHours: {
                            monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                            tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                        },
                    },
                ]

                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    // Mock the transaction callback
                    const tx = {
                        business: {
                            findMany: jest.fn().mockResolvedValue(mockBusinesses),
                        },
                        staff: {
                            findMany: jest.fn().mockResolvedValue(mockStaff),
                        },
                        businessHours: {
                            create: jest.fn().mockResolvedValue({
                                id: 'hours-1',
                                businessId: 'business-1',
                                dayOfWeek: 1,
                            }),
                        },
                        staffAvailability: {
                            create: jest.fn().mockResolvedValue({
                                id: 'availability-1',
                                staffId: 'staff-1',
                                dayOfWeek: 1,
                            }),
                        },
                    }
                    return await callback(tx)
                })

                const result = await dataMigrationService.migrateAllData()

                expect(result.success).toBe(true)
                expect(result.businessesMigrated).toBe(1)
                expect(result.staffMigrated).toBe(1)
                expect(result.errors).toHaveLength(0)
                expect(result.rollbackData).toBeDefined()
            })

            it('should handle migration errors gracefully', async () => {
                mockPrisma.$transaction.mockRejectedValue(new Error('Database transaction failed'))

                const result = await dataMigrationService.migrateAllData()

                expect(result.success).toBe(false)
                expect(result.businessesMigrated).toBe(0)
                expect(result.staffMigrated).toBe(0)
                expect(result.errors).toHaveLength(1)
                expect(result.errors[0].error).toContain('Transaction failed')
            })

            it('should rollback on critical errors', async () => {
                const mockBusinesses = [
                    {
                        id: 'business-1',
                        operatingHours: {
                            monday: { isOpen: 'invalid', openTime: '25:00', closeTime: '17:00' }, // Invalid data
                        },
                    },
                ]

                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    const tx = {
                        business: {
                            findMany: jest.fn().mockResolvedValue(mockBusinesses),
                        },
                        staff: {
                            findMany: jest.fn().mockResolvedValue([]),
                        },
                        businessHours: {
                            create: jest.fn().mockRejectedValue(new Error('validation failed')),
                        },
                    }
                    return await callback(tx)
                })

                const result = await dataMigrationService.migrateAllData()

                expect(result.success).toBe(false)
                expect(result.errors.some((e: any) => e.error.includes('validation failed'))).toBe(true)
            })
        })

        describe('Migration Status', () => {
            it('should provide comprehensive migration status', async () => {
                mockPrisma.business.count
                    .mockResolvedValueOnce(100) // total businesses
                    .mockResolvedValueOnce(30) // businesses with JSON
                    .mockResolvedValueOnce(25) // businesses with structured data

                mockPrisma.staff.count
                    .mockResolvedValueOnce(200) // total staff
                    .mockResolvedValueOnce(80) // staff with JSON
                    .mockResolvedValueOnce(60) // staff with structured data

                const result = await dataMigrationService.getMigrationStatus()

                expect(result.businesses.total).toBe(100)
                expect(result.businesses.withJsonData).toBe(30)
                expect(result.businesses.withStructuredData).toBe(25)
                expect(result.businesses.migrated).toBe(25)
                expect(result.businesses.needsMigration).toBe(5) // 30 - 25

                expect(result.staff.total).toBe(200)
                expect(result.staff.withJsonData).toBe(80)
                expect(result.staff.withStructuredData).toBe(60)
                expect(result.staff.migrated).toBe(60)
                expect(result.staff.needsMigration).toBe(20) // 80 - 60
            })
        })

        describe('Migration Validation', () => {
            it('should validate migration integrity successfully', async () => {
                // Mock successful validation queries
                asMock(mockPrisma.business.findMany).mockResolvedValue([])
                asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
                asMock(mockPrisma.staff.findMany).mockResolvedValue([])
                asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])

                const result = await dataMigrationService.validateMigrationIntegrity()

                expect(result.isValid).toBe(true)
                expect(result.errors).toHaveLength(0)
            })

            it('should detect integrity issues', async () => {
                // Mock businesses with JSON but no structured data
                asMock(mockPrisma.business.findMany).mockResolvedValue([
                    { id: 'business-1' },
                ])

                // Mock invalid time formats
                asMock(mockPrisma.businessHours.findMany).mockResolvedValue([
                    {
                        id: 'hours-1',
                        businessId: 'business-1',
                        openTime: '25:00', // Invalid time
                        closeTime: '17:00',
                    },
                ])

                asMock(mockPrisma.staff.findMany).mockResolvedValue([])
                asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])

                const result = await dataMigrationService.validateMigrationIntegrity()

                expect(result.isValid).toBe(false)
                expect(result.errors.length).toBeGreaterThan(0)
                expect(result.errors.some((e: any) => e.field === 'businessHours')).toBe(true)
            })
        })

        describe('Migration Rollback', () => {
            it('should rollback migration successfully', async () => {
                const rollbackData = {
                    businessHours: [
                        { id: 'hours-1', businessId: 'business-1', dayOfWeek: 1 },
                        { id: 'hours-2', businessId: 'business-1', dayOfWeek: 2 },
                    ],
                    staffAvailability: [
                        { id: 'availability-1', staffId: 'staff-1', dayOfWeek: 1 },
                    ],
                }

                mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                    const tx = {
                        businessHours: {
                            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
                        },
                        staffAvailability: {
                            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                        },
                    }
                    return await callback(tx)
                })

                const result = await dataMigrationService.rollbackMigration(rollbackData)

                expect(result.success).toBe(true)
                expect(result.businessHoursRemoved).toBe(2)
                expect(result.staffAvailabilityRemoved).toBe(1)
                expect(result.errors).toHaveLength(0)
            })

            it('should handle rollback errors', async () => {
                const rollbackData = {
                    businessHours: [{ id: 'hours-1', businessId: 'business-1', dayOfWeek: 1 }],
                    staffAvailability: [],
                }

                mockPrisma.$transaction.mockRejectedValue(new Error('Rollback failed'))

                const result = await dataMigrationService.rollbackMigration(rollbackData)

                expect(result.success).toBe(false)
                expect(result.errors).toHaveLength(1)
                expect(result.errors[0]).toContain('Rollback failed')
            })

            it('should handle missing rollback data', async () => {
                const result = await dataMigrationService.rollbackMigration(undefined)

                expect(result.success).toBe(false)
                expect(result.errors).toHaveLength(1)
                expect(result.errors[0]).toBe('No rollback data provided')
            })
        })
    })

    describe('Integration Between Services', () => {
        it('should coordinate between compatibility and migration services', async () => {
            // Test scenario: Compatibility service detects migration need and triggers migration
            const mockJsonData = {
                monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            }

            // Setup compatibility service to find JSON data
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
            asMock(mockPrisma.business.findUnique).mockResolvedValue({
                operatingHours: mockJsonData,
            })

            // Setup migration service
            asMock(mockPrisma.businessHours.count).mockResolvedValue(0)
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                return await callback(mockPrisma)
            })
            asMock(mockPrisma.businessHours.create).mockResolvedValue({
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false,
            })

            // Get business hours through compatibility service (should trigger migration)
            const compatibilityResult = await backwardCompatibilityService.getBusinessHours(businessId)

            expect(compatibilityResult.source).toBe('json')
            expect(compatibilityResult.migrationNeeded).toBe(true)

            // Wait for async migration
            await new Promise(resolve => setTimeout(resolve, 100))

            // Verify migration was attempted
            expect(mockPrisma.businessHours.count).toHaveBeenCalled()

            // Force migration to complete
            const migrationResult = await backwardCompatibilityService.forceMigrateBusiness(businessId)

            expect(migrationResult.success).toBe(true)
            expect(migrationResult.migratedHours).toBe(2)
        })

        it('should handle concurrent access during migration', async () => {
            const mockJsonData = {
                monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            }

            // Setup for concurrent access
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])
            asMock(mockPrisma.business.findUnique).mockResolvedValue({
                operatingHours: mockJsonData,
            })
            mockPrisma.businessHours.count
                .mockResolvedValueOnce(0) // First check: no structured data
                .mockResolvedValueOnce(1) // Second check: migration completed

            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                return await callback(mockPrisma)
            })
            asMock(mockPrisma.businessHours.create).mockResolvedValue({
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false,
            })

            // Simulate concurrent requests
            const [result1, result2] = await Promise.all([
                backwardCompatibilityService.getBusinessHours(businessId),
                backwardCompatibilityService.getBusinessHours(businessId),
            ])

            expect(result1.source).toBe('json')
            expect(result2.source).toBe('json')
            expect(result1.migrationNeeded).toBe(true)
            expect(result2.migrationNeeded).toBe(true)
        })
    })

    describe('Error Handling and Edge Cases', () => {
        it('should handle database connection failures gracefully', async () => {
            asMock(mockPrisma.businessHours.findMany).mockRejectedValue(new Error('Database connection failed'))

            const result = await backwardCompatibilityService.getBusinessHours(businessId)

            expect(result.source).toBe('default')
            expect(result.hours).toHaveLength(7) // Default hours
            expect(result.migrationNeeded).toBe(false)
        })

        it('should handle partial migration failures', async () => {
            const mockBusinesses = [
                {
                    id: 'business-1',
                    operatingHours: {
                        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    },
                },
                {
                    id: 'business-2',
                    operatingHours: {
                        monday: { isOpen: 'invalid', openTime: '25:00', closeTime: '17:00' }, // Invalid
                    },
                },
            ]

            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    business: {
                        findMany: jest.fn().mockResolvedValue(mockBusinesses),
                    },
                    staff: {
                        findMany: jest.fn().mockResolvedValue([]),
                    },
                    businessHours: {
                        create: jest.fn()
                            .mockResolvedValueOnce({ id: 'hours-1', businessId: 'business-1', dayOfWeek: 1 })
                            .mockRejectedValueOnce(new Error('Invalid data')),
                    },
                }
                return await callback(tx)
            })

            const result = await dataMigrationService.migrateAllData()

            expect(result.success).toBe(false)
            expect(result.businessesMigrated).toBe(1) // One succeeded
            expect(result.errors).toHaveLength(1) // One failed
            expect(result.errors[0].type).toBe('business')
            expect(result.errors[0].id).toBe('business-2')
        })

        it('should handle empty datasets', async () => {
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    business: {
                        findMany: jest.fn().mockResolvedValue([]),
                    },
                    staff: {
                        findMany: jest.fn().mockResolvedValue([]),
                    },
                }
                return await callback(tx)
            })

            const result = await dataMigrationService.migrateAllData()

            expect(result.success).toBe(true)
            expect(result.businessesMigrated).toBe(0)
            expect(result.staffMigrated).toBe(0)
            expect(result.errors).toHaveLength(0)
        })
    })
})