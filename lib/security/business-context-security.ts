import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BusinessRole, UserRole } from '@prisma/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SecurityContext {
  userId: string;
  businessId: string;
  userRole: UserRole;
  businessRole: BusinessRole;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface SecurityViolation {
  type: SecurityViolationType;
  userId?: string;
  businessId?: string;
  resourceId?: string;
  resourceType: string;
  attemptedAction: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export enum SecurityViolationType {
  UNAUTHORIZED_BUSINESS_ACCESS = 'UNAUTHORIZED_BUSINESS_ACCESS',
  INVALID_BUSINESS_CONTEXT = 'INVALID_BUSINESS_CONTEXT',
  CROSS_TENANT_DATA_ACCESS = 'CROSS_TENANT_DATA_ACCESS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVALID_RESOURCE_OWNERSHIP = 'INVALID_RESOURCE_OWNERSHIP',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface AuditLogEntry {
  userId: string;
  businessId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface BusinessContextValidationResult {
  isValid: boolean;
  securityContext?: SecurityContext;
  violations: SecurityViolation[];
}

// ============================================================================
// BUSINESS CONTEXT SECURITY SERVICE
// ============================================================================

export class BusinessContextSecurityService {
  /**
   * Validate business context for any operation
   */
  async validateBusinessContext(
    businessId: string,
    userId?: string,
    requiredRoles?: BusinessRole[],
    metadata?: Record<string, any>
  ): Promise<BusinessContextValidationResult> {
    const violations: SecurityViolation[] = [];

    try {
      // Get current user if not provided
      const currentUser = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            include: {
              businesses: {
                include: {
                  business: true,
                },
              },
            },
          })
        : await getCurrentUser();

      if (!currentUser) {
        violations.push({
          type: SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS,
          businessId,
          resourceType: 'business',
          attemptedAction: 'access_validation',
          details: { reason: 'No authenticated user found', ...metadata },
        });

        await this.logSecurityViolation(violations[0]);
        return { isValid: false, violations };
      }

      // Find business relationship
      const businessUser = currentUser.businesses.find(
        bu => bu.businessId === businessId
      );

      if (!businessUser) {
        violations.push({
          type: SecurityViolationType.INVALID_BUSINESS_CONTEXT,
          userId: currentUser.id,
          businessId,
          resourceType: 'business',
          attemptedAction: 'access_validation',
          details: {
            reason: 'User not associated with business',
            userBusinesses: currentUser.businesses.map(bu => bu.businessId),
            ...metadata,
          },
        });

        await this.logSecurityViolation(violations[0]);
        return { isValid: false, violations };
      }

      // Check role requirements
      if (requiredRoles && !requiredRoles.includes(businessUser.role)) {
        violations.push({
          type: SecurityViolationType.INSUFFICIENT_PERMISSIONS,
          userId: currentUser.id,
          businessId,
          resourceType: 'business',
          attemptedAction: 'role_validation',
          details: {
            userRole: businessUser.role,
            requiredRoles,
            ...metadata,
          },
        });

        await this.logSecurityViolation(violations[0]);
        return { isValid: false, violations };
      }

      const securityContext: SecurityContext = {
        userId: currentUser.id,
        businessId,
        userRole: currentUser.role,
        businessRole: businessUser.role,
        ...metadata,
      };

      return { isValid: true, securityContext, violations: [] };
    } catch (error) {
      violations.push({
        type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
        userId,
        businessId,
        resourceType: 'business',
        attemptedAction: 'context_validation',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata,
        },
      });

      await this.logSecurityViolation(violations[0]);
      return { isValid: false, violations };
    }
  }

  /**
   * Validate resource ownership within business context
   */
  async validateResourceOwnership(
    resourceType: string,
    resourceId: string,
    businessId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<BusinessContextValidationResult> {
    const violations: SecurityViolation[] = [];

    try {
      // First validate business context
      const businessValidation = await this.validateBusinessContext(
        businessId,
        userId,
        undefined,
        metadata
      );
      if (!businessValidation.isValid) {
        return businessValidation;
      }

      // Validate resource belongs to business
      const isValidOwnership = await this.checkResourceOwnership(
        resourceType,
        resourceId,
        businessId
      );

      if (!isValidOwnership) {
        violations.push({
          type: SecurityViolationType.INVALID_RESOURCE_OWNERSHIP,
          userId: businessValidation.securityContext?.userId,
          businessId,
          resourceId,
          resourceType,
          attemptedAction: 'resource_access',
          details: {
            reason: 'Resource does not belong to business context',
            ...metadata,
          },
        });

        await this.logSecurityViolation(violations[0]);
        return { isValid: false, violations };
      }

      return businessValidation;
    } catch (error) {
      violations.push({
        type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
        userId,
        businessId,
        resourceId,
        resourceType,
        attemptedAction: 'ownership_validation',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata,
        },
      });

      await this.logSecurityViolation(violations[0]);
      return { isValid: false, violations };
    }
  }

  /**
   * Check if a resource belongs to the specified business
   */
  private async checkResourceOwnership(
    resourceType: string,
    resourceId: string,
    businessId: string
  ): Promise<boolean> {
    try {
      switch (resourceType.toLowerCase()) {
        case 'appointment':
          const appointment = await prisma.appointment.findFirst({
            where: { id: resourceId, businessId },
            select: { id: true },
          });
          return !!appointment;

        case 'client':
          const client = await prisma.client.findFirst({
            where: { id: resourceId, businessId },
            select: { id: true },
          });
          return !!client;

        case 'staff':
          const staff = await prisma.staff.findFirst({
            where: { id: resourceId, businessId },
            select: { id: true },
          });
          return !!staff;

        case 'service':
          const service = await prisma.service.findFirst({
            where: { id: resourceId, businessId },
            select: { id: true },
          });
          return !!service;

        case 'transaction':
          const transaction = await prisma.transaction.findFirst({
            where: { id: resourceId, businessId },
            select: { id: true },
          });
          return !!transaction;

        default:
          // For unknown resource types, assume invalid
          return false;
      }
    } catch (error) {
      // Log error and return false for safety
      console.error(
        `Error checking resource ownership for ${resourceType}:${resourceId}`,
        error
      );
      return false;
    }
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(violation: SecurityViolation): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          type: violation.type,
          userId: violation.userId,
          businessId: violation.businessId,
          resourceId: violation.resourceId,
          resourceType: violation.resourceType,
          attemptedAction: violation.attemptedAction,
          details: violation.details,
          ipAddress: violation.ipAddress,
          userAgent: violation.userAgent,
          requestId: violation.requestId,
          severity: this.getSeverityLevel(violation.type),
          createdAt: new Date(),
        },
      });

      // Log to console for immediate visibility
      console.warn('Security Violation:', {
        type: violation.type,
        userId: violation.userId,
        businessId: violation.businessId,
        resourceId: violation.resourceId,
        action: violation.attemptedAction,
        details: violation.details,
      });

      // Check if this requires immediate alerting
      if (this.requiresImmediateAlert(violation.type)) {
        await this.triggerSecurityAlert(violation);
      }
    } catch (error) {
      // Critical: Security logging failed
      console.error('CRITICAL: Failed to log security violation', {
        violation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create audit log entry for appointment modifications
   */
  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          businessId: entry.businessId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to create audit log entry', {
        entry,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get security violations for a business (for monitoring)
   */
  async getSecurityViolations(
    businessId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      types?: SecurityViolationType[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    violations: any[];
    total: number;
    summary: Record<SecurityViolationType, number>;
  }> {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      types,
      limit = 50,
      offset = 0,
    } = options;

    try {
      const where = {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(types && { type: { in: types } }),
      };

      const [violations, total, summary] = await Promise.all([
        prisma.securityLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.securityLog.count({ where }),
        prisma.securityLog.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
      ]);

      const summaryMap = summary.reduce(
        (acc, item) => {
          acc[item.type as SecurityViolationType] = item._count.type;
          return acc;
        },
        {} as Record<SecurityViolationType, number>
      );

      return { violations, total, summary: summaryMap };
    } catch (error) {
      console.error('Failed to get security violations', error);
      return {
        violations: [],
        total: 0,
        summary: {} as Record<SecurityViolationType, number>,
      };
    }
  }

  /**
   * Get audit trail for a specific resource
   */
  async getAuditTrail(
    resourceType: string,
    resourceId: string,
    businessId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    entries: any[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    try {
      const where = {
        businessId,
        resourceType,
        resourceId,
      };

      const [entries, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { entries, total };
    } catch (error) {
      console.error('Failed to get audit trail', error);
      return { entries: [], total: 0 };
    }
  }

  /**
   * Validate appointment access with comprehensive security checks
   */
  async validateAppointmentAccess(
    appointmentId: string,
    businessId: string,
    userId?: string,
    requiredAction?: string,
    metadata?: Record<string, any>
  ): Promise<BusinessContextValidationResult> {
    return this.validateResourceOwnership(
      'appointment',
      appointmentId,
      businessId,
      userId,
      { action: requiredAction, ...metadata }
    );
  }

  /**
   * Validate client access with business context
   */
  async validateClientAccess(
    clientId: string,
    businessId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<BusinessContextValidationResult> {
    return this.validateResourceOwnership(
      'client',
      clientId,
      businessId,
      userId,
      metadata
    );
  }

  /**
   * Validate staff access with business context
   */
  async validateStaffAccess(
    staffId: string,
    businessId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<BusinessContextValidationResult> {
    return this.validateResourceOwnership(
      'staff',
      staffId,
      businessId,
      userId,
      metadata
    );
  }

  /**
   * Get severity level for violation type
   */
  private getSeverityLevel(type: SecurityViolationType): string {
    switch (type) {
      case SecurityViolationType.CROSS_TENANT_DATA_ACCESS:
      case SecurityViolationType.UNAUTHORIZED_BUSINESS_ACCESS:
        return 'HIGH';
      case SecurityViolationType.INVALID_BUSINESS_CONTEXT:
      case SecurityViolationType.INVALID_RESOURCE_OWNERSHIP:
        return 'MEDIUM';
      case SecurityViolationType.INSUFFICIENT_PERMISSIONS:
      case SecurityViolationType.RESOURCE_NOT_FOUND:
        return 'LOW';
      case SecurityViolationType.SUSPICIOUS_ACTIVITY:
      case SecurityViolationType.RATE_LIMIT_EXCEEDED:
        return 'HIGH';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Check if violation requires immediate alerting
   */
  private requiresImmediateAlert(type: SecurityViolationType): boolean {
    return [
      SecurityViolationType.CROSS_TENANT_DATA_ACCESS,
      SecurityViolationType.SUSPICIOUS_ACTIVITY,
      SecurityViolationType.RATE_LIMIT_EXCEEDED,
    ].includes(type);
  }

  /**
   * Trigger security alert (placeholder for notification system)
   */
  private async triggerSecurityAlert(
    violation: SecurityViolation
  ): Promise<void> {
    // TODO: Integrate with notification system when available
    console.error('SECURITY ALERT:', {
      type: violation.type,
      userId: violation.userId,
      businessId: violation.businessId,
      details: violation.details,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const businessContextSecurity = new BusinessContextSecurityService();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Validate business context for any operation
 */
export async function validateBusinessContext(
  businessId: string,
  userId?: string,
  requiredRoles?: BusinessRole[],
  metadata?: Record<string, any>
): Promise<BusinessContextValidationResult> {
  return businessContextSecurity.validateBusinessContext(
    businessId,
    userId,
    requiredRoles,
    metadata
  );
}

/**
 * Validate resource ownership within business context
 */
export async function validateResourceOwnership(
  resourceType: string,
  resourceId: string,
  businessId: string,
  userId?: string,
  metadata?: Record<string, any>
): Promise<BusinessContextValidationResult> {
  return businessContextSecurity.validateResourceOwnership(
    resourceType,
    resourceId,
    businessId,
    userId,
    metadata
  );
}

/**
 * Log security violation
 */
export async function logSecurityViolation(
  violation: SecurityViolation
): Promise<void> {
  return businessContextSecurity.logSecurityViolation(violation);
}

/**
 * Create audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  return businessContextSecurity.createAuditLog(entry);
}
