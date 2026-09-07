/**
 * Audit logging specifically for public booking activities
 * Implements comprehensive logging for all public booking operations
 */

import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Public booking audit event types
export enum PublicBookingAuditEvent {
  // Business information access
  BUSINESS_INFO_ACCESSED = 'BUSINESS_INFO_ACCESSED',
  SERVICES_VIEWED = 'SERVICES_VIEWED',

  // Availability checks
  AVAILABILITY_CHECKED = 'AVAILABILITY_CHECKED',
  TIME_SLOT_SELECTED = 'TIME_SLOT_SELECTED',

  // Client interactions
  CLIENT_LOOKUP_PERFORMED = 'CLIENT_LOOKUP_PERFORMED',
  CLIENT_DATA_PREFILLED = 'CLIENT_DATA_PREFILLED',

  // Booking operations
  BOOKING_INITIATED = 'BOOKING_INITIATED',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  BOOKING_FAILED = 'BOOKING_FAILED',

  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
  INPUT_SANITIZATION_TRIGGERED = 'INPUT_SANITIZATION_TRIGGERED',
  SUSPICIOUS_ACTIVITY_DETECTED = 'SUSPICIOUS_ACTIVITY_DETECTED',

  // System events
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  PERFORMANCE_THRESHOLD_EXCEEDED = 'PERFORMANCE_THRESHOLD_EXCEEDED',
}

// Audit log entry for public booking
export interface PublicBookingAuditEntry {
  event: PublicBookingAuditEvent;
  businessId: string;
  sessionId?: string;
  clientId?: string;
  appointmentId?: string;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  requestId?: string;

  // Event-specific data
  eventData?: Record<string, any>;

  // Performance metrics
  responseTime?: number;

  // Security context
  securityFlags?: string[];
  riskScore?: number;

  // Error information
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
}

