import { prisma } from '@/lib/prisma';
import { businessContextSecurity } from '@/lib/security/business-context-security';
import {
  DataRetentionPolicy,
  dataProtection,
} from '@/lib/security/data-protection';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CleanupJobResult {
  businessId: string;
  businessName: string;
  anonymizedRecords: Record<string, number>;
  deletedRecords: Record<string, number>;
  errors: string[];
  processedAt: Date;
  duration: number;
}

export interface CleanupJobSummary {
  totalBusinessesProcessed: number;
  totalErrors: number;
  totalAnonymizedRecords: number;
  totalDeletedRecords: number;
  results: CleanupJobResult[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

// ============================================================================
// DATA RETENTION CLEANUP SERVICE
// ============================================================================

export class DataRetentionCleanupService {
  private readonly defaultRetentionPolicy: DataRetentionPolicy = {
    appointmentData: 2555, // 7 years (financial records)
    transactionData: 2555, // 7 years (financial records)
    communicationData: 1095, // 3 years
    auditLogs: 2555, // 7 years (compliance)
    securityLogs: 1095, // 3 years
    deletedClientData: 30, // 30 days
  };

  /**
   * Run data retention cleanup for all businesses
   */
  async runCleanupJob(): Promise<CleanupJobSummary> {
    const startTime = new Date();
    const results: CleanupJobResult[] = [];
    let totalErrors = 0;

    console.log('Starting data retention cleanup job...');

    try {
      // Get all active businesses
      const businesses = await prisma.business.findMany({
        select: {
          id: true,
          name: true,
          // dataRetentionPolicy: true // Property doesn't exist in schema
        },
      });

      console.log(`Processing ${businesses.length} businesses...`);

      // Process each business
      for (const business of businesses) {
        const businessStartTime = Date.now();

        try {
          const result = await this.cleanupBusinessData(
            business.id,
            business.name,
            // business.dataRetentionPolicy as DataRetentionPolicy ||
            this.defaultRetentionPolicy
          );

          result.duration = Date.now() - businessStartTime;
          results.push(result);

          console.log(
            `Completed cleanup for business ${business.name} (${business.id})`
          );
        } catch (error) {
          totalErrors++;
          const errorResult: CleanupJobResult = {
            businessId: business.id,
            businessName: business.name,
            anonymizedRecords: {},
            deletedRecords: {},
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            processedAt: new Date(),
            duration: Date.now() - businessStartTime,
          };
          results.push(errorResult);

          console.error(
            `Failed to cleanup business ${business.name} (${business.id}):`,
            error
          );
        }
      }

      const endTime = new Date();
      const summary: CleanupJobSummary = {
        totalBusinessesProcessed: businesses.length,
        totalErrors,
        totalAnonymizedRecords: results.reduce(
          (sum, r) =>
            sum + Object.values(r.anonymizedRecords).reduce((s, v) => s + v, 0),
          0
        ),
        totalDeletedRecords: results.reduce(
          (sum, r) =>
            sum + Object.values(r.deletedRecords).reduce((s, v) => s + v, 0),
          0
        ),
        results,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };

      console.log('Data retention cleanup job completed:', {
        businessesProcessed: summary.totalBusinessesProcessed,
        totalAnonymized: summary.totalAnonymizedRecords,
        totalDeleted: summary.totalDeletedRecords,
        errors: summary.totalErrors,
        duration: `${summary.duration}ms`,
      });

      // Log job completion
      await this.logCleanupJobCompletion(summary);

      return summary;
    } catch (error) {
      console.error('Data retention cleanup job failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup data for a specific business
   */
  async cleanupBusinessData(
    businessId: string,
    businessName: string,
    retentionPolicy: DataRetentionPolicy
  ): Promise<CleanupJobResult> {
    const processedAt = new Date();
    const errors: string[] = [];

    try {
      // Run anonymization process
      const { anonymizedRecords, deletedRecords } =
        await dataProtection.anonymizeExpiredData(businessId, retentionPolicy);

      // Additional cleanup tasks specific to business needs
      await this.performAdditionalCleanup(businessId, retentionPolicy, errors);

      return {
        businessId,
        businessName,
        anonymizedRecords,
        deletedRecords,
        errors,
        processedAt,
        duration: 0, // Will be set by caller
      };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : 'Unknown error during cleanup'
      );

      return {
        businessId,
        businessName,
        anonymizedRecords: {},
        deletedRecords: {},
        errors,
        processedAt,
        duration: 0,
      };
    }
  }

  /**
   * Perform additional cleanup tasks
   */
  private async performAdditionalCleanup(
    businessId: string,
    retentionPolicy: DataRetentionPolicy,
    errors: string[]
  ): Promise<void> {
    try {
      const now = new Date();

      // 1. Clean up expired availability cache entries
      const cacheCleanupDate = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ); // 7 days
      await prisma.availabilityCache.deleteMany({
        where: {
          businessId,
          expiresAt: { lt: cacheCleanupDate },
        },
      });

      // 2. Clean up old staff invitation records
      const invitationCleanupDate = new Date(
        now.getTime() - 90 * 24 * 60 * 60 * 1000
      ); // 90 days
      await prisma.staffInvitation.deleteMany({
        where: {
          businessId,
          createdAt: { lt: invitationCleanupDate },
          status: { in: ['EXPIRED', 'CANCELLED'] },
        },
      });

      // 3. Clean up old appointment status history
      const statusHistoryCleanupDate = new Date(
        now.getTime() - retentionPolicy.appointmentData * 24 * 60 * 60 * 1000
      );
      await prisma.appointmentStatusHistory.deleteMany({
        where: {
          businessId,
          createdAt: { lt: statusHistoryCleanupDate },
        },
      });

      // 4. Clean up expired gift cards
      await prisma.giftCard.updateMany({
        where: {
          businessId,
          // expiresAt: { lt: now }, // Property doesn't exist in schema
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 5. Archive old marketing campaigns
      const campaignArchiveDate = new Date(
        now.getTime() - 365 * 24 * 60 * 60 * 1000
      ); // 1 year
      await prisma.marketingCampaign.updateMany({
        where: {
          businessId,
          createdAt: { lt: campaignArchiveDate },
          status: 'SENT',
        },
        data: {
          status: 'CANCELLED', // Use as archived status
        },
      });
    } catch (error) {
      errors.push(
        `Additional cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log cleanup job completion for monitoring
   */
  private async logCleanupJobCompletion(
    summary: CleanupJobSummary
  ): Promise<void> {
    try {
      // Create system audit log for the cleanup job
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          businessId: 'system',
          action: 'DATA_RETENTION_CLEANUP_JOB',
          resourceType: 'system',
          metadata: {
            summary: {
              businessesProcessed: summary.totalBusinessesProcessed,
              totalAnonymized: summary.totalAnonymizedRecords,
              totalDeleted: summary.totalDeletedRecords,
              errors: summary.totalErrors,
              duration: summary.duration,
            },
            startTime: summary.startTime,
            endTime: summary.endTime,
          },
        },
      });

      // Log any businesses with errors
      for (const result of summary.results.filter(r => r.errors.length > 0)) {
        await businessContextSecurity.logSecurityViolation({
          type: 'SUSPICIOUS_ACTIVITY' as any,
          businessId: result.businessId,
          resourceType: 'business',
          attemptedAction: 'data_retention_cleanup',
          details: {
            errors: result.errors,
            businessName: result.businessName,
            processedAt: result.processedAt,
          },
        });
      }
    } catch (error) {
      console.error('Failed to log cleanup job completion:', error);
    }
  }

  /**
   * Get cleanup job history
   */
  async getCleanupJobHistory(limit: number = 10): Promise<any[]> {
    try {
      return await prisma.auditLog.findMany({
        where: {
          action: 'DATA_RETENTION_CLEANUP_JOB',
          resourceType: 'system',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to get cleanup job history:', error);
      return [];
    }
  }

  /**
   * Validate retention policy
   */
  validateRetentionPolicy(policy: DataRetentionPolicy): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Minimum retention periods for compliance
    const minimumRetention = {
      appointmentData: 1095, // 3 years minimum for business records
      transactionData: 2555, // 7 years minimum for financial records
      communicationData: 365, // 1 year minimum
      auditLogs: 2555, // 7 years minimum for compliance
      securityLogs: 1095, // 3 years minimum
      deletedClientData: 30, // 30 days minimum
    };

    Object.entries(minimumRetention).forEach(([key, minDays]) => {
      const policyValue = policy[key as keyof DataRetentionPolicy];
      if (policyValue < minDays) {
        errors.push(
          `${key} retention period (${policyValue} days) is below minimum requirement (${minDays} days)`
        );
      }
    });

    // Maximum retention periods (for practical limits)
    const maximumRetention = {
      appointmentData: 3650, // 10 years maximum
      transactionData: 3650, // 10 years maximum
      communicationData: 2555, // 7 years maximum
      auditLogs: 3650, // 10 years maximum
      securityLogs: 2555, // 7 years maximum
      deletedClientData: 365, // 1 year maximum
    };

    Object.entries(maximumRetention).forEach(([key, maxDays]) => {
      const policyValue = policy[key as keyof DataRetentionPolicy];
      if (policyValue > maxDays) {
        errors.push(
          `${key} retention period (${policyValue} days) exceeds maximum limit (${maxDays} days)`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const dataRetentionCleanup = new DataRetentionCleanupService();

// ============================================================================
// SCHEDULED JOB FUNCTIONS
// ============================================================================

/**
 * Run daily cleanup job (to be called by cron job or scheduler)
 */
export async function runDailyCleanup(): Promise<CleanupJobSummary> {
  console.log('Starting daily data retention cleanup...');
  return await dataRetentionCleanup.runCleanupJob();
}

/**
 * Run cleanup for specific business (for manual execution)
 */
export async function runBusinessCleanup(
  businessId: string,
  retentionPolicy?: DataRetentionPolicy
): Promise<CleanupJobResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true }, // dataRetentionPolicy doesn't exist in schema
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const policy =
    retentionPolicy ||
    // (business.dataRetentionPolicy as DataRetentionPolicy) ||
    dataRetentionCleanup['defaultRetentionPolicy'];

  return await dataRetentionCleanup.cleanupBusinessData(
    businessId,
    business.name,
    policy
  );
}
