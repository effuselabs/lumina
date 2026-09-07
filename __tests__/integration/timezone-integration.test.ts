/**
 * Time Zone Integration Tests
 *
 * End-to-end tests for timezone handling across the calendar infrastructure
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  MultiLocationTimeZoneManager,
  TimeZoneHandler,
} from '../../lib/services/timezone-handler';

describe('Timezone Integration Tests', () => {
  describe('Cross-timezone appointment booking flow', () => {
    it('should handle booking from different timezone than business', async () => {
      // Scenario: Client in London books appointment at NYC salon
      const businessTimezone = 'America/New_York';
      const clientTimezone = 'Europe/London';
      const appointmentDate = '2024-07-15';
      const clientLocalTime = '14:00'; // 2 PM London time

      // Convert client time to business timezone
      const utcTime = TimeZoneHandler.localToUTC(
        clientLocalTime,
        appointmentDate,
        clientTimezone
      );
      const businessLocalTime = TimeZoneHandler.utcToLocal(
        utcTime,
        businessTimezone
      );

      // 14:00 BST (London) = 13:00 UTC = 09:00 EDT (NYC)
      expect(businessLocalTime.start).toBe('09:00');
      expect(utcTime.hour).toBe(13);
    });

    it('should handle DST transition during appointment', async () => {
      // Scenario: Appointment scheduled during spring forward DST transition
      const timezone = 'America/New_York';
      const dstTransitionDate = '2024-03-10'; // Spring forward date
      const appointmentStart = '01:30';
      const appointmentEnd = '03:30';

      const dstInfo = TimeZoneHandler.handleDSTTransition(
        appointmentStart,
        appointmentEnd,
        dstTransitionDate,
        timezone
      );

      expect(dstInfo.dstTransition).toBe(true);
      expect(dstInfo.transitionType).toBe('spring_forward');

      // The appointment should be adjusted to account for the lost hour
      expect(dstInfo.adjustedEnd).not.toBe(appointmentEnd);
    });

    it('should validate appointment times across multiple timezones', async () => {
      const testCases = [
        {
          clientTime: '09:00',
          clientTimezone: 'America/Los_Angeles',
          businessTimezone: 'America/New_York',
          expectedBusinessTime: '12:00', // 9 AM PST = 12 PM EST
        },
        {
          clientTime: '15:00',
          clientTimezone: 'Europe/London',
          businessTimezone: 'Asia/Tokyo',
          expectedBusinessTime: '23:00', // 3 PM BST = 11 PM JST
        },
        {
          clientTime: '10:00',
          clientTimezone: 'Australia/Sydney',
          businessTimezone: 'America/New_York',
          expectedBusinessTime: '20:00', // 10 AM AEST = 8 PM EDT (previous day)
        },
      ];

      for (const testCase of testCases) {
        const utcTime = TimeZoneHandler.localToUTC(
          testCase.clientTime,
          '2024-07-15',
          testCase.clientTimezone
        );
        const businessTime = TimeZoneHandler.utcToLocal(
          utcTime,
          testCase.businessTimezone
        );

        expect(businessTime.start).toBe(testCase.expectedBusinessTime);
      }
    });
  });

  describe('Multi-location business scenarios', () => {
    let multiLocationManager: MultiLocationTimeZoneManager;

    beforeEach(() => {
      const config = {
        businessId: 'multi-business-1',
        timezone: 'America/New_York',
        locations: [
          { id: 'nyc', name: 'NYC Location', timezone: 'America/New_York' },
          { id: 'la', name: 'LA Location', timezone: 'America/Los_Angeles' },
          { id: 'london', name: 'London Location', timezone: 'Europe/London' },
        ],
      };
      multiLocationManager = new MultiLocationTimeZoneManager(config);
    });

    it('should normalize availability across all locations', async () => {
      const availability = [
        {
          locationId: 'nyc',
          startTime: '09:00',
          endTime: '17:00',
          date: '2024-07-15',
        },
        {
          locationId: 'la',
          startTime: '09:00',
          endTime: '17:00',
          date: '2024-07-15',
        },
        {
          locationId: 'london',
          startTime: '09:00',
          endTime: '17:00',
          date: '2024-07-15',
        },
      ];

      const normalized =
        multiLocationManager.normalizeAvailabilityAcrossLocations(availability);

      expect(normalized).toHaveLength(3);

      // All should be different UTC times despite same local times
      const utcStartTimes = normalized.map((slot: any) => slot.utcStart.hour);
      expect(new Set(utcStartTimes).size).toBe(3); // All different

      // NYC: 09:00 EDT = 13:00 UTC
      expect(
        normalized.find((n: any) => n.locationId === 'nyc')?.utcStart.hour
      ).toBe(13);

      // LA: 09:00 PDT = 16:00 UTC
      expect(
        normalized.find((n: any) => n.locationId === 'la')?.utcStart.hour
      ).toBe(16);

      // London: 09:00 BST = 08:00 UTC
      expect(
        normalized.find((n: any) => n.locationId === 'london')?.utcStart.hour
      ).toBe(8);
    });

    it('should handle location-specific business hours', async () => {
      const businessHours =
        multiLocationManager.getBusinessHoursAllLocations('2024-07-15');

      expect(businessHours).toHaveLength(3);
      expect(businessHours.map((bh: any) => bh.timezone)).toEqual([
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
      ]);
    });
  });

  describe('DST transition edge cases', () => {
    it('should handle spring forward transition correctly', async () => {
      // March 10, 2024 - Spring forward in America/New_York
      const timezone = 'America/New_York';
      const transitionDate = '2024-03-10';

      // Test times around the transition
      const testTimes = [
        { time: '01:30', shouldExist: true },
        { time: '02:30', shouldExist: false }, // This time doesn't exist
        { time: '03:30', shouldExist: true },
      ];

      for (const test of testTimes) {
        const isValid = TimeZoneHandler.isValidTimeInZone(
          test.time,
          transitionDate,
          timezone
        );
        expect(isValid).toBe(test.shouldExist);
      }
    });

    it('should handle fall back transition correctly', async () => {
      // November 3, 2024 - Fall back in America/New_York
      const timezone = 'America/New_York';
      const transitionDate = '2024-11-03';

      // All times should exist, but 1:30 AM occurs twice
      const testTimes = ['01:00', '01:30', '02:00', '02:30'];

      for (const time of testTimes) {
        const isValid = TimeZoneHandler.isValidTimeInZone(
          time,
          transitionDate,
          timezone
        );
        expect(isValid).toBe(true);
      }

      // Check DST transition detection
      const dstInfo = TimeZoneHandler.handleDSTTransition(
        '01:00',
        '03:00',
        transitionDate,
        timezone
      );
      expect(dstInfo.dstTransition).toBe(true);
      expect(dstInfo.transitionType).toBe('fall_back');
    });

    it('should handle timezone without DST', async () => {
      // Arizona doesn't observe DST
      const timezone = 'America/Phoenix';
      const springDate = '2024-03-10';
      const fallDate = '2024-11-03';

      // No DST transitions should be detected
      const springDST = TimeZoneHandler.handleDSTTransition(
        '02:00',
        '03:00',
        springDate,
        timezone
      );
      const fallDST = TimeZoneHandler.handleDSTTransition(
        '01:00',
        '02:00',
        fallDate,
        timezone
      );

      expect(springDST.dstTransition).toBe(false);
      expect(fallDST.dstTransition).toBe(false);
    });
  });

  describe('Business hours validation across timezones', () => {
    it('should validate business hours in different timezones', async () => {
      const businessTimezone = 'America/New_York';
      const clientTimezone = 'Europe/London';

      // Business hours: 9 AM - 5 PM EST
      const businessOpen = '09:00';
      const businessClose = '17:00';
      const date = '2024-07-15';

      // Convert business hours to client timezone
      const utcOpen = TimeZoneHandler.localToUTC(
        businessOpen,
        date,
        businessTimezone
      );
      const utcClose = TimeZoneHandler.localToUTC(
        businessClose,
        date,
        businessTimezone
      );

      const clientOpen = TimeZoneHandler.utcToLocal(utcOpen, clientTimezone);
      const clientClose = TimeZoneHandler.utcToLocal(utcClose, clientTimezone);

      // 9 AM EST = 2 PM BST, 5 PM EST = 10 PM BST
      expect(clientOpen.start).toBe('14:00');
      expect(clientClose.start).toBe('22:00');
    });

    it('should handle business hours that span midnight in client timezone', async () => {
      const businessTimezone = 'America/Los_Angeles';
      const clientTimezone = 'Asia/Tokyo';

      // Business: 9 AM - 5 PM PST
      const businessOpen = '09:00';
      const businessClose = '17:00';
      const date = '2024-07-15';

      const utcOpen = TimeZoneHandler.localToUTC(
        businessOpen,
        date,
        businessTimezone
      );
      const utcClose = TimeZoneHandler.localToUTC(
        businessClose,
        date,
        businessTimezone
      );

      const clientOpen = TimeZoneHandler.utcToLocal(utcOpen, clientTimezone);
      const clientClose = TimeZoneHandler.utcToLocal(utcClose, clientTimezone);

      // 9 AM PST = 1 AM JST next day, 5 PM PST = 9 AM JST next day
      expect(clientOpen.start).toBe('01:00');
      expect(clientOpen.date).toBe('2024-07-16'); // Next day
      expect(clientClose.start).toBe('09:00');
      expect(clientClose.date).toBe('2024-07-16'); // Next day
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large batch timezone conversions efficiently', async () => {
      const conversions = [];
      const timezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];

      // Generate 100 conversion requests
      for (let i = 0; i < 100; i++) {
        conversions.push({
          time: `${9 + (i % 8)}:${(i % 4) * 15}`.padStart(5, '0'),
          date: '2024-07-15',
          fromTimezone: timezones[i % timezones.length],
          toTimezone: timezones[(i + 1) % timezones.length],
        });
      }

      const startTime = Date.now();

      const results = conversions.map((conv: any) => {
        try {
          const utc = TimeZoneHandler.localToUTC(
            conv.time,
            conv.date,
            conv.fromTimezone
          );
          const local = TimeZoneHandler.utcToLocal(utc, conv.toTimezone);
          return { success: true, result: local };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 1 second for 100 conversions)
      expect(duration).toBeLessThan(1000);

      // All conversions should succeed
      const successful = results.filter((r: any) => r.success).length;
      expect(successful).toBe(100);
    });

    it('should handle invalid timezone gracefully', async () => {
      const invalidTimezones = [
        'Invalid/Timezone',
        'EST', // Abbreviation not supported
        'GMT+5', // Offset format not supported
        '',
        null,
        undefined,
      ];

      for (const timezone of invalidTimezones) {
        expect(TimeZoneHandler.validateTimeZone(timezone as any)).toBe(false);

        expect(() => {
          TimeZoneHandler.getTimeZoneInfo(timezone as any);
        }).toThrow();
      }
    });

    it('should handle edge dates correctly', async () => {
      const edgeDates = [
        '2024-02-29', // Leap year
        '2024-12-31', // Year end
        '2024-01-01', // Year start
        '2024-06-21', // Summer solstice
        '2024-12-21', // Winter solstice
      ];

      for (const date of edgeDates) {
        const utc = TimeZoneHandler.localToUTC(
          '12:00',
          date,
          'America/New_York'
        );
        const local = TimeZoneHandler.utcToLocal(utc, 'Europe/London');

        expect(utc.isValid).toBe(true);
        expect(local.utcStart.isValid).toBe(true);
        expect(local.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle international client booking scenario', async () => {
      // Scenario: Japanese client books appointment at NYC salon
      const clientTimezone = 'Asia/Tokyo';
      const businessTimezone = 'America/New_York';
      const appointmentDate = '2024-07-15';

      // Client wants 2 PM appointment in their local time
      const clientPreferredTime = '14:00';

      // Convert to business time
      const utcTime = TimeZoneHandler.localToUTC(
        clientPreferredTime,
        appointmentDate,
        clientTimezone
      );
      const businessTime = TimeZoneHandler.utcToLocal(
        utcTime,
        businessTimezone
      );

      // 2 PM JST = 1 AM EDT (same day)
      expect(businessTime.start).toBe('01:00');
      expect(businessTime.date).toBe('2024-07-15');

      // This would be outside business hours, so system should suggest alternatives
      const businessHoursStart = TimeZoneHandler.localToUTC(
        '09:00',
        appointmentDate,
        businessTimezone
      );
      const clientEquivalentTime = TimeZoneHandler.utcToLocal(
        businessHoursStart,
        clientTimezone
      );

      // 9 AM EDT = 10 PM JST
      expect(clientEquivalentTime.start).toBe('22:00');
    });

    it('should handle daylight saving time boundary appointments', async () => {
      // Scenario: Recurring appointment that spans DST transition
      const timezone = 'America/New_York';
      const regularDate = '2024-03-03'; // Before DST
      const dstDate = '2024-03-10'; // DST transition date
      const postDstDate = '2024-03-17'; // After DST

      const appointmentTime = '10:00';

      // Convert all to UTC to see the difference
      const regularUtc = TimeZoneHandler.localToUTC(
        appointmentTime,
        regularDate,
        timezone
      );
      const dstUtc = TimeZoneHandler.localToUTC(
        appointmentTime,
        dstDate,
        timezone
      );
      const postDstUtc = TimeZoneHandler.localToUTC(
        appointmentTime,
        postDstDate,
        timezone
      );

      // Before DST: 10 AM EST = 15:00 UTC
      expect(regularUtc.hour).toBe(15);

      // On DST transition: 10 AM EDT = 14:00 UTC (1 hour difference)
      expect(dstUtc.hour).toBe(14);

      // After DST: 10 AM EDT = 14:00 UTC
      expect(postDstUtc.hour).toBe(14);

      // The UTC time changes by 1 hour due to DST
      expect(regularUtc.hour - dstUtc.hour).toBe(1);
    });
  });
});
