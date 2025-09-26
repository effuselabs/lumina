import { prisma } from '@/lib/prisma'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface EncryptionConfig {
    algorithm: string
    keyLength: number
    ivLength: number
}

export interface EncryptedData {
    encryptedValue: string
    iv: string
    tag?: string
}

export interface DataMaskingOptions {
    maskChar: string
    visibleStart: number
    visibleEnd: number
    minLength: number
}

export interface GDPRExportData {
    personalData: Record<string, any>
    appointments: any[]
    transactions: any[]
    communications: any[]
    metadata: {
        exportDate: Date
        dataRetentionPeriod: string
        businessId: string
        clientId: string
    }
}

export interface DataRetentionPolicy {
    appointmentData: number // days
    transactionData: number // days
    communicationData: number // days
    auditLogs: number // days
    securityLogs: number // days
    deletedClientData: number // days
}

// ============================================================================
// DATA PROTECTION SERVICE
// ============================================================================

export class DataProtectionService {
    private readonly encryptionConfig: EncryptionConfig = {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16
    }

    private readonly encryptionKey: Buffer

    constructor() {
        // Get encryption key from environment or generate one
        const keyString = process.env.DATA_ENCRYPTION_KEY
        if (!keyString) {
            throw new Error('DATA_ENCRYPTION_KEY environment variable is required')
        }

        this.encryptionKey = Buffer.from(keyString, 'hex')

        if (this.encryptionKey.length !== this.encryptionConfig.keyLength) {
            throw new Error(`Encryption key must be ${this.encryptionConfig.keyLength} bytes`)
        }
    }

    // ============================================================================
    // ENCRYPTION METHODS
    // ============================================================================

