/**
 * Time Zone Validation API
 *
 * Validates timezone strings and provides timezone information
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { TimeZoneHandler } from '../../../../../lib/services/timezone-handler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get('timezone');

    if (!timezone) {
      return NextResponse.json(
        { error: 'Timezone parameter is required' },
        { status: 400 }
      );
    }

    const isValid = TimeZoneHandler.validateTimeZone(timezone);

    if (!isValid) {
      return NextResponse.json({
        valid: false,
        timezone,
        error: `Invalid timezone: ${timezone}`,
      });
    }

    const timezoneInfo = TimeZoneHandler.getTimeZoneInfo(timezone);

    return NextResponse.json({
      valid: true,
      timezone,
      info: timezoneInfo,
    });
  } catch (error) {
    console.error('Error validating timezone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timezones } = body;

    if (!Array.isArray(timezones)) {
      return NextResponse.json(
        { error: 'Timezones must be an array' },
        { status: 400 }
      );
    }

    const results = timezones.map(timezone => {
      try {
        const isValid = TimeZoneHandler.validateTimeZone(timezone);

        if (!isValid) {
          return {
            timezone,
            valid: false,
            error: `Invalid timezone: ${timezone}`,
          };
        }

        const info = TimeZoneHandler.getTimeZoneInfo(timezone);
        return {
          timezone,
          valid: true,
          info,
        };
      } catch (error) {
        return {
          timezone,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error validating timezones:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
