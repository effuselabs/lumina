/**
 * Short-lived memo for the reads that availability makes over and over.
 *
 * A single availability request issued 1,318 database queries. The day's
 * business hours were read 180 times, the staff member's weekly availability
 * 180 times, the business row 249 times — none of which can change between one
 * read and the next inside one request. The cause is layered re-validation:
 * the calculator checks every slot it generates through the conflict engine,
 * and the real-time service then re-checks every surviving slot through
 * `CalendarIntegration`, which calls the calculator again. Each layer reads the
 * same day's constraints from scratch.
 *
 * Removing a layer is the real fix and is deliberately not attempted here — it
 * touches the booking write path, which is tenant-scoped and correctness
 * critical. See docs/PLAN.md. This makes the existing shape affordable: the
 * public booking page aborts its own request after 8 seconds
 * (`use-network-resilience.ts`), and on a slow host the endpoint did not
 * finish in time, so the page sat on "Checking Availability" forever.
 *
 * Two lifetimes, and the difference matters:
 *
 * - **Configuration** — hours, staff availability, overrides, time off,
 *   services. An owner edits these in settings; a minute of staleness costs
 *   nothing worse than their change appearing a minute late.
 * - **Booking state** — appointments. Cached for seconds only, so a slot
 *   someone just took does not linger as free. Even that is safe rather than
 *   merely brief: availability is advisory, and `book/route.ts` re-checks
 *   conflicts before it writes. The listing may be a moment stale; the booking
 *   cannot be.
 */

/** Configuration an owner edits. Stale by up to a minute is harmless. */
export const CONFIG_TTL_MS = 60_000;

/** Live booking state. Kept to seconds so a taken slot does not look free. */
export const BOOKING_STATE_TTL_MS = 5_000;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const entries = new Map<string, Entry<unknown>>();

/**
 * Run `read` and remember its result under `key` for `ttlMs`.
 *
 * Rejections are not cached: a failed read must be retried, not remembered as
 * an answer. The in-flight promise is not shared either — two concurrent
 * misses both query, which is one extra round trip in exchange for never
 * handing a caller a promise that was created for someone else's request.
 */
export async function remember<T>(
  key: string,
  ttlMs: number,
  read: () => Promise<T>
): Promise<T> {
  const cached = entries.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await read();

  entries.set(key, { value, expiresAt: Date.now() + ttlMs });

  // Opportunistic sweep. Availability keys are per business, day and staff
  // member, so they accumulate; without this a long-lived process holds every
  // key it ever saw.
  if (entries.size > 5_000) {
    const now = Date.now();

    for (const [existingKey, entry] of entries) {
      if (entry.expiresAt <= now) {
        entries.delete(existingKey);
      }
    }
  }

  return value;
}

/** Drops everything. For tests, and after a write that invalidates a schedule. */
export function forgetSchedules(): void {
  entries.clear();
}
