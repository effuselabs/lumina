'use client';

import { createContext, useContext } from 'react';

/**
 * "Now" for the calendar's views, in the clock the calendar is laid out in.
 * The calendar page provides the salon's (see lib/calendar/zoned.ts); the
 * default, the browser's, keeps the views usable on their own.
 */
const CalendarClock = createContext<() => Date>(() => new Date());

export const CalendarClockProvider = CalendarClock.Provider;

export function useCalendarNow(): () => Date {
  return useContext(CalendarClock);
}
