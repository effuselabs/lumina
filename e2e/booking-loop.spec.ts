import { type Page, expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * THE DEFINITION OF DONE.
 *
 * A client finds a salon's public booking page, picks a service, picks a time,
 * enters their details, and books. The appointment lands in the database
 * against the right business, staff member and client.
 *
 * This spec is expected to FAIL when first written. That is its job: it
 * describes the product working, and each failure names the next thing to fix.
 * Nothing in this milestone is "done" until this passes.
 *
 * It runs against seeded data (`npm run db:seed`) rather than creating its own
 * salon, because owner onboarding is a separate flow with its own spec. What
 * this proves is the loop that earns money: a stranger can book an appointment.
 *
 * Deliberately NOT asserted here:
 *   - Email delivery. Resend is a third party and the domain is still
 *     verifying; asserting on a real inbox would make this spec flaky for
 *     reasons unrelated to the product. Covered separately once the queue
 *     records are wired up.
 *
 * All four tests pass. The KNOWN FAILURES list that stood here — availability
 * hanging, and the UI test blocked behind it — is resolved; see the commits
 * on `fix/availability-recursion` and `fix/booking-client-and-confirm`.
 */

const prisma = new PrismaClient();

/** The seeded salon. Resolved once, so a reseed with new IDs does not break this. */
async function seededBusiness() {
  const business = await prisma.business.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!business) {
    throw new Error(
      'No active business found. Run `npm run db:seed` before the E2E suite.'
    );
  }

  return business;
}

/**
 * Record what the browser saw, and attach it to the report if the test fails.
 *
 * Without this a CI-only failure gives you a timed-out locator and nothing
 * else — no console error, no failed request, no clue whether the booking POST
 * was even attempted. Diagnosing one cost several round trips through CI
 * guessing at browser differences. The listeners are cheap and the attachments
 * only appear on failure, so this stays on permanently.
 */
let reportBrowserActivity: (() => Promise<void>) | null = null;

function recordBrowserActivity(page: Page) {
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => {
    consoleErrors.push(`[uncaught] ${error.message}`);
  });
  page.on('requestfailed', request => {
    failedResponses.push(
      `${request.method()} ${request.url()} — ${request.failure()?.errorText}`
    );
  });
  page.on('response', async response => {
    if (response.status() < 400) return;
    let body = '';
    try {
      body = (await response.text()).slice(0, 300);
    } catch {
      body = '<unreadable>';
    }
    failedResponses.push(
      `${response.status()} ${response.request().method()} ${response.url()} :: ${body}`
    );
  });

  reportBrowserActivity = async () => {
    if (test.info().status === test.info().expectedStatus) return;

    await test.info().attach('console-errors', {
      body: consoleErrors.join('\n') || '(none)',
      contentType: 'text/plain',
    });
    await test.info().attach('failed-requests', {
      body: failedResponses.join('\n') || '(none)',
      contentType: 'text/plain',
    });

    // Also to stdout: the CI log is what you read first, and artifacts need
    // downloading.
    console.log(
      '=== console errors ===\n' + (consoleErrors.join('\n') || '(none)')
    );
    console.log(
      '=== failed requests ===\n' + (failedResponses.join('\n') || '(none)')
    );
  };
}

