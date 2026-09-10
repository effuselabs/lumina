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
  /**
   * Which open day this browser project books on.
   *
   * Chromium and Mobile Safari run the same spec. Both used to resolve the
   * same next open day and then click the first offered slot — the same staff
   * member at the same minute — so whichever booked second got a correct HTTP
   * 400 from the conflict check and failed. CI never saw it because
   * `workers: 1` lets availability recompute in between; locally, at
   * `workers: 2`, it reproduced about one run in six.
   *
   * Serialising the projects would also fix it, and would be the wrong fix:
   * running the two viewports concurrently is what makes them independent
   * checks rather than the same check twice.
   *
   * Derived from the position in `projects` rather than a hardcoded map, so a
   * third project gets its own day instead of silently sharing Chromium's.
   */
  /** A step is a lazily-loaded chunk the dev server compiles on first use. */
  const STEP_TRANSITION_TIMEOUT = 20_000;

  function projectDayOffset(): number {
    const info = test.info();
    const index = info.config.projects.findIndex(
      project => project.name === info.project.name
    );

    return index < 0 ? 0 : index;
  }

  async function nextOpenDate(
    businessId: string,
    skipOpenDays = 0
  ): Promise<string> {
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

    // Enough steps to reach the (skipOpenDays + 1)-th open day even for a
    // business open on a single weekday, which is one week per day skipped.
    const horizon = 7 * (skipOpenDays + 1);
    let found = 0;

    for (let attempt = 0; attempt < horizon; attempt += 1) {
      if (openDayNumbers.has(candidate.getUTCDay())) {
        if (found === skipOpenDays) {
          return candidate.toISOString().split('T')[0];
        }
        found += 1;
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    throw new Error(
      `No open day number ${skipOpenDays + 1} found within ${horizon} days of ` +
        `${candidate.toISOString()} — business hours seeded as open on days ` +
        `[${[...openDayNumbers].join(', ')}]`
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

    /*
     * Advance until the month matches, rather than clicking once.
     *
     * A single click was enough while every project booked the same day about
     * a week out. Now each project takes its own open day, so the target can
     * be three weeks out and land two months ahead when the run starts near
     * the end of a month. Three clicks is more than that ever needs; the bound
     * is there so a mislabelled control fails the test rather than hanging it.
     */
    for (let hop = 0; hop < 3; hop += 1) {
      if ((await monthHeading.textContent())?.trim() === targetMonth) break;
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

    // A week out, to sit clear of same-day lead-time rules — then forward to
    // the next day the salon is actually open. Resolved first, because which
    // service is bookable depends on which weekday this lands on.
    const dateString = await nextOpenDate(business.id);
    const dayOfWeek = new Date(`${dateString}T00:00:00Z`).getUTCDay();

    /*
     * A service a client could actually book on *this* day.
     *
     * Two filters, and the second is the one that was missing. The seed
     * assigns services to staff by specialty, so a service can end up with
     * nobody able to perform it — that much was already handled. But staff are
     * also seeded with their own weekly availability, and not every one of
     * them works every day: on this salon, six of the twenty-four have no
     * StaffAvailability row for Tuesday through Friday.
     *
     * So a service could pass "somebody can perform it" and still have nobody
     * rostered on the day being asked about, and the API would correctly
     * return no slots. Which service `findFirst` returns is arbitrary, so this
     * failed on the day the calendar happened to land on a weekday its chosen
     * service was not staffed for — deterministically on CI, and never on a
     * developer's machine whose seeded staff happened to differ.
     */
    const service = await prisma.service.findFirst({
      where: {
        businessId: business.id,
        isActive: true,
        isOnline: true,
        staff: {
          some: {
            staff: {
              isActive: true,
              acceptsOnlineBookings: true,
              staffAvailability: { some: { dayOfWeek } },
            },
          },
        },
      },
      select: { id: true, duration: true },
    });
    expect(
      service,
      `a service that is active and online, with staff who accept online ` +
        `bookings and are rostered on day ${dayOfWeek} (${dateString})`
    ).toBeTruthy();

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
    // The step's own <h2>, not the progress stepper's "Select Services" label.
    // That label is hidden below the stepper's breakpoint, so this assertion
    // could never pass on Mobile Safari, and on desktop it passed only once the
    // stepper had hydrated — which is why this line failed CI on `main` in one
    // run and its own retry. The heading is the actual content of the step and
    // is present in both viewports.
    await expect(
      page.getByRole('heading', { name: /select your services/i })
    ).toBeVisible();

    const firstService = page
      .getByRole('button', { name: /add|select/i })
      .first();
    const continueButton = page.getByRole('button', { name: /^continue/i });

    /*
     * Wait for the click to actually register before moving on.
     *
     * `Continue` starts disabled and is enabled by React state once a service
     * is selected. On a cold dev server the first navigation compiles the
     * route, so hydration can land after the button is painted — the click
     * then hits an element with no handler attached, the selection never
     * happens, and the spec sat on `continueButton.click()` until the
     * 120s test timeout, reporting a click failure rather than a lost one.
     *
     * `toPass` retries the whole block, and the guard makes the retry safe:
     * selecting a service toggles it, so re-clicking an already-selected card
     * would deselect it. Only click while `Continue` is still disabled.
     */
    await expect(async () => {
      if (await continueButton.isDisabled()) {
        await firstService.click();
      }
      await expect(continueButton).toBeEnabled({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    await continueButton.click();

    // Step 2 — Choose Date & Time
    /*
     * Step transitions get an explicit timeout, not the 5s default.
     *
     * Each step is a lazily-loaded chunk, and the dev server compiles it on
     * first request — so the transition that takes a moment in production can
     * take several seconds on a cold run, and on the mobile project it renders
     * a different component tree that has to compile separately. The default
     * expired mid-compile and reported "element(s) not found", which reads as
     * a broken flow rather than a slow one.
     */
    await expect(page.getByText(/date & time|choose a time/i)).toBeVisible({
      timeout: STEP_TRANSITION_TIMEOUT,
    });

    // The calendar opens on today. When today is a day the salon is closed —
    // Sunday, for the demo salon — there are no slots to click and this test
    // fails for a reason that has nothing to do with the booking flow. Move to
    // a day the business is actually open before looking for a time.
    // A different open day per browser project, so the two do not compete for
    // the same slot when they run concurrently. See projectDayOffset.
    await selectOpenDate(
      page,
      await nextOpenDate(business.id, projectDayOffset())
    );

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
    await expect(page.getByText(/your information/i)).toBeVisible({
      timeout: STEP_TRANSITION_TIMEOUT,
    });
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
    await expect(page.getByText(/review your booking/i)).toBeVisible({
      timeout: STEP_TRANSITION_TIMEOUT,
    });
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

    /*
     * Remove what this run created.
     *
     * The spec books a real appointment against the seeded salon and used to
     * leave it there. Every run consumed one more slot on the same day, so a
     * developer's database degraded steadily: after about thirty runs the day
     * had no bookable slots left and the availability test above began failing
     * with "zero usually means business hours or staff availability are not
     * seeded" — pointing at the seed, which was fine, rather than at the
     * eighty-three appointments this spec had written. CI never saw it because
     * every run gets an empty database.
     *
     * Scoped to this run's own client rather than to a pattern, because the
     * other browser project may be mid-run in the next transaction.
     */
    const bookedDay = appointment!.startTime;

    await prisma.appointment.deleteMany({
      where: { businessId: business.id, client: { email: client.email } },
    });
    await prisma.client.deleteMany({
      where: { businessId: business.id, email: client.email },
    });

    /*
     * And the cached availability derived from it.
     *
     * Booking through the UI invalidates this correctly — book/route.ts calls
     * AvailabilityCacheInvalidation.handleAppointmentEvent. These deletes do
     * not go through the application, so nothing invalidates on their behalf,
     * and the cache keeps answering "no slots" for a day that is now empty
     * until its fifteen-minute TTL expires. Cleaning up the appointment but
     * not its cached shadow made the availability test fail on every run
     * rather than one in six, which is how this came to light.
     */
    await prisma.availabilityCache.deleteMany({
      where: {
        businessId: business.id,
        date: new Date(
          Date.UTC(
            bookedDay.getUTCFullYear(),
            bookedDay.getUTCMonth(),
            bookedDay.getUTCDate()
          )
        ),
      },
    });
  });
});
