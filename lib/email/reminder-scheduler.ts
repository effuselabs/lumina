/**
 * Reminder Scheduling Service
 *
 * Handles automated scheduling and queuing of appointment reminders.
 * Queries appointments that need reminders and schedules them for delivery.
 */

import { prisma } from '@/lib/prisma';
import { notificationService } from './notification-service';

/**
 * Reminder configuration per business
 */
export interface ReminderConfig {
  enable24hReminders: boolean;
  enable2hReminders: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  timezone?: string;
}

/**
 * Result of reminder scheduling operation
 */
export interface ReminderScheduleResult {
  success: boolean;
  reminders24hScheduled: number;
  reminders2hScheduled: number;
  errors: Array<{
    appointmentId: string;
    error: string;
  }>;
}

/**
 * Reminder Scheduler Error Codes
 */
export enum ReminderSchedulerErrorCode {
  INVALID_BUSINESS = 'INVALID_BUSINESS',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
}

/**
 * Custom error class for reminder scheduler errors
 */
export class ReminderSchedulerError extends Error {
  constructor(
    message: string,
    public code: ReminderSchedulerErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReminderSchedulerError';
  }
}

/**
 * Reminder Scheduling Service
 * Queries appointments and schedules reminder emails
 */
export class ReminderScheduler {
  /**
   * Get reminder configuration for a business
   * Fetches from database or returns default configuration
   */
  private async getReminderConfig(businessId: string): Promise<ReminderConfig> {
    try {
      // Try to fetch configuration from database
      const config = await prisma.reminderConfig.findUnique({
        where: { businessId },
      });

      if (config) {
        return {
          enable24hReminders: config.enable24hReminders,
          enable2hReminders: config.enable2hReminders,
          quietHoursStart: config.quietHoursStart || undefined,
          quietHoursEnd: config.quietHoursEnd || undefined,
          timezone: config.timezone,
        };
      }

      // Return default configuration if not found
      return {
        enable24hReminders: true,
        enable2hReminders: false, // Disabled by default
        quietHoursStart: '22:00', // 10 PM
        quietHoursEnd: '08:00', // 8 AM
        timezone: 'America/New_York',
      };
    } catch (error) {
      console.error('[ReminderScheduler] Error fetching reminder config', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return default configuration on error
      return {
        enable24hReminders: true,
        enable2hReminders: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'America/New_York',
      };
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(config: ReminderConfig): boolean {
    if (!config.quietHoursStart || !config.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = config.quietHoursStart
      .split(':')
      .map(Number);
    const [endHour, endMinute] = config.quietHoursEnd.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * Find appointments that need 24-hour reminders
   * Returns appointments that:
   * - Are scheduled 24 hours from now (±15 minutes window)
   * - Are in SCHEDULED or CONFIRMED status
   * - Haven't had a 24h reminder sent yet
   */
  private async findAppointmentsNeed24hReminder(businessId?: string): Promise<
    Array<{
      id: string;
      businessId: string;
      startTime: Date;
    }>
  > {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Window: 15 minutes before and after the 24-hour mark
    const windowStart = new Date(reminderTime.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(reminderTime.getTime() + 15 * 60 * 1000);

    try {
      // Find appointments in the time window
      const appointments = await prisma.appointment.findMany({
        where: {
          ...(businessId && { businessId }),
          startTime: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED'],
          },
        },
        select: {
          id: true,
          businessId: true,
          startTime: true,
        },
      });

      // Filter out appointments that already have a 24h reminder queued or sent
      const appointmentsWithoutReminder = [];
      for (const appointment of appointments) {
        const existingReminder = await prisma.emailQueue.findFirst({
          where: {
            appointmentId: appointment.id,
            templateType: 'appointment_reminder_24h',
            status: {
              in: ['pending', 'processing', 'sent'],
            },
          },
        });

        if (!existingReminder) {
          appointmentsWithoutReminder.push(appointment);
        }
      }

      return appointmentsWithoutReminder;
    } catch (error) {
      console.error(
        '[ReminderScheduler] Error finding appointments for 24h reminder',
        {
          businessId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw new ReminderSchedulerError(
        'Failed to find appointments for 24h reminder',
        ReminderSchedulerErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Find appointments that need 2-hour reminders
   * Returns appointments that:
   * - Are scheduled 2 hours from now (±15 minutes window)
   * - Are in SCHEDULED or CONFIRMED status
   * - Haven't had a 2h reminder sent yet
   * - Business has 2h reminders enabled
   */
  private async findAppointmentsNeed2hReminder(businessId?: string): Promise<
    Array<{
      id: string;
      businessId: string;
      startTime: Date;
    }>
  > {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

    // Window: 15 minutes before and after the 2-hour mark
    const windowStart = new Date(reminderTime.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(reminderTime.getTime() + 15 * 60 * 1000);

    try {
      // Find appointments in the time window
      const appointments = await prisma.appointment.findMany({
        where: {
          ...(businessId && { businessId }),
          startTime: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED'],
          },
        },
        select: {
          id: true,
          businessId: true,
          startTime: true,
        },
      });

      // Filter out appointments that already have a 2h reminder queued or sent
      // Also check if business has 2h reminders enabled
      const appointmentsWithoutReminder = [];
      for (const appointment of appointments) {
        // Check if business has 2h reminders enabled
        const config = await this.getReminderConfig(appointment.businessId);
        if (!config.enable2hReminders) {
          continue;
        }

        const existingReminder = await prisma.emailQueue.findFirst({
          where: {
            appointmentId: appointment.id,
            templateType: 'appointment_reminder_2h',
            status: {
              in: ['pending', 'processing', 'sent'],
            },
          },
        });

        if (!existingReminder) {
          appointmentsWithoutReminder.push(appointment);
        }
      }

      return appointmentsWithoutReminder;
    } catch (error) {
      console.error(
        '[ReminderScheduler] Error finding appointments for 2h reminder',
        {
          businessId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw new ReminderSchedulerError(
        'Failed to find appointments for 2h reminder',
        ReminderSchedulerErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Schedule reminders for a specific business
   *
   * @param businessId - Business ID to schedule reminders for
   * @returns Result with count of scheduled reminders and any errors
   */
  async scheduleRemindersForBusiness(
    businessId: string
  ): Promise<ReminderScheduleResult> {
    const result: ReminderScheduleResult = {
      success: true,
      reminders24hScheduled: 0,
      reminders2hScheduled: 0,
      errors: [],
    };

    try {
      // Validate business exists
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, isActive: true },
      });

      if (!business) {
        throw new ReminderSchedulerError(
          `Business not found: ${businessId}`,
          ReminderSchedulerErrorCode.INVALID_BUSINESS,
          { businessId }
        );
      }

      if (!business.isActive) {
        console.log('[ReminderScheduler] Skipping inactive business', {
          businessId,
        });
        return result;
      }

      // Get reminder configuration
      const config = await this.getReminderConfig(businessId);

      // Check if we're in quiet hours
      if (this.isQuietHours(config)) {
        console.log(
          '[ReminderScheduler] Skipping reminders during quiet hours',
          {
            businessId,
            quietHoursStart: config.quietHoursStart,
            quietHoursEnd: config.quietHoursEnd,
          }
        );
        return result;
      }

      // Schedule 24-hour reminders
      if (config.enable24hReminders) {
        const appointments24h =
          await this.findAppointmentsNeed24hReminder(businessId);

        for (const appointment of appointments24h) {
          try {
            await notificationService.sendAppointmentReminder(
              appointment.id,
              appointment.businessId,
              '24h'
            );
            result.reminders24hScheduled++;
          } catch (error) {
            console.error(
              '[ReminderScheduler] Failed to schedule 24h reminder',
              {
                appointmentId: appointment.id,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            result.errors.push({
              appointmentId: appointment.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Schedule 2-hour reminders
      if (config.enable2hReminders) {
        const appointments2h =
          await this.findAppointmentsNeed2hReminder(businessId);

        for (const appointment of appointments2h) {
          try {
            await notificationService.sendAppointmentReminder(
              appointment.id,
              appointment.businessId,
              '2h'
            );
            result.reminders2hScheduled++;
          } catch (error) {
            console.error(
              '[ReminderScheduler] Failed to schedule 2h reminder',
              {
                appointmentId: appointment.id,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            result.errors.push({
              appointmentId: appointment.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      console.log('[ReminderScheduler] Reminders scheduled for business', {
        businessId,
        reminders24h: result.reminders24hScheduled,
        reminders2h: result.reminders2hScheduled,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      console.error(
        '[ReminderScheduler] Error scheduling reminders for business',
        {
          businessId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (error instanceof ReminderSchedulerError) {
        throw error;
      }

      throw new ReminderSchedulerError(
        'Failed to schedule reminders for business',
        ReminderSchedulerErrorCode.NOTIFICATION_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Schedule reminders for all active businesses
   *
   * @returns Result with count of scheduled reminders and any errors
   */
  async scheduleRemindersForAllBusinesses(): Promise<ReminderScheduleResult> {
    const result: ReminderScheduleResult = {
      success: true,
      reminders24hScheduled: 0,
      reminders2hScheduled: 0,
      errors: [],
    };

    try {
      // Get all active businesses
      const businesses = await prisma.business.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      console.log(
        '[ReminderScheduler] Scheduling reminders for all businesses',
        {
          businessCount: businesses.length,
        }
      );

      // Schedule reminders for each business
      for (const business of businesses) {
        try {
          const businessResult = await this.scheduleRemindersForBusiness(
            business.id
          );
          result.reminders24hScheduled += businessResult.reminders24hScheduled;
          result.reminders2hScheduled += businessResult.reminders2hScheduled;
          result.errors.push(...businessResult.errors);
        } catch (error) {
          console.error(
            '[ReminderScheduler] Error scheduling reminders for business',
            {
              businessId: business.id,
              error: error instanceof Error ? error.message : String(error),
            }
          );
          // Continue with other businesses even if one fails
        }
      }

      console.log(
        '[ReminderScheduler] Reminders scheduled for all businesses',
        {
          businessCount: businesses.length,
          reminders24h: result.reminders24hScheduled,
          reminders2h: result.reminders2hScheduled,
          errors: result.errors.length,
        }
      );

      return result;
    } catch (error) {
      console.error(
        '[ReminderScheduler] Error scheduling reminders for all businesses',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw new ReminderSchedulerError(
        'Failed to schedule reminders for all businesses',
        ReminderSchedulerErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }
}

// Export singleton instance
export const reminderScheduler = new ReminderScheduler();
