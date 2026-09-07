/**
 * Time Zone Handler Service
 *
 * Provides comprehensive time zone handling for the calendar infrastructure,
 * including UTC storage, local time conversion, and daylight saving time support.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { DateTime } from 'luxon';

export interface TimeZoneInfo {
  timezone: string;
  offset: number;
  isDST: boolean;
  abbreviation: string;
  offsetName: string;
}

export interface BusinessTimeZoneConfig {
  businessId: string;
  timezone: string;
  locations?: Array<{
    id: string;
    name: string;
    timezone: string;
  }>;
}

export interface TimeSlot {
  start: DateTime;
  end: DateTime;
  timezone: string;
}

export interface LocalTimeSlot {
  start: string; // HH:MM format in local time
  end: string; // HH:MM format in local time
  date: string; // YYYY-MM-DD format in local time
  utcStart: DateTime;
  utcEnd: DateTime;
}

/**
 * Core time zone handling service for calendar infrastructure
 */
export class TimeZoneHandler {
  private static readonly VALID_TIMEZONES = new Set([
    // North America
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'America/Honolulu',
    'America/Toronto',
    'America/Vancouver',
    'America/Montreal',

    // Europe
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Vienna',
    'Europe/Zurich',
    'Europe/Stockholm',

    // Asia Pacific
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Seoul',
    'Asia/Bangkok',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',

    // Others
    'UTC',
  ]);

