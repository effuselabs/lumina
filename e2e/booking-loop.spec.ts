import { expect, test } from '@playwright/test';
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
 * KNOWN FAILURES as of writing — these are the work, not bugs in the spec:
 *
 *   1. GET /api/public/booking/[id]/availability HANGS. With a valid date,
 *      serviceIds and duration it never responds (observed: no reply after
 *      10 minutes against seeded data). Everything upstream of it works —
 *      the business/services endpoint returns in milliseconds — so the fault
 *      is inside availability computation, most likely an unbounded loop in
 *      lib/services/availability-calculator.ts or conflict-detection-engine.ts.
 *      This blocks the whole loop: no slots means nothing to book.
 *
 *   2. The end-to-end UI test cannot pass until (1) is fixed, since step 2 of
 *      the booking flow waits for a time slot that never arrives.
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

  test('availability returns bookable slots for a service', async ({
    request,
  }) => {
    const business = await seededBusiness();

    const service = await prisma.service.findFirst({
      where: { businessId: business.id, isActive: true },
      select: { id: true, duration: true },
    });
    expect(service, 'an active service to check availability for').toBeTruthy();

    // A week out, to sit clear of same-day lead-time rules.
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const dateString = date.toISOString().split('T')[0];

    // `duration` is required — omitting it returns a Zod VALIDATION_ERROR
    // ("Number must be greater than or equal to 1"), not an empty slot list.
    const response = await request.get(
      `/api/public/booking/${business.id}/availability` +
        `?date=${dateString}&serviceIds=${service!.id}&duration=${service!.duration}`,
      // This route currently hangs rather than responding. The timeout keeps
      // the failure fast and legible instead of stalling the whole suite.
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
    const business = await seededBusiness();

    // A unique client per run, so repeated runs never collide and the
    // assertion below cannot match an appointment from an earlier run.
    const stamp = Date.now();
    const client = {
      firstName: 'Booking',
      lastName: `Loop${stamp}`,
      email: `booking-loop-${stamp}@example.test`,
      phone: '5551234567',
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
    await page.getByRole('button', { name: /continue|next/i }).click();

    // Step 2 — Choose Date & Time
    await expect(page.getByText(/date & time|choose a time/i)).toBeVisible();
    const firstSlot = page
      .getByRole('button', { name: /\d{1,2}:\d{2}\s*(am|pm)/i })
      .first();
    await expect(
      firstSlot,
      'at least one bookable time slot is offered'
    ).toBeVisible({ timeout: 15_000 });
    await firstSlot.click();
    await page.getByRole('button', { name: /continue|next/i }).click();

    // Step 3 — Your Information
    await expect(page.getByText(/your information/i)).toBeVisible();
    await page.getByLabel(/first name/i).fill(client.firstName);
    await page.getByLabel(/last name/i).fill(client.lastName);
    await page.getByLabel(/email/i).fill(client.email);
    await page.getByLabel(/phone/i).fill(client.phone);
    await page.getByRole('button', { name: /continue|next|review/i }).click();

    // Step 4 — Confirm Booking
    await expect(page.getByText(/confirm/i).first()).toBeVisible();
    await page
      .getByRole('button', { name: /confirm booking|book appointment/i })
      .click();

    // Confirmed to the client
    await expect(
      page.getByText(/confirmed|thank you|your appointment/i).first(),
      'the client is shown a confirmation'
    ).toBeVisible({ timeout: 20_000 });

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