    /**
     * Encrypt sensitive data
     */
    encrypt(plaintext: string): EncryptedData {
        try {
            const iv = randomBytes(this.encryptionConfig.ivLength)
            const cipher = createCipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv)

            let encrypted = cipher.update(plaintext, 'utf8', 'hex')
            encrypted += cipher.final('hex')

            const tag = cipher.getAuthTag()

            return {
                encryptedValue: encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex')
            }
        } catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData: EncryptedData): string {
        try {
            const iv = Buffer.from(encryptedData.iv, 'hex')
            const tag = Buffer.from(encryptedData.tag || '', 'hex')

            const decipher = createDecipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv)
            decipher.setAuthTag(tag)

            let decrypted = decipher.update(encryptedData.encryptedValue, 'hex', 'utf8')
            decrypted += decipher.final('utf8')

            return decrypted
        } catch (error) {
            throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Hash sensitive data for comparison (one-way)
     */
    hash(data: string, salt?: string): string {
        const saltToUse = salt || randomBytes(16).toString('hex')
        const hash = createHash('sha256')
        hash.update(data + saltToUse)
        return `${saltToUse}:${hash.digest('hex')}`
    }

    /**
     * Verify hashed data
     */
    verifyHash(data: string, hashedData: string): boolean {
        try {
            const [salt, hash] = hashedData.split(':')
            const newHash = this.hash(data, salt)
            return newHash === hashedData
        } catch {
            return false
        }
    }

    // ============================================================================
    // DATA MASKING METHODS
    // ============================================================================

    /**
     * Mask email addresses for logging
     */
    maskEmail(email: string): string {
        if (!email || !email.includes('@')) {
            return '[INVALID_EMAIL]'
        }

        const [localPart, domain] = email.split('@')
        const maskedLocal = this.maskString(localPart, {
            maskChar: '*',
            visibleStart: 1,
            visibleEnd: 1,
            minLength: 3
        })

        const domainParts = domain.split('.')
        const maskedDomain = domainParts.length > 1
            ? `${domainParts[0].charAt(0)}***.${domainParts[domainParts.length - 1]}`
            : `${domain.charAt(0)}***`

        return `${maskedLocal}@${maskedDomain}`
    }

    /**
     * Mask phone numbers for logging
     */
    maskPhone(phone: string): string {
        if (!phone) {
            return '[NO_PHONE]'
        }

        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '')

        if (digits.length < 4) {
            return '***'
        }

        // Show first digit and last 2 digits
        const masked = digits.charAt(0) + '*'.repeat(digits.length - 3) + digits.slice(-2)
        return masked
    }

    /**
     * Mask names for logging
     */
    maskName(name: string): string {
        if (!name) {
            return '[NO_NAME]'
        }

        const parts = name.trim().split(/\s+/)
        return parts.map(part =>
            part.length <= 2 ? part : part.charAt(0) + '*'.repeat(part.length - 1)
        ).join(' ')
    }

    /**
     * Generic string masking
     */
    maskString(str: string, options: DataMaskingOptions): string {
        if (!str || str.length < options.minLength) {
            return options.maskChar.repeat(3)
        }

        const { maskChar, visibleStart, visibleEnd } = options
        const totalVisible = visibleStart + visibleEnd

        if (str.length <= totalVisible) {
            return str.charAt(0) + maskChar.repeat(str.length - 1)
        }

        const start = str.substring(0, visibleStart)
        const end = str.substring(str.length - visibleEnd)
        const middle = maskChar.repeat(str.length - totalVisible)

        return start + middle + end
    }

    /**
     * Mask sensitive data in objects for logging
     */
    maskSensitiveData(data: any): any {
        if (data === null || data === undefined) {
            return data
        }

        if (typeof data === 'string') {
            return '[MASKED_STRING]'
        }

        if (typeof data === 'number') {
            return '[MASKED_NUMBER]'
        }

        if (Array.isArray(data)) {
            return data.map(item => this.maskSensitiveData(item))
        }

        if (typeof data === 'object') {
            const masked: any = {}

            for (const [key, value] of Object.entries(data)) {
                const lowerKey = key.toLowerCase()

                if (this.isSensitiveField(lowerKey)) {
                    if (lowerKey.includes('email')) {
                        masked[key] = typeof value === 'string' ? this.maskEmail(value) : '[MASKED_EMAIL]'
                    } else if (lowerKey.includes('phone')) {
                        masked[key] = typeof value === 'string' ? this.maskPhone(value) : '[MASKED_PHONE]'
                    } else if (lowerKey.includes('name')) {
                        masked[key] = typeof value === 'string' ? this.maskName(value) : '[MASKED_NAME]'
                    } else {
                        masked[key] = '[MASKED]'
                    }
                } else {
                    masked[key] = this.maskSensitiveData(value)
                }
            }

            return masked
        }

        return data
    }

    /**
     * Check if field contains sensitive data
     */
    private isSensitiveField(fieldName: string): boolean {
        const sensitiveFields = [
            'email', 'phone', 'password', 'ssn', 'social', 'credit', 'card',
            'firstname', 'lastname', 'name', 'address', 'street', 'city',
            'zip', 'postal', 'dob', 'birthdate', 'birthday', 'age'
        ]

        return sensitiveFields.some(field => fieldName.includes(field))
    }

    // ============================================================================
    // GDPR COMPLIANCE METHODS
    // ============================================================================

    /**
     * Export all data for a client (GDPR Article 20 - Right to data portability)
     */
    async exportClientData(clientId: string, businessId: string): Promise<GDPRExportData> {
        try {
            // Get client personal data
            const client = await prisma.client.findFirst({
                where: { id: clientId, businessId },
                include: {
                    appointments: {
                        include: {
                            services: true,
                            transactions: true
                        }
                    },
                    communicationHistory: true,
                    loyaltyMemberships: {
                        include: {
                            transactions: true
                        }
                    },
                    reviews: true,
                    campaignRecipients: {
                        include: {
                            campaign: true
                        }
                    }
                }
            })

            if (!client) {
                throw new Error('Client not found or access denied')
            }

            // Get business data retention policy
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true }
            })

            const exportData: GDPRExportData = {
                personalData: {
                    id: client.id,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    email: client.email,
                    phone: client.phone,
                    dateOfBirth: client.dateOfBirth,
                    address: client.address,
                    city: client.city,
                    state: client.state,
                    zipCode: client.zipCode,
                    country: client.country,
                    preferences: client.preferences,
                    notes: client.notes,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt
                },
                appointments: client.appointments.map(appointment => ({
                    id: appointment.id,
                    startTime: appointment.startTime,
                    endTime: appointment.endTime,
                    status: appointment.status,
                    totalPrice: appointment.totalPrice,
                    notes: appointment.notes,
                    services: appointment.services.map(service => ({
                        serviceName: service.serviceName,
                        price: service.price,
                        duration: service.duration
                    })),
                    createdAt: appointment.createdAt
                })),
                transactions: client.appointments.flatMap(appointment =>
                    appointment.transactions.map(transaction => ({
                        id: transaction.id,
                        amount: transaction.amount,
                        type: transaction.type,
                        status: transaction.status,
                        paymentMethod: transaction.paymentMethod,
                        createdAt: transaction.createdAt
                    }))
                ),
                communications: client.communicationHistory.map(comm => ({
                    id: comm.id,
                    type: comm.type,
                    direction: comm.direction,
                    channel: comm.channel,
                    subject: comm.subject,
                    content: comm.content,
                    status: comm.status,
                    createdAt: comm.createdAt
                })),
                metadata: {
                    exportDate: new Date(),
                    dataRetentionPeriod: '7 years', // Default retention period
                    businessId,
                    clientId,
                    businessName: business?.name || 'Unknown Business'
                }
            }

            // Log the export request
            await prisma.auditLog.create({
                data: {
                    userId: 'system', // System-generated export
                    businessId,
                    action: 'GDPR_DATA_EXPORT',
                    resourceType: 'client',
                    resourceId: clientId,
                    metadata: {
                        exportType: 'full_data_export',
                        recordCount: {
                            appointments: exportData.appointments.length,
                            transactions: exportData.transactions.length,
                            communications: exportData.communications.length
                        }
                    }
                }
            })

            return exportData
        } catch (error) {
            throw new Error(`Failed to export client data: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Delete all client data (GDPR Article 17 - Right to erasure)
     */
    async deleteClientData(
        clientId: string,
        businessId: string,
        requestedBy: string,
        reason: string = 'Client request'
    ): Promise<{
        deletedRecords: Record<string, number>
        retainedRecords: Record<string, number>
        deletionDate: Date
    }> {
        try {
            const deletionDate = new Date()
            const deletedRecords: Record<string, number> = {}
            const retainedRecords: Record<string, number> = {}

            // Verify client exists and belongs to business
            const client = await prisma.client.findFirst({
                where: { id: clientId, businessId }
            })

            if (!client) {
                throw new Error('Client not found or access denied')
            }

            // Use transaction to ensure data consistency
            await prisma.$transaction(async (tx) => {
                // 1. Delete communication history (unless required for legal compliance)
                const deletedComms = await tx.communicationHistory.deleteMany({
                    where: { clientId, businessId }
                })
                deletedRecords.communicationHistory = deletedComms.count

                // 2. Delete loyalty memberships and transactions
                const loyaltyMemberships = await tx.loyaltyMembership.findMany({
                    where: { clientId }
                })

                for (const membership of loyaltyMemberships) {
                    const deletedLoyaltyTxns = await tx.loyaltyTransaction.deleteMany({
                        where: { loyaltyMembershipId: membership.id }
                    })
                    deletedRecords.loyaltyTransactions = (deletedRecords.loyaltyTransactions || 0) + deletedLoyaltyTxns.count
                }

                const deletedMemberships = await tx.loyaltyMembership.deleteMany({
                    where: { clientId }
                })
                deletedRecords.loyaltyMemberships = deletedMemberships.count

                // 3. Delete reviews
                const deletedReviews = await tx.clientReview.deleteMany({
                    where: { clientId, businessId }
                })
                deletedRecords.clientReviews = deletedReviews.count

                // 4. Delete campaign recipients
                const deletedCampaignRecipients = await tx.campaignRecipient.deleteMany({
                    where: { clientId }
                })
                deletedRecords.campaignRecipients = deletedCampaignRecipients.count

                // 5. Handle appointments - anonymize instead of delete for business records
                const appointments = await tx.appointment.findMany({
                    where: { clientId, businessId },
                    include: { transactions: true }
                })

                retainedRecords.appointments = appointments.length

                // Anonymize appointment data
                for (const appointment of appointments) {
                    await tx.appointment.update({
                        where: { id: appointment.id },
                        data: {
                            clientId: null, // Remove client reference
                            clientName: '[DELETED CLIENT]',
                            clientEmail: null,
                            clientPhone: null,
                            notes: appointment.notes ? '[CLIENT DATA DELETED]' : null
                        }
                    })

                    // Keep transaction records for financial compliance but anonymize
                    retainedRecords.transactions = (retainedRecords.transactions || 0) + appointment.transactions.length
                }

                // 6. Delete appointment preferences
                const deletedPreferences = await tx.appointmentPreferences.deleteMany({
                    where: { clientId, businessId }
                })
                deletedRecords.appointmentPreferences = deletedPreferences.count

                // 7. Finally, delete the client record
                await tx.client.delete({
                    where: { id: clientId }
                })
                deletedRecords.client = 1

                // 8. Create audit log for the deletion
                await tx.auditLog.create({
                    data: {
                        userId: requestedBy,
                        businessId,
                        action: 'GDPR_DATA_DELETION',
                        resourceType: 'client',
                        resourceId: clientId,
                        oldValues: {
                            firstName: client.firstName,
                            lastName: client.lastName,
                            email: this.maskEmail(client.email || ''),
                            phone: this.maskPhone(client.phone || '')
                        },
                        metadata: {
                            reason,
                            deletionDate,
                            deletedRecords,
                            retainedRecords,
                            gdprCompliance: true
                        }
                    }
                })
            })

            return {
                deletedRecords,
                retainedRecords,
                deletionDate
            }
        } catch (error) {
            throw new Error(`Failed to delete client data: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Anonymize old data based on retention policy
     */
    async anonymizeExpiredData(businessId: string, retentionPolicy: DataRetentionPolicy): Promise<{
        anonymizedRecords: Record<string, number>
        deletedRecords: Record<string, number>
    }> {
        const anonymizedRecords: Record<string, number> = {}
        const deletedRecords: Record<string, number> = {}

        try {
            await prisma.$transaction(async (tx) => {
                const now = new Date()

                // 1. Anonymize old appointment data
                const appointmentCutoff = new Date(now.getTime() - retentionPolicy.appointmentData * 24 * 60 * 60 * 1000)
                const oldAppointments = await tx.appointment.updateMany({
                    where: {
                        businessId,
                        createdAt: { lt: appointmentCutoff },
                        clientName: { not: '[ANONYMIZED]' }
                    },
                    data: {
                        clientName: '[ANONYMIZED]',
                        clientEmail: null,
                        clientPhone: null,
                        notes: null,
                        internalNotes: null
                    }
                })
                anonymizedRecords.appointments = oldAppointments.count

                // 2. Delete old communication history
                const commCutoff = new Date(now.getTime() - retentionPolicy.communicationData * 24 * 60 * 60 * 1000)
                const deletedComms = await tx.communicationHistory.deleteMany({
                    where: {
                        businessId,
                        createdAt: { lt: commCutoff }
                    }
                })
                deletedRecords.communicationHistory = deletedComms.count

                // 3. Delete old audit logs
                const auditCutoff = new Date(now.getTime() - retentionPolicy.auditLogs * 24 * 60 * 60 * 1000)
                const deletedAuditLogs = await tx.auditLog.deleteMany({
                    where: {
                        businessId,
                        createdAt: { lt: auditCutoff }
                    }
                })
                deletedRecords.auditLogs = deletedAuditLogs.count

                // 4. Delete old security logs
                const securityCutoff = new Date(now.getTime() - retentionPolicy.securityLogs * 24 * 60 * 60 * 1000)
                const deletedSecurityLogs = await tx.SecurityLog.deleteMany({
                    where: {
                        businessId,
                        createdAt: { lt: securityCutoff }
                    }
                })
                deletedRecords.securityLogs = deletedSecurityLogs.count

                // 5. Log the anonymization process
                await tx.AuditLog.create({
                    data: {
                        userId: 'system',
                        businessId,
                        action: 'DATA_RETENTION_CLEANUP',
                        resourceType: 'business',
                        resourceId: businessId,
                        metadata: {
                            retentionPolicy,
                            anonymizedRecords,
                            deletedRecords,
                            processDate: now
                        }
                    }
                })
            })

            return { anonymizedRecords, deletedRecords }
        } catch (error) {
            throw new Error(`Failed to anonymize expired data: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // ============================================================================
    // DATA VALIDATION AND SANITIZATION
    // ============================================================================

    /**
     * Sanitize input data to prevent injection attacks
     */
    sanitizeInput(input: string): string {
        if (!input) return input

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
            .trim()
    }

    /**
     * Validate email format and sanitize
     */
    validateAndSanitizeEmail(email: string): string | null {
        if (!email) return null

        const sanitized = this.sanitizeInput(email.toLowerCase())
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        return emailRegex.test(sanitized) ? sanitized : null
    }

    /**
     * Validate and sanitize phone number
     */
    validateAndSanitizePhone(phone: string): string | null {
        if (!phone) return null

        // Remove all non-digit characters except + for international numbers
        const sanitized = phone.replace(/[^\d+]/g, '')

        // Basic validation - should have at least 10 digits
        const digitCount = sanitized.replace(/\D/g, '').length

        return digitCount >= 10 ? sanitized : null
    }

    /**
     * Validate and sanitize name
     */
    validateAndSanitizeName(name: string): string | null {
        if (!name) return null

        const sanitized = this.sanitizeInput(name)
            .replace(/[^a-zA-Z\s'-]/g, '') // Only allow letters, spaces, hyphens, and apostrophes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()

        return sanitized.length >= 1 ? sanitized : null
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const dataProtection = new DataProtectionService()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Encrypt sensitive client information
 */
export function encryptClientData(data: string): EncryptedData {
    return dataProtection.encrypt(data)
}

/**
 * Decrypt sensitive client information
 */
export function decryptClientData(encryptedData: EncryptedData): string {
    return dataProtection.decrypt(encryptedData)
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
    return dataProtection.maskSensitiveData(data)
}

/**
 * Export client data for GDPR compliance
 */
export async function exportGDPRData(clientId: string, businessId: string): Promise<GDPRExportData> {
    return dataProtection.exportClientData(clientId, businessId)
}

/**
 * Delete client data for GDPR compliance
 */
export async function deleteGDPRData(
    clientId: string,
    businessId: string,
    requestedBy: string,
    reason?: string
) {
    return dataProtection.deleteClientData(clientId, businessId, requestedBy, reason)
}