  /**
   * Validates if a timezone string is supported
   */
  static validateTimeZone(timezone: string): boolean {
    if (!timezone) return false;

    // Check against our supported list first
    if (this.VALID_TIMEZONES.has(timezone)) {
      return true;
    }

    // Fallback to Luxon validation for other valid IANA timezones
    try {
      const dt = DateTime.now().setZone(timezone);
      return dt.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Gets comprehensive timezone information for a given timezone
   */
  static getTimeZoneInfo(timezone: string, date?: DateTime): TimeZoneInfo {
    if (!this.validateTimeZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const dt = (date || DateTime.now()).setZone(timezone);

    return {
      timezone,
      offset: dt.offset,
      isDST: dt.isInDST,
      abbreviation: dt.offsetNameShort || 'UTC',
      offsetName: dt.offsetNameLong || 'Coordinated Universal Time',
    };
  }

  /**
   * Converts local time to UTC for database storage
   */
  static localToUTC(
    localTime: string, // HH:MM format
    date: string, // YYYY-MM-DD format
    timezone: string
  ): DateTime {
    if (!this.validateTimeZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const dt = DateTime.fromFormat(`${date} ${localTime}`, 'yyyy-MM-dd HH:mm', {
      zone: timezone,
    });

    if (!dt.isValid) {
      throw new Error(`Invalid date/time: ${date} ${localTime} in ${timezone}`);
    }

    return dt.toUTC();
  }

  /**
   * Converts UTC time to local time for display
   */
  static utcToLocal(utcDateTime: DateTime, timezone: string): LocalTimeSlot {
    if (!this.validateTimeZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const localDt = utcDateTime.setZone(timezone);

    if (!localDt.isValid) {
      throw new Error(`Invalid UTC datetime: ${utcDateTime.toISO()}`);
    }

    return {
      start: localDt.toFormat('HH:mm'),
      end: localDt.toFormat('HH:mm'), // This would be calculated based on duration
      date: localDt.toFormat('yyyy-MM-dd'),
      utcStart: utcDateTime,
      utcEnd: utcDateTime, // This would be calculated based on duration
    };
  }

  /**
   * Converts a time slot from local time to UTC
   */
  static timeSlotToUTC(
    startTime: string, // HH:MM format
    endTime: string, // HH:MM format
    date: string, // YYYY-MM-DD format
    timezone: string
  ): TimeSlot {
    const utcStart = this.localToUTC(startTime, date, timezone);
    const utcEnd = this.localToUTC(endTime, date, timezone);

    return {
      start: utcStart,
      end: utcEnd,
      timezone,
    };
  }

  /**
   * Converts a UTC time slot to local time
   */
  static timeSlotToLocal(
    utcStart: DateTime,
    utcEnd: DateTime,
    timezone: string
  ): LocalTimeSlot {
    if (!this.validateTimeZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const localStart = utcStart.setZone(timezone);
    const localEnd = utcEnd.setZone(timezone);

    if (!localStart.isValid || !localEnd.isValid) {
      throw new Error('Invalid UTC datetime provided');
    }

    return {
      start: localStart.toFormat('HH:mm'),
      end: localEnd.toFormat('HH:mm'),
      date: localStart.toFormat('yyyy-MM-dd'),
      utcStart,
      utcEnd,
    };
  }

  /**
   * Handles daylight saving time transitions
   * Returns adjusted times if DST transition affects the time slot
   */
  static handleDSTTransition(
    startTime: string,
    endTime: string,
    date: string,
    timezone: string
  ): {
    adjustedStart: string;
    adjustedEnd: string;
    dstTransition: boolean;
    transitionType?: 'spring_forward' | 'fall_back';
    originalDuration: number;
    adjustedDuration: number;
  } {
    if (!this.validateTimeZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const startDt = DateTime.fromFormat(
      `${date} ${startTime}`,
      'yyyy-MM-dd HH:mm',
      { zone: timezone }
    );

    const endDt = DateTime.fromFormat(
      `${date} ${endTime}`,
      'yyyy-MM-dd HH:mm',
      { zone: timezone }
    );

    if (!startDt.isValid || !endDt.isValid) {
      throw new Error(`Invalid date/time: ${date} ${startTime}-${endTime}`);
    }

    const originalDuration = endDt.diff(startDt, 'minutes').minutes;

    // Check if this is a DST transition day
    const dayStart = startDt.startOf('day');
    const dayEnd = startDt.endOf('day');
    const dayStartOffset = dayStart.offset;
    const dayEndOffset = dayEnd.offset;

    const dstTransition = dayStartOffset !== dayEndOffset;

    if (!dstTransition) {
      return {
        adjustedStart: startTime,
        adjustedEnd: endTime,
        dstTransition: false,
        originalDuration,
        adjustedDuration: originalDuration,
      };
    }

    // Determine transition type
    const transitionType =
      dayEndOffset > dayStartOffset ? 'spring_forward' : 'fall_back';

    // For spring forward (lose an hour), check if appointment spans the gap
    if (transitionType === 'spring_forward') {
      // Find the exact transition time
      let transitionHour = 2; // Default DST transition hour
      for (let hour = 0; hour < 24; hour++) {
        const testTime = dayStart.plus({ hours: hour });
        if (!testTime.isValid) {
          transitionHour = hour;
          break;
        }
      }

      const transitionTime = dayStart.plus({ hours: transitionHour });

      // If appointment spans the DST gap, adjust end time
      if (startDt < transitionTime && endDt > transitionTime) {
        const adjustedEndDt = endDt.plus({ hours: 1 });
        return {
          adjustedStart: startTime,
          adjustedEnd: adjustedEndDt.toFormat('HH:mm'),
          dstTransition: true,
          transitionType,
          originalDuration,
          adjustedDuration: originalDuration,
        };
      }
    }

    // For fall back (gain an hour), appointments remain the same duration
    // but we need to be aware of the ambiguous hour
    return {
      adjustedStart: startTime,
      adjustedEnd: endTime,
      dstTransition: true,
      transitionType,
      originalDuration,
      adjustedDuration: originalDuration,
    };
  }

  /**
   * Gets the business timezone, with fallback to default
   */
  static getBusinessTimeZone(businessTimezone?: string): string {
    if (businessTimezone && this.validateTimeZone(businessTimezone)) {
      return businessTimezone;
    }
    return 'America/New_York'; // Default fallback
  }

  /**
   * Compares two times across different timezones
   */
  static compareAcrossTimeZones(
    time1: { time: string; date: string; timezone: string },
    time2: { time: string; date: string; timezone: string }
  ): number {
    const dt1 = this.localToUTC(time1.time, time1.date, time1.timezone);
    const dt2 = this.localToUTC(time2.time, time2.date, time2.timezone);

    if (dt1 < dt2) return -1;
    if (dt1 > dt2) return 1;
    return 0;
  }

  /**
   * Gets current time in business timezone
   */
  static getCurrentTimeInBusinessZone(timezone: string): DateTime {
    if (!this.validateTimeZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    return DateTime.now().setZone(timezone);
  }

  /**
   * Checks if a given date/time is valid in the specified timezone
   * (handles DST gaps where times don't exist)
   */
  static isValidTimeInZone(
    time: string,
    date: string,
    timezone: string
  ): boolean {
    try {
      const dt = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', {
        zone: timezone,
      });
      return dt.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Gets all supported timezones grouped by region
   */
  static getSupportedTimeZones(): Record<string, string[]> {
    return {
      'North America': [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Phoenix',
        'America/Anchorage',
        'America/Honolulu',
      ],
      Canada: ['America/Toronto', 'America/Vancouver', 'America/Montreal'],
      Europe: [
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Europe/Rome',
        'Europe/Madrid',
        'Europe/Amsterdam',
        'Europe/Brussels',
        'Europe/Vienna',
        'Europe/Zurich',
        'Europe/Stockholm',
      ],
      'Asia Pacific': [
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Hong_Kong',
        'Asia/Singapore',
        'Asia/Seoul',
        'Asia/Bangkok',
        'Asia/Dubai',
        'Australia/Sydney',
        'Australia/Melbourne',
        'Australia/Perth',
      ],
      Other: ['UTC'],
    };
  }
}

/**
 * Multi-location business timezone manager
 */
export class MultiLocationTimeZoneManager {
  private businessConfig: BusinessTimeZoneConfig;

  constructor(config: BusinessTimeZoneConfig) {
    this.businessConfig = config;
  }

  /**
   * Gets timezone for a specific location, falls back to business default
   */
  getLocationTimeZone(locationId?: string): string {
    if (locationId && this.businessConfig.locations) {
      const location = this.businessConfig.locations.find(
        l => l.id === locationId
      );
      if (location && TimeZoneHandler.validateTimeZone(location.timezone)) {
        return location.timezone;
      }
    }

    return TimeZoneHandler.getBusinessTimeZone(this.businessConfig.timezone);
  }

  /**
   * Converts availability across multiple locations to a common timezone (UTC)
   */
  normalizeAvailabilityAcrossLocations(
    availability: Array<{
      locationId?: string;
      startTime: string;
      endTime: string;
      date: string;
    }>
  ): Array<{
    locationId?: string;
    utcStart: DateTime;
    utcEnd: DateTime;
    localTimezone: string;
  }> {
    return availability.map(slot => {
      const timezone = this.getLocationTimeZone(slot.locationId);
      const utcStart = TimeZoneHandler.localToUTC(
        slot.startTime,
        slot.date,
        timezone
      );
      const utcEnd = TimeZoneHandler.localToUTC(
        slot.endTime,
        slot.date,
        timezone
      );

      return {
        locationId: slot.locationId,
        utcStart,
        utcEnd,
        localTimezone: timezone,
      };
    });
  }

  /**
   * Gets business hours for all locations in their respective timezones
   */
  getBusinessHoursAllLocations(date: string): Array<{
    locationId?: string;
    timezone: string;
    businessHours: {
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    };
  }> {
    const locations = this.businessConfig.locations || [
      {
        id: 'default',
        name: 'Main Location',
        timezone: this.businessConfig.timezone,
      },
    ];

    return locations.map(location => ({
      locationId: location.id,
      timezone: location.timezone,
      businessHours: {
        openTime: '09:00', // This would come from database
        closeTime: '18:00', // This would come from database
        isClosed: false, // This would come from database
      },
    }));
  }
}