// Risk assessment levels
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class PublicBookingAuditLogger {
  /**
   * Log public booking audit event
   */
  async logEvent(entry: PublicBookingAuditEntry): Promise<void> {
    try {
      // Calculate risk score
      const riskScore = this.calculateRiskScore(entry);
      const riskLevel = this.getRiskLevel(riskScore);

      // Create audit log entry
      await prisma.publicBookingAuditLog.create({
        data: {
          event: entry.event,
          businessId: entry.businessId,
          sessionId: entry.sessionId,
          clientId: entry.clientId,
          appointmentId: entry.appointmentId,

          // Request context
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          referer: entry.referer,
          requestId: entry.requestId,

          // Event data
          eventData: entry.eventData || {},

          // Performance
          responseTime: entry.responseTime,

          // Security
          securityFlags: entry.securityFlags || [],
          riskScore: riskScore,
          riskLevel: riskLevel,

          // Error information
          errorType: entry.errorType,
          errorMessage: entry.errorMessage,
          stackTrace: entry.stackTrace,

          createdAt: new Date(),
        },
      });

      // Log high-risk events to console for immediate attention
      if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
        console.warn('HIGH RISK PUBLIC BOOKING EVENT:', {
          event: entry.event,
          businessId: entry.businessId,
          riskScore,
          riskLevel,
          ipAddress: entry.ipAddress,
          eventData: entry.eventData,
        });
      }

      // Trigger alerts for critical events
      if (riskLevel === RiskLevel.CRITICAL) {
        await this.triggerCriticalAlert(entry, riskScore);
      }
    } catch (error) {
      // Critical: Audit logging failed
      console.error('CRITICAL: Failed to log public booking audit event', {
        entry,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Try to log to fallback system (console at minimum)
      this.logToFallback(entry, error);
    }
  }

  /**
   * Log business information access
   */
  async logBusinessAccess(
    businessId: string,
    req: NextRequest,
    responseTime?: number,
    eventData?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      event: PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED,
      businessId,
      ...this.extractRequestContext(req),
      responseTime,
      eventData,
    });
  }

  /**
   * Log availability check
   */
  async logAvailabilityCheck(
    businessId: string,
    req: NextRequest,
    eventData: {
      serviceIds?: string[];
      staffId?: string;
      date?: string;
      slotsFound?: number;
    },
    responseTime?: number
  ): Promise<void> {
    await this.logEvent({
      event: PublicBookingAuditEvent.AVAILABILITY_CHECKED,
      businessId,
      ...this.extractRequestContext(req),
      eventData,
      responseTime,
    });
  }

  /**
   * Log client lookup
   */
  async logClientLookup(
    businessId: string,
    req: NextRequest,
    eventData: {
      lookupType: 'email' | 'phone';
      clientFound: boolean;
      clientId?: string;
    },
    responseTime?: number
  ): Promise<void> {
    await this.logEvent({
      event: PublicBookingAuditEvent.CLIENT_LOOKUP_PERFORMED,
      businessId,
      clientId: eventData.clientId,
      ...this.extractRequestContext(req),
      eventData,
      responseTime,
    });
  }

  /**
   * Log booking completion
   */
  async logBookingCompleted(
    businessId: string,
    req: NextRequest,
    eventData: {
      appointmentId: string;
      clientId: string;
      serviceIds: string[];
      staffId: string;
      totalAmount?: number;
      isNewClient: boolean;
    },
    responseTime?: number
  ): Promise<void> {
    await this.logEvent({
      event: PublicBookingAuditEvent.BOOKING_COMPLETED,
      businessId,
      clientId: eventData.clientId,
      appointmentId: eventData.appointmentId,
      ...this.extractRequestContext(req),
      eventData,
      responseTime,
    });
  }

  /**
   * Log booking failure
   */
  async logBookingFailed(
    businessId: string,
    req: NextRequest,
    eventData: {
      failureReason: string;
      serviceIds?: string[];
      staffId?: string;
      clientData?: any;
    },
    error?: Error,
    responseTime?: number
  ): Promise<void> {
    await this.logEvent({
      event: PublicBookingAuditEvent.BOOKING_FAILED,
      businessId,
      ...this.extractRequestContext(req),
      eventData,
      responseTime,
      errorType: error?.name,
      errorMessage: error?.message,
      stackTrace: error?.stack,
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    businessId: string,
    req: NextRequest,
    violationType: PublicBookingAuditEvent,
    eventData: Record<string, any>,
    securityFlags: string[] = []
  ): Promise<void> {
    await this.logEvent({
      event: violationType,
      businessId,
      ...this.extractRequestContext(req),
      eventData,
      securityFlags,
    });
  }

  /**
   * Log input sanitization event
   */
  async logInputSanitization(
    businessId: string,
    req: NextRequest,
    eventData: {
      field: string;
      originalValue: string;
      sanitizedValue: string;
      violations: string[];
    }
  ): Promise<void> {
    await this.logEvent({
      event: PublicBookingAuditEvent.INPUT_SANITIZATION_TRIGGERED,
      businessId,
      ...this.extractRequestContext(req),
      eventData,
      securityFlags: ['INPUT_SANITIZED'],
    });
  }

  /**
   * Get audit trail for a specific business
   */
  async getAuditTrail(
    businessId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      events?: PublicBookingAuditEvent[];
      riskLevel?: RiskLevel;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    entries: any[];
    total: number;
    summary: Record<string, number>;
  }> {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      events,
      riskLevel,
      limit = 100,
      offset = 0,
    } = options;

    try {
      const where = {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(events && { event: { in: events } }),
        ...(riskLevel && { riskLevel }),
      };

      const [entries, total, summary] = await Promise.all([
        prisma.publicBookingAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.publicBookingAuditLog.count({ where }),
        prisma.publicBookingAuditLog.groupBy({
          by: ['event'],
          where,
          _count: { event: true },
        }),
      ]);

      const summaryMap = summary.reduce(
        (acc, item) => {
          acc[item.event] = item._count.event;
          return acc;
        },
        {} as Record<string, number>
      );

      return { entries, total, summary: summaryMap };
    } catch (error) {
      console.error('Failed to get public booking audit trail', error);
      return { entries: [], total: 0, summary: {} };
    }
  }

  /**
   * Get security metrics for a business
   */
  async getSecurityMetrics(
    businessId: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    totalEvents: number;
    securityEvents: number;
    riskDistribution: Record<RiskLevel, number>;
    topEvents: Array<{ event: string; count: number }>;
    suspiciousIPs: Array<{ ip: string; count: number; riskScore: number }>;
  }> {
    const timeframeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const startDate = new Date(Date.now() - timeframeMs[timeframe]);

    try {
      const [
        totalEvents,
        securityEvents,
        riskDistribution,
        topEvents,
        suspiciousIPs,
      ] = await Promise.all([
        // Total events
        prisma.publicBookingAuditLog.count({
          where: { businessId, createdAt: { gte: startDate } },
        }),

        // Security events
        prisma.publicBookingAuditLog.count({
          where: {
            businessId,
            createdAt: { gte: startDate },
            event: {
              in: [
                PublicBookingAuditEvent.RATE_LIMIT_EXCEEDED,
                PublicBookingAuditEvent.CSRF_VALIDATION_FAILED,
                PublicBookingAuditEvent.SUSPICIOUS_ACTIVITY_DETECTED,
                PublicBookingAuditEvent.INPUT_SANITIZATION_TRIGGERED,
              ],
            },
          },
        }),

        // Risk distribution
        prisma.publicBookingAuditLog.groupBy({
          by: ['riskLevel'],
          where: { businessId, createdAt: { gte: startDate } },
          _count: { riskLevel: true },
        }),

        // Top events
        prisma.publicBookingAuditLog.groupBy({
          by: ['event'],
          where: { businessId, createdAt: { gte: startDate } },
          _count: { event: true },
          orderBy: { _count: { event: 'desc' } },
          take: 10,
        }),

        // Suspicious IPs
        prisma.publicBookingAuditLog.groupBy({
          by: ['ipAddress'],
          where: {
            businessId,
            createdAt: { gte: startDate },
            riskScore: { gte: 70 },
          },
          _count: { ipAddress: true },
          _avg: { riskScore: true },
          orderBy: { _count: { ipAddress: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        totalEvents,
        securityEvents,
        riskDistribution: riskDistribution.reduce(
          (acc, item) => {
            acc[item.riskLevel as RiskLevel] = item._count.riskLevel;
            return acc;
          },
          {} as Record<RiskLevel, number>
        ),
        topEvents: topEvents.map(item => ({
          event: item.event,
          count: item._count.event,
        })),
        suspiciousIPs: suspiciousIPs.map(item => ({
          ip: item.ipAddress || 'unknown',
          count: item._count.ipAddress,
          riskScore: Math.round(item._avg.riskScore || 0),
        })),
      };
    } catch (error) {
      console.error('Failed to get security metrics', error);
      return {
        totalEvents: 0,
        securityEvents: 0,
        riskDistribution: {} as Record<RiskLevel, number>,
        topEvents: [],
        suspiciousIPs: [],
      };
    }
  }

  /**
   * Extract request context from NextRequest
   */
  private extractRequestContext(req: NextRequest): {
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    requestId?: string;
    sessionId?: string;
  } {
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';

    return {
      ipAddress,
      userAgent: req.headers.get('user-agent') || undefined,
      referer: req.headers.get('referer') || undefined,
      requestId: req.headers.get('x-request-id') || undefined,
      sessionId: this.generateSessionId(req),
    };
  }

  /**
   * Generate session ID for tracking
   */
  private generateSessionId(req: NextRequest): string {
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Create a simple hash for session tracking
    const sessionData = `${ip}:${userAgent}:${Math.floor(Date.now() / (60 * 60 * 1000))}`; // Hour-based sessions

    let hash = 0;
    for (let i = 0; i < sessionData.length; i++) {
      const char = sessionData.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Calculate risk score for audit event
   */
  private calculateRiskScore(entry: PublicBookingAuditEntry): number {
    let score = 0;

    // Base score by event type
    const eventScores: Record<PublicBookingAuditEvent, number> = {
      [PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED]: 10,
      [PublicBookingAuditEvent.SERVICES_VIEWED]: 10,
      [PublicBookingAuditEvent.AVAILABILITY_CHECKED]: 15,
      [PublicBookingAuditEvent.TIME_SLOT_SELECTED]: 20,
      [PublicBookingAuditEvent.CLIENT_LOOKUP_PERFORMED]: 25,
      [PublicBookingAuditEvent.CLIENT_DATA_PREFILLED]: 20,
      [PublicBookingAuditEvent.BOOKING_INITIATED]: 30,
      [PublicBookingAuditEvent.BOOKING_COMPLETED]: 25,
      [PublicBookingAuditEvent.BOOKING_FAILED]: 40,
      [PublicBookingAuditEvent.RATE_LIMIT_EXCEEDED]: 70,
      [PublicBookingAuditEvent.CSRF_VALIDATION_FAILED]: 80,
      [PublicBookingAuditEvent.INPUT_SANITIZATION_TRIGGERED]: 60,
      [PublicBookingAuditEvent.SUSPICIOUS_ACTIVITY_DETECTED]: 90,
      [PublicBookingAuditEvent.ERROR_OCCURRED]: 50,
      [PublicBookingAuditEvent.PERFORMANCE_THRESHOLD_EXCEEDED]: 30,
    };

    score += eventScores[entry.event] || 50;

    // Security flags increase risk
    if (entry.securityFlags) {
      score += entry.securityFlags.length * 10;
    }

    // Error events increase risk
    if (entry.errorType || entry.errorMessage) {
      score += 20;
    }

    // Performance issues increase risk
    if (entry.responseTime && entry.responseTime > 5000) {
      // > 5 seconds
      score += 15;
    }

    // Suspicious event data patterns
    if (entry.eventData) {
      if (
        entry.eventData.violations &&
        Array.isArray(entry.eventData.violations)
      ) {
        score += entry.eventData.violations.length * 5;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Trigger critical alert
   */
  private async triggerCriticalAlert(
    entry: PublicBookingAuditEntry,
    riskScore: number
  ): Promise<void> {
    // TODO: Integrate with alerting system when available
    console.error('CRITICAL PUBLIC BOOKING SECURITY ALERT:', {
      event: entry.event,
      businessId: entry.businessId,
      riskScore,
      ipAddress: entry.ipAddress,
      eventData: entry.eventData,
      timestamp: new Date().toISOString(),
    });

    // Could integrate with:
    // - Email alerts
    // - Slack notifications
    // - PagerDuty
    // - SMS alerts
  }

  /**
   * Fallback logging when primary audit logging fails
   */
  private logToFallback(entry: PublicBookingAuditEntry, error: any): void {
    console.error('AUDIT LOG FALLBACK:', {
      event: entry.event,
      businessId: entry.businessId,
      timestamp: new Date().toISOString(),
      originalError: error instanceof Error ? error.message : 'Unknown error',
      entry: JSON.stringify(entry, null, 2),
    });
  }
}

// Global instance for public booking audit logging
export const publicBookingAuditLogger = new PublicBookingAuditLogger();

/**
 * Convenience functions for common audit events
 */
export const auditPublicBooking = {
  businessAccess: (
    businessId: string,
    req: NextRequest,
    responseTime?: number,
    eventData?: Record<string, any>
  ) =>
    publicBookingAuditLogger.logBusinessAccess(
      businessId,
      req,
      responseTime,
      eventData
    ),

  availabilityCheck: (
    businessId: string,
    req: NextRequest,
    eventData: any,
    responseTime?: number
  ) =>
    publicBookingAuditLogger.logAvailabilityCheck(
      businessId,
      req,
      eventData,
      responseTime
    ),

  clientLookup: (
    businessId: string,
    req: NextRequest,
    eventData: any,
    responseTime?: number
  ) =>
    publicBookingAuditLogger.logClientLookup(
      businessId,
      req,
      eventData,
      responseTime
    ),

  bookingCompleted: (
    businessId: string,
    req: NextRequest,
    eventData: any,
    responseTime?: number
  ) =>
    publicBookingAuditLogger.logBookingCompleted(
      businessId,
      req,
      eventData,
      responseTime
    ),

  bookingFailed: (
    businessId: string,
    req: NextRequest,
    eventData: any,
    error?: Error,
    responseTime?: number
  ) =>
    publicBookingAuditLogger.logBookingFailed(
      businessId,
      req,
      eventData,
      error,
      responseTime
    ),

  securityViolation: (
    businessId: string,
    req: NextRequest,
    violationType: PublicBookingAuditEvent,
    eventData: any,
    securityFlags?: string[]
  ) =>
    publicBookingAuditLogger.logSecurityViolation(
      businessId,
      req,
      violationType,
      eventData,
      securityFlags
    ),

  inputSanitization: (businessId: string, req: NextRequest, eventData: any) =>
    publicBookingAuditLogger.logInputSanitization(businessId, req, eventData),
};
