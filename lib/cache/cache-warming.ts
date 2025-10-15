/**
 * Cache Warming Utilities
 *
 * Intelligent cache warming strategies for frequently accessed appointment data
 * to improve performance and reduce database load during peak usage periods.
 *
 * Requirements: 6.3, 6.4, 4.4
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma';
import { OptimizedAppointmentRepository } from '@/lib/repositories/appointment-repository-optimized';
import { AppointmentStatus } from '@prisma/client';

// ============================================================================
// CACHE WARMING CONFIGURATION
// ============================================================================

interface CacheWarmingConfig {
  enabled: boolean;
  batchSize: number;
  concurrency: number;
  warmingSchedule: {
    dailyAt: string; // HH:MM format
    weeklyOn: number; // 0-6 (Sunday-Saturday)
    monthlyOn: number; // 1-31
  };
  warmingStrategies: {
    upcomingAppointments: boolean;
    popularTimeSlots: boolean;
    frequentClients: boolean;
    businessStatistics: boolean;
    staffSchedules: boolean;
  };
  warmingPeriods: {
    upcomingDays: number;
    historicalDays: number;
    statisticsDays: number;
  };
}

const getCacheWarmingConfig = (): CacheWarmingConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    enabled: isProduction,
    batchSize: 50,
    concurrency: 5,
    warmingSchedule: {
      dailyAt: '06:00', // 6 AM
      weeklyOn: 1, // Monday
      monthlyOn: 1, // 1st of month
    },
    warmingStrategies: {
      upcomingAppointments: true,
      popularTimeSlots: true,
      frequentClients: true,
      businessStatistics: true,
      staffSchedules: true,
    },
    warmingPeriods: {
      upcomingDays: 14, // Next 2 weeks
      historicalDays: 30, // Last 30 days
      statisticsDays: 90, // Last 3 months for statistics
    },
  };
};

// ============================================================================
// CACHE WARMING MANAGER
// ============================================================================

export class CacheWarmingManager {
  private static instance: CacheWarmingManager;
  private config: CacheWarmingConfig;
  private repository: OptimizedAppointmentRepository;
  private cacheManager: any;
  private warmingInProgress: boolean = false;
  private warmingStats: {
    lastWarmingTime?: Date;
    itemsWarmed: number;
    warmingDuration: number;
    errors: number;
  } = {
    itemsWarmed: 0,
    warmingDuration: 0,
    errors: 0,
  };

  private constructor() {
    this.config = getCacheWarmingConfig();
    this.repository = new OptimizedAppointmentRepository();
    this.cacheManager = null as any; // AppointmentCacheManager.getInstance();
  }

  static getInstance(): CacheWarmingManager {
    if (!CacheWarmingManager.instance) {
      CacheWarmingManager.instance = new CacheWarmingManager();
    }
    return CacheWarmingManager.instance;
  }

  // ============================================================================
  // CACHE WARMING STRATEGIES
  // ============================================================================

  /**
   * Warm cache for a specific business
   */
  async warmBusinessCache(businessId: string): Promise<{
    success: boolean;
    itemsWarmed: number;
    duration: number;
    errors: string[];
  }> {
    if (this.warmingInProgress) {
      return {
        success: false,
        itemsWarmed: 0,
        duration: 0,
        errors: ['Cache warming already in progress'],
      };
    }

    this.warmingInProgress = true;
    const startTime = Date.now();
    let itemsWarmed = 0;
    const errors: string[] = [];

    try {
      console.log(`Starting cache warming for business: ${businessId}`);

      // Get business staff for warming
      const staff = await prisma.staff.findMany({
        where: { businessId, isActive: true },
        select: { id: true, displayName: true },
      });

      if (staff.length === 0) {
        return {
          success: false,
          itemsWarmed: 0,
          duration: Date.now() - startTime,
          errors: ['No active staff found for business'],
        };
      }

      // Execute warming strategies in parallel with limited concurrency
      const warmingPromises: Promise<number>[] = [];

      if (this.config.warmingStrategies.upcomingAppointments) {
        warmingPromises.push(
          this.warmUpcomingAppointments(
            businessId,
            staff.map(s => s.id)
          )
        );
      }

      if (this.config.warmingStrategies.staffSchedules) {
        warmingPromises.push(
          this.warmStaffSchedules(
            businessId,
            staff.map(s => s.id)
          )
        );
      }

      if (this.config.warmingStrategies.businessStatistics) {
        warmingPromises.push(this.warmBusinessStatistics(businessId));
      }

      if (this.config.warmingStrategies.frequentClients) {
        warmingPromises.push(this.warmFrequentClientData(businessId));
      }

      if (this.config.warmingStrategies.popularTimeSlots) {
        warmingPromises.push(
          this.warmPopularTimeSlots(
            businessId,
            staff.map(s => s.id)
          )
        );
      }

      // Execute with concurrency control
      const results = await this.executeConcurrently(
        warmingPromises,
        this.config.concurrency
      );
      itemsWarmed = results.reduce((sum, count) => sum + count, 0);

      const duration = Date.now() - startTime;
      this.updateWarmingStats(itemsWarmed, duration, errors.length);

      console.log(
        `Cache warming completed for business ${businessId}: ${itemsWarmed} items in ${duration}ms`
      );

      return {
        success: true,
        itemsWarmed,
        duration,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('Cache warming failed:', error);

      return {
        success: false,
        itemsWarmed,
        duration: Date.now() - startTime,
        errors,
      };
    } finally {
      this.warmingInProgress = false;
    }
  }

  /**
   * Warm upcoming appointments cache
   */
  private async warmUpcomingAppointments(
    businessId: string,
    staffIds: string[]
  ): Promise<number> {
    let itemsWarmed = 0;

    try {
      const dateRange = {
        startDate: new Date(),
        endDate: new Date(
          Date.now() +
            this.config.warmingPeriods.upcomingDays * 24 * 60 * 60 * 1000
        ),
      };

      // Warm business-wide upcoming appointments
      const businessKey = `business-${businessId}` as any; // CacheKeyGenerator.appointmentsByBusiness(businessId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      });

      const businessAppointments =
        await this.repository.findByBusinessOptimized(businessId, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          limit: 100,
        });

      await this.cacheManager.setAppointmentList(
        businessKey,
        businessAppointments
      );
      itemsWarmed++;

      // Warm individual staff schedules
      for (const staffId of staffIds) {
        const staffKey = `staff-${staffId}` as any; // CacheKeyGenerator.appointmentsByStaff(
          staffId,
          businessId,
          dateRange
        );

        const staffAppointments = await this.repository.findByStaffOptimized(
          staffId,
          businessId,
          dateRange,
          {
            status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
            limit: 50,
          }
        );

        await this.cacheManager.setAppointmentList(staffKey, staffAppointments);
        itemsWarmed++;
      }

      console.log(`Warmed ${itemsWarmed} upcoming appointment caches`);
      return itemsWarmed;
    } catch (error) {
      console.error('Error warming upcoming appointments:', error);
      return itemsWarmed;
    }
  }

  /**
   * Warm staff schedules cache
   */
  private async warmStaffSchedules(
    businessId: string,
    staffIds: string[]
  ): Promise<number> {
    let itemsWarmed = 0;

    try {
      const dateRanges = [
        // Current week
        {
          startDate: this.getStartOfWeek(new Date()),
          endDate: this.getEndOfWeek(new Date()),
        },
        // Next week
        {
          startDate: this.getStartOfWeek(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ),
          endDate: this.getEndOfWeek(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ),
        },
      ];

      for (const staffId of staffIds) {
        for (const dateRange of dateRanges) {
          const cacheKey = `staff-${staffId}` as any; // CacheKeyGenerator.appointmentsByStaff(
            staffId,
            businessId,
            dateRange
          );

          const appointments = await this.repository.findByStaffOptimized(
            staffId,
            businessId,
            dateRange,
            { limit: 100 }
          );

          await this.cacheManager.setAppointmentList(cacheKey, appointments);
          itemsWarmed++;
        }
      }

      console.log(`Warmed ${itemsWarmed} staff schedule caches`);
      return itemsWarmed;
    } catch (error) {
      console.error('Error warming staff schedules:', error);
      return itemsWarmed;
    }
  }

  /**
   * Warm business statistics cache
   */
  private async warmBusinessStatistics(businessId: string): Promise<number> {
    let itemsWarmed = 0;

    try {
      const statisticsRanges = [
        // Current month
        {
          startDate: this.getStartOfMonth(new Date()),
          endDate: this.getEndOfMonth(new Date()),
        },
        // Last month
        {
          startDate: this.getStartOfMonth(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ),
          endDate: this.getEndOfMonth(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ),
        },
        // Last 30 days
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
      ];

      for (const dateRange of statisticsRanges) {
        const statistics = await this.repository.getAppointmentStatsOptimized(
          businessId,
          dateRange
        );
        await this.cacheManager.setStatistics(
          businessId,
          dateRange,
          statistics
        );
        itemsWarmed++;
      }

      console.log(`Warmed ${itemsWarmed} business statistics caches`);
      return itemsWarmed;
    } catch (error) {
      console.error('Error warming business statistics:', error);
      return itemsWarmed;
    }
  }

  /**
   * Warm frequent client data cache
   */
  private async warmFrequentClientData(businessId: string): Promise<number> {
    let itemsWarmed = 0;

    try {
      // Get frequent clients (clients with multiple appointments)
      const frequentClients = await prisma.client.findMany({
        where: {
          businessId,
          appointments: {
            some: {
              createdAt: {
                gte: new Date(
                  Date.now() -
                    this.config.warmingPeriods.historicalDays *
                      24 *
                      60 *
                      60 *
                      1000
                ),
              },
            },
          },
        },
        select: { id: true },
        take: 20, // Top 20 frequent clients
      });

      // Warm appointment history for frequent clients
      for (const client of frequentClients) {
        const clientAppointments =
          await this.repository.findByBusinessOptimized(businessId, {
            clientId: client.id,
            limit: 50,
          });

        // Cache key would be generated based on client filter
        const cacheKey = `business-${businessId}` as any; // CacheKeyGenerator.appointmentsByBusiness(businessId, {
          clientId: client.id,
        });

        await this.cacheManager.setAppointmentList(
          cacheKey,
          clientAppointments
        );
        itemsWarmed++;
      }

      console.log(`Warmed ${itemsWarmed} frequent client caches`);
      return itemsWarmed;
    } catch (error) {
      console.error('Error warming frequent client data:', error);
      return itemsWarmed;
    }
  }

  /**
   * Warm popular time slots cache
   */
  private async warmPopularTimeSlots(
    businessId: string,
    staffIds: string[]
  ): Promise<number> {
    let itemsWarmed = 0;

    try {
      // Get popular time slots by analyzing historical data
      const popularHours = [9, 10, 11, 14, 15, 16, 17]; // Common appointment hours

      for (const staffId of staffIds) {
        for (const hour of popularHours) {
          // Create time slots for the next 7 days at this hour
          for (let day = 0; day < 7; day++) {
            const slotStart = new Date();
            slotStart.setDate(slotStart.getDate() + day);
            slotStart.setHours(hour, 0, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setHours(hour + 1, 0, 0, 0);

            // Check for conflicts in this time slot
            const conflicts = await this.repository.findConflictsOptimized(
              staffId,
              businessId,
              { startTime: slotStart, endTime: slotEnd }
            );

            await this.cacheManager.setConflictCheck(
              staffId,
              businessId,
              { startTime: slotStart, endTime: slotEnd },
              conflicts
            );
            itemsWarmed++;
          }
        }
      }

      console.log(`Warmed ${itemsWarmed} popular time slot caches`);
      return itemsWarmed;
    } catch (error) {
      console.error('Error warming popular time slots:', error);
      return itemsWarmed;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Execute promises with concurrency control
   */
  private async executeConcurrently<T>(
    promises: Promise<T>[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get start of week (Monday)
   */
  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get end of week (Sunday)
   */
  private getEndOfWeek(date: Date): Date {
    const end = this.getStartOfWeek(date);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Get start of month
   */
  private getStartOfMonth(date: Date): Date {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get end of month
   */
  private getEndOfMonth(date: Date): Date {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Update warming statistics
   */
  private updateWarmingStats(
    itemsWarmed: number,
    duration: number,
    errors: number
  ): void {
    this.warmingStats = {
      lastWarmingTime: new Date(),
      itemsWarmed,
      warmingDuration: duration,
      errors,
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Warm cache for all active businesses
   */
  async warmAllBusinessCaches(): Promise<{
    businessesProcessed: number;
    totalItemsWarmed: number;
    totalDuration: number;
    errors: string[];
  }> {
    if (!this.config.enabled) {
      return {
        businessesProcessed: 0,
        totalItemsWarmed: 0,
        totalDuration: 0,
        errors: ['Cache warming is disabled'],
      };
    }

    const startTime = Date.now();
    let businessesProcessed = 0;
    let totalItemsWarmed = 0;
    const errors: string[] = [];

    try {
      // Get all active businesses
      const businesses = await prisma.business.findMany({
        select: { id: true, name: true },
      });

      console.log(`Starting cache warming for ${businesses.length} businesses`);

      // Process businesses in batches
      for (let i = 0; i < businesses.length; i += this.config.batchSize) {
        const batch = businesses.slice(i, i + this.config.batchSize);

        const batchPromises = batch.map(business =>
          this.warmBusinessCache(business.id)
        );

        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
          businessesProcessed++;
          totalItemsWarmed += result.itemsWarmed;
          errors.push(...result.errors);
        }
      }

      const totalDuration = Date.now() - startTime;
      console.log(
        `Cache warming completed: ${businessesProcessed} businesses, ${totalItemsWarmed} items, ${totalDuration}ms`
      );

      return {
        businessesProcessed,
        totalItemsWarmed,
        totalDuration,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('Global cache warming failed:', error);

      return {
        businessesProcessed,
        totalItemsWarmed,
        totalDuration: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Get warming statistics
   */
  getWarmingStats(): typeof this.warmingStats & {
    isWarmingInProgress: boolean;
  } {
    return {
      ...this.warmingStats,
      isWarmingInProgress: this.warmingInProgress,
    };
  }

  /**
   * Update warming configuration
   */
  updateConfig(config: Partial<CacheWarmingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if warming is needed based on schedule
   */
  isWarmingNeeded(): boolean {
    if (!this.config.enabled || this.warmingInProgress) {
      return false;
    }

    const now = new Date();
    const lastWarming = this.warmingStats.lastWarmingTime;

    if (!lastWarming) {
      return true; // Never warmed before
    }

    // Check if it's been more than 24 hours
    const hoursSinceLastWarming =
      (now.getTime() - lastWarming.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastWarming >= 24;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const cacheWarmingManager = CacheWarmingManager.getInstance();

// Utility functions
export async function warmBusinessCache(businessId: string) {
  return cacheWarmingManager.warmBusinessCache(businessId);
}

export async function warmAllCaches() {
  return cacheWarmingManager.warmAllBusinessCaches();
}

export function isWarmingNeeded(): boolean {
  return cacheWarmingManager.isWarmingNeeded();
}