test.afterEach(async () => {
  await reportBrowserActivity?.();
  reportBrowserActivity = null;
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('booking loop', () => {
  test('the seeded salon has everything a booking needs', async () => {
    // Guards the spec below: if this fails, the fault is the seed, not the UI.
    // Business hours matter specifically — availability cannot be computed
    // without them, and they seeded zero rows for most of this project's life.
    const business = await seededBusiness();

    const [services, staff, hours] = await Promise.all([
      prisma.service.count({
        where: { businessId: business.id, isActive: true },
      }),
      prisma.staff.count({
        where: { businessId: business.id, isActive: true },
      }),
      prisma.businessHours.count({ where: { businessId: business.id } }),
    ]);

    expect(services, 'seeded active services').toBeGreaterThan(0);
    expect(staff, 'seeded active staff').toBeGreaterThan(0);
    expect(hours, 'seeded business hours').toBeGreaterThan(0);
  });

  test('public booking API exposes the salon and its services', async ({
    request,
  }) => {
    const business = await seededBusiness();

    const response = await request.get(`/api/public/booking/${business.id}`);

    expect(
      response.ok(),
      `GET /api/public/booking/${business.id} returned ${response.status()}`
    ).toBe(true);

    // Contract confirmed against the running route: this endpoint returns the
    // payload directly, NOT wrapped in { success, data }.
    const body = await response.json();
    expect(body.business?.name).toBe(business.name);
    expect(
      Array.isArray(body.services) && body.services.length,
      'services returned to the public booking page'
    ).toBeTruthy();
    expect(body.bookingConfig, 'booking configuration').toBeTruthy();
  });

  /**
   * The first date at least a week out on which the business is open.
   *
   * This used to be a flat `date.getDate() + 7`, which always lands on the
   * same weekday as today. The demo salon is closed on Sundays, so the whole
   * suite failed every Sunday and passed the rest of the week — a scheduled
   * flake that looks exactly like a real availability regression. It cost a
   * red build on a PR that had nothing to do with it.
   *
   * Reading the seeded business hours instead means the spec keeps working if
   * those hours change, and cannot be broken again by the day it runs on.
   *
   * The date string is still derived in UTC, matching what the availability
   * API expects today. That is wrong for a business in another zone and is
   * tracked separately in docs/PLAN.md; fixing it here would hide the bug the
   * timezone gate is being written to catch.
   */
  async function nextOpenDate(businessId: string): Promise<string> {
    const openDays = await prisma.businessHours.findMany({
      where: { businessId, isClosed: false },
      select: { dayOfWeek: true },
    });

    const openDayNumbers = new Set(openDays.map(hours => hours.dayOfWeek));
    expect(
      openDayNumbers.size,
      'the seeded business is open on at least one day of the week'
    ).toBeGreaterThan(0);

    const candidate = new Date();
    candidate.setDate(candidate.getDate() + 7);

    // At most a full week of steps, so a business open on a single weekday
    // still resolves rather than looping.
    for (let attempt = 0; attempt < 7; attempt += 1) {
      if (openDayNumbers.has(candidate.getUTCDay())) {
        return candidate.toISOString().split('T')[0];
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    throw new Error(
      `No open day found within a week of ${candidate.toISOString()} — ` +
        `business hours seeded as open on days [${[...openDayNumbers].join(', ')}]`
    );
  }

  /**
   * Click a specific date in the booking calendar, advancing the month first
   * if the target falls outside the one on screen.
   *
   * Day cells are buttons labelled with the day number alone, so the match is
   * exact — otherwise "1" also matches "13" and "21".
   */
  async function selectOpenDate(page: Page, isoDate: string): Promise<void> {
    const target = new Date(`${isoDate}T00:00:00Z`);
    const targetMonth = target.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    // Matched on its text rather than its level. `CardTitle` renders an <h3>,
    // so "Select Date" and "Available Times" are level-3 headings too, and
    // `{ level: 3 }` picks whichever comes first — not the month.
    const monthHeading = page.getByRole('heading', {
      name: /^[A-Z][a-z]+ \d{4}$/,
    });

    // The search window for an open day is under a fortnight, so the target
    // can cross one month boundary but never two.
    if ((await monthHeading.textContent())?.trim() !== targetMonth) {
      await page.getByRole('button', { name: /^next month$/i }).click();
    }
    await expect(monthHeading).toHaveText(targetMonth);

    // Day cells are buttons labelled with the number alone, so the match is
    // exact — otherwise "1" also matches "13" and "21".
    await page
      .getByRole('button', { name: String(target.getUTCDate()), exact: true })
      .click();
  }

  test('availability returns bookable slots for a service', async ({
    request,
  }) => {
    const business = await seededBusiness();

    /*
     * A service a client could actually book — one somebody can perform.
     *
     * This used to take the first active service in the table. The seed
     * assigns services to staff by specialty, so a run can leave a service
     * with nobody able to perform it; picking one of those and then asserting
     * on slots made the test fail for a correct empty result. Roughly one
     * service in six on a seeded salon, and which one `findFirst` returns is
     * arbitrary — so this failed at random rather than when something broke.
     */
    const service = await prisma.service.findFirst({
      where: {
        businessId: business.id,
        isActive: true,
        isOnline: true,
        staff: {
          some: { staff: { isActive: true, acceptsOnlineBookings: true } },
        },
      },
      select: { id: true, duration: true },
    });
    expect(
      service,
      'a bookable service — active, online, and with staff who can perform it'
    ).toBeTruthy();

    // A week out, to sit clear of same-day lead-time rules — then forward to
    // the next day the salon is actually open.
    const dateString = await nextOpenDate(business.id);

    // `duration` is required — omitting it returns a Zod VALIDATION_ERROR
    // ("Number must be greater than or equal to 1"), not an empty slot list.
    const response = await request.get(
      `/api/public/booking/${business.id}/availability` +
        `?date=${dateString}&serviceIds=${service!.id}&duration=${service!.duration}`,
      { timeout: 30_000 }
    );

    expect(
      response.ok(),
      `availability returned ${response.status()} for ${dateString}`
    ).toBe(true);

    // Contract confirmed against the running route: the key is
    // `availableSlots`, not `slots`.
    const body = await response.json();
    const slots = body.availableSlots ?? [];
    expect(
      Array.isArray(slots) && slots.length,
      `bookable slots on ${dateString} — zero usually means business hours ` +
        'or staff availability are not seeded'
    ).toBeTruthy();

    // Slots must be usable by the booking UI, which reads these fields.
    expect(slots[0]).toMatchObject({
      startTime: expect.any(String),
      endTime: expect.any(String),
      staffId: expect.any(String),
    });
  });

  test('a client can book an appointment end to end', async ({ page }) => {
    // Four steps, four page transitions, an availability computation and a
    // booking write. It runs in roughly 20s locally, which leaves no headroom
    // under the 30s default on a cold CI runner.
    test.setTimeout(120_000);
    recordBrowserActivity(page);

    const business = await seededBusiness();

    // A unique client per run, so repeated runs never collide and the
    // assertion below cannot match an appointment from an earlier run.
    //
    // The name is letters-only and the phone is unique per run, both on
    // purpose. Names are validated against /^[a-zA-Z\s'-]+$/, so a timestamp in
    // the surname fails the form; and `Client` is unique on (businessId,
    // phone), so a shared number would resolve to a previous run's client.
    const stamp = Date.now();
    const uniqueSuffix = String(stamp).slice(-7);
    const client = {
      firstName: 'Booking',
      lastName: 'Loop',
      email: `booking-loop-${stamp}@example.test`,
      phone: `555${uniqueSuffix}`,
    };

    await page.goto(`/book/${business.id}`);

    // Step 1 — Select Services
    await expect(
      page.getByRole('heading', { name: business.name })
    ).toBeVisible();
    await expect(page.getByText(/select services/i)).toBeVisible();

    const firstService = page
      .getByRole('button', { name: /add|select/i })
      .first();
    await firstService.click();
    await page.getByRole('button', { name: /^continue/i }).click();

    // Step 2 — Choose Date & Time
    await expect(page.getByText(/date & time|choose a time/i)).toBeVisible();

    // The calendar opens on today. When today is a day the salon is closed —
    // Sunday, for the demo salon — there are no slots to click and this test
    // fails for a reason that has nothing to do with the booking flow. Move to
    // a day the business is actually open before looking for a time.
    await selectOpenDate(page, await nextOpenDate(business.id));

    const firstSlot = page
      .getByRole('button', { name: /\d{1,2}:\d{2}\s*(am|pm)/i })
      .first();
    await expect(
      firstSlot,
      'at least one bookable time slot is offered'
    ).toBeVisible({ timeout: 15_000 });
    await firstSlot.click();
    await page.getByRole('button', { name: /^continue/i }).click();

    // Step 3 — Your Information
    // Matched by role, not getByLabel: the marketing opt-in is labelled
    // "...reminders and special offers via email", so getByLabel(/email/i)
    // resolves to both the text box and that checkbox.
    await expect(page.getByText(/your information/i)).toBeVisible();
    await page
      .getByRole('textbox', { name: /first name/i })
      .fill(client.firstName);
    await page
      .getByRole('textbox', { name: /last name/i })
      .fill(client.lastName);
    await page.getByRole('textbox', { name: /email/i }).fill(client.email);
    await page.getByRole('textbox', { name: /phone/i }).fill(client.phone);
    await page
      .getByRole('button', { name: /continue to confirmation/i })
      .click();

    // Step 4 — Review, then confirm. The button here is what actually creates
    // the appointment; reaching this screen is not the same as booking.
    await expect(page.getByText(/review your booking/i)).toBeVisible();
    await page.getByRole('button', { name: /confirm booking/i }).click();

    // Confirmed to the client.
    //
    // Matched on the success heading specifically. A looser
    // /confirmed|thank you|your appointment/ also matches the in-flight
    // "Creating Your Appointment..." progress panel, so the spec sailed past
    // this line while the POST was still running and then failed on the
    // database check below — reporting a booking bug where there was none.
    await expect(
      page.getByRole('heading', { name: /booking confirmed/i }),
      'the client is shown a confirmation'
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/confirmation number/i),
      'the confirmation carries the number the server generated'
    ).toBeVisible();

    // Persisted, scoped to the right tenant, and linked to the right client.
    // The UI saying "confirmed" is not the same as the booking existing.
    const appointment = await prisma.appointment.findFirst({
      where: {
        businessId: business.id,
        client: { email: client.email },
      },
      include: { client: true, staff: true, services: true },
    });

    expect(
      appointment,
      'the appointment was written to the database for this business'
    ).toBeTruthy();
    expect(appointment!.staffId, 'assigned to a staff member').toBeTruthy();
    expect(
      appointment!.services.length,
      'has at least one service'
    ).toBeGreaterThan(0);
    expect(appointment!.totalDuration, 'has a duration').toBeGreaterThan(0);
    expect(appointment!.client?.email).toBe(client.email);
  });
});
