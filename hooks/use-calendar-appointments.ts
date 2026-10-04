'use client';

import {
  toDashboardAppointment,
  visibleWindow,
} from '@/lib/calendar/calendar-appointments';
import { fromWallClock, toWallClock } from '@/lib/calendar/zoned';
import type { DashboardAppointment } from '@/types/dashboard-appointments';
import { useEffect, useState } from 'react';

/** The API's page size limit (`paginationSchema` in lib/validations). */
const PAGE = 100;

interface Page {
  appointments: unknown[];
  pagination: { hasMore: boolean };
}

/**
 * The appointments a calendar view shows, fetched for its visible window and
 * refetched when the view or date moves. A stale response — the user has
 * already navigated on — is dropped rather than shown.
 *
 * `date` and the returned times are in the salon's wall clock (see
 * lib/calendar/zoned.ts): the window is converted to real instants for the
 * query, and each appointment's times back to the salon's clock.
 */
export function useCalendarAppointments(
  businessId: string,
  view: 'day' | 'week' | 'month',
  date: Date,
  staffColour: string,
  timezone: string
) {
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { start, end } = visibleWindow(view, date);
  const startKey = fromWallClock(start, timezone).toISOString();
  const endKey = fromWallClock(end, timezone).toISOString();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const params = new URLSearchParams({
          businessId,
          startDate: startKey,
          endDate: endKey,
          limit: String(PAGE),
          offset: String(offset),
        });
        const response = await fetch(`/api/appointments?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Appointments failed to load (${response.status})`);
        }
        const page = (await response.json()) as Page;
        rows.push(...page.appointments);
        if (!page.pagination.hasMore) break;
      }
      setAppointments(
        rows.map(row => {
          const appointment = toDashboardAppointment(row, staffColour);
          return {
            ...appointment,
            startTime: toWallClock(appointment.startTime, timezone),
            endTime: toWallClock(appointment.endTime, timezone),
          };
        })
      );
    })()
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setAppointments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [businessId, startKey, endKey, staffColour, timezone]);

  return { appointments, loading, error };
}
