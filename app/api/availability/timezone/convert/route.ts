/**
 * Time Zone Conversion API
 *
 * Converts times between different timezones and handles DST transitions
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { DateTime } from 'luxon';
import { NextRequest, NextResponse } from 'next/server';
import { TimeZoneHandler } from '../../../../../lib/services/timezone-handler';

interface ConversionRequest {
  time: string; // HH:MM format
  date: string; // YYYY-MM-DD format
  fromTimezone: string;
  toTimezone: string;
}

interface TimeSlotConversionRequest {
  startTime: string;
  endTime: string;
  date: string;
  fromTimezone: string;
  toTimezone: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'single') {
      return await handleSingleTimeConversion(body);
    } else if (type === 'slot') {
      return await handleTimeSlotConversion(body);
    } else if (type === 'batch') {
      return await handleBatchConversion(body);
    } else {
      return NextResponse.json(
        {
          error:
            'Invalid conversion type. Must be "single", "slot", or "batch"',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in timezone conversion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleSingleTimeConversion(body: ConversionRequest) {
  const { time, date, fromTimezone, toTimezone } = body;

  // Validate input
  if (!time || !date || !fromTimezone || !toTimezone) {
    return NextResponse.json(
      {
        error: 'Missing required fields: time, date, fromTimezone, toTimezone',
      },
      { status: 400 }
    );
  }

  // Validate timezones
  if (!TimeZoneHandler.validateTimeZone(fromTimezone)) {
    return NextResponse.json(
      { error: `Invalid source timezone: ${fromTimezone}` },
      { status: 400 }
    );
  }

  if (!TimeZoneHandler.validateTimeZone(toTimezone)) {
    return NextResponse.json(
      { error: `Invalid target timezone: ${toTimezone}` },
      { status: 400 }
    );
  }

  try {
    // Convert to UTC first
    const utcTime = TimeZoneHandler.localToUTC(time, date, fromTimezone);

    // Convert to target timezone
    const localTime = TimeZoneHandler.utcToLocal(utcTime, toTimezone);

    // Check for DST transitions in both timezones
    const sourceDST = TimeZoneHandler.handleDSTTransition(
      time,
      time,
      date,
      fromTimezone
    );
    const targetDST = TimeZoneHandler.handleDSTTransition(
      localTime.start,
      localTime.start,
      localTime.date,
      toTimezone
    );

    return NextResponse.json({
      original: {
        time,
        date,
        timezone: fromTimezone,
      },
      converted: {
        time: localTime.start,
        date: localTime.date,
        timezone: toTimezone,
      },
      utc: {
        time: utcTime.toFormat('HH:mm'),
        date: utcTime.toFormat('yyyy-MM-dd'),
        iso: utcTime.toISO(),
      },
      dstInfo: {
        sourceDSTTransition: sourceDST.dstTransition,
        targetDSTTransition: targetDST.dstTransition,
        warnings: [
          ...(sourceDST.dstTransition
            ? [`Source timezone DST transition: ${sourceDST.transitionType}`]
            : []),
          ...(targetDST.dstTransition
            ? [`Target timezone DST transition: ${targetDST.transitionType}`]
            : []),
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Conversion failed' },
      { status: 400 }
    );
  }
}

async function handleTimeSlotConversion(body: TimeSlotConversionRequest) {
  const { startTime, endTime, date, fromTimezone, toTimezone } = body;

  // Validate input
  if (!startTime || !endTime || !date || !fromTimezone || !toTimezone) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: startTime, endTime, date, fromTimezone, toTimezone',
      },
      { status: 400 }
    );
  }

  // Validate timezones
  if (!TimeZoneHandler.validateTimeZone(fromTimezone)) {
    return NextResponse.json(
      { error: `Invalid source timezone: ${fromTimezone}` },
      { status: 400 }
    );
  }

  if (!TimeZoneHandler.validateTimeZone(toTimezone)) {
    return NextResponse.json(
      { error: `Invalid target timezone: ${toTimezone}` },
      { status: 400 }
    );
  }

  try {
    // Convert time slot to UTC
    const utcSlot = TimeZoneHandler.timeSlotToUTC(
      startTime,
      endTime,
      date,
      fromTimezone
    );

    // Convert to target timezone
    const localSlot = TimeZoneHandler.timeSlotToLocal(
      utcSlot.start,
      utcSlot.end,
      toTimezone
    );

    // Check for DST transitions
    const sourceDST = TimeZoneHandler.handleDSTTransition(
      startTime,
      endTime,
      date,
      fromTimezone
    );
    const targetDST = TimeZoneHandler.handleDSTTransition(
      localSlot.start,
      localSlot.end,
      localSlot.date,
      toTimezone
    );

    // Calculate duration
    const originalDuration = DateTime.fromFormat(
      `${date} ${endTime}`,
      'yyyy-MM-dd HH:mm',
      { zone: fromTimezone }
    ).diff(
      DateTime.fromFormat(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', {
        zone: fromTimezone,
      }),
      'minutes'
    ).minutes;

    const convertedDuration = utcSlot.end.diff(
      utcSlot.start,
      'minutes'
    ).minutes;

    return NextResponse.json({
      original: {
        startTime,
        endTime,
        date,
        timezone: fromTimezone,
        duration: originalDuration,
      },
      converted: {
        startTime: localSlot.start,
        endTime: localSlot.end,
        date: localSlot.date,
        timezone: toTimezone,
        duration: convertedDuration,
      },
      utc: {
        startTime: utcSlot.start.toFormat('HH:mm'),
        endTime: utcSlot.end.toFormat('HH:mm'),
        startDate: utcSlot.start.toFormat('yyyy-MM-dd'),
        endDate: utcSlot.end.toFormat('yyyy-MM-dd'),
        startISO: utcSlot.start.toISO(),
        endISO: utcSlot.end.toISO(),
      },
      dstInfo: {
        sourceDSTTransition: sourceDST.dstTransition,
        targetDSTTransition: targetDST.dstTransition,
        durationChanged: originalDuration !== convertedDuration,
        warnings: [
          ...(sourceDST.dstTransition
            ? [`Source timezone DST transition: ${sourceDST.transitionType}`]
            : []),
          ...(targetDST.dstTransition
            ? [`Target timezone DST transition: ${targetDST.transitionType}`]
            : []),
          ...(originalDuration !== convertedDuration
            ? ['Duration changed due to timezone conversion']
            : []),
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Conversion failed' },
      { status: 400 }
    );
  }
}

async function handleBatchConversion(body: {
  conversions: ConversionRequest[];
}) {
  const { conversions } = body;

  if (!Array.isArray(conversions)) {
    return NextResponse.json(
      { error: 'Conversions must be an array' },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    conversions.map(async (conversion, index) => {
      try {
        const result = await handleSingleTimeConversion(conversion);
        const data = await result.json();

        return {
          index,
          success: result.status === 200,
          data: result.status === 200 ? data : undefined,
          error: result.status !== 200 ? data.error : undefined,
        };
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return NextResponse.json({
    summary: {
      total: conversions.length,
      successful,
      failed,
    },
    results,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'supported-timezones') {
      const timezones = TimeZoneHandler.getSupportedTimeZones();
      return NextResponse.json({ timezones });
    }

    if (action === 'current-time') {
      const timezone = searchParams.get('timezone');

      if (!timezone) {
        return NextResponse.json(
          { error: 'Timezone parameter is required for current-time action' },
          { status: 400 }
        );
      }

      if (!TimeZoneHandler.validateTimeZone(timezone)) {
        return NextResponse.json(
          { error: `Invalid timezone: ${timezone}` },
          { status: 400 }
        );
      }

      const currentTime =
        TimeZoneHandler.getCurrentTimeInBusinessZone(timezone);
      const timezoneInfo = TimeZoneHandler.getTimeZoneInfo(
        timezone,
        currentTime
      );

      return NextResponse.json({
        timezone,
        currentTime: {
          time: currentTime.toFormat('HH:mm'),
          date: currentTime.toFormat('yyyy-MM-dd'),
          iso: currentTime.toISO(),
          formatted: currentTime.toFormat('yyyy-MM-dd HH:mm:ss'),
        },
        timezoneInfo,
      });
    }

    return NextResponse.json(
      {
        error:
          'Invalid action. Supported actions: supported-timezones, current-time',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in timezone conversion GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
