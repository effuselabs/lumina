import { ServiceFactory } from '@/prisma/factories/service-factory';
import type { PrismaClient } from '@prisma/client';

/**
 * The seed switched seasonal services on when it ran in their months: run in
 * October it made none bookable, run in November it added "Holiday Glam
 * Package" to the booking page. The demo salon is meant to be the same every
 * time the seed runs (#112), and that one card moved every booking-page
 * screenshot the month it appeared. Seasonal services are seeded switched
 * off, for the owner to turn on in season, whatever the date.
 */
const SEASONAL = [
  'Holiday Glam Package',
  'Summer Beach Waves',
  'Bridal Trial Run',
  "Valentine's Day Mani",
  'Spring Renewal Facial',
  'New Year Detox Facial',
];

describe('seeded seasonal services', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  async function seasonalRows(on: string) {
    jest.useFakeTimers({ now: new Date(on), doNotFake: ['nextTick'] });
    const create = jest
      .fn()
      .mockImplementation(({ data }) => ({ id: data.name, ...data }));
    const prisma = { service: { create } } as unknown as PrismaClient;
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await new ServiceFactory(prisma, 'business-1').generateAllServices({
      includeSeasonalServices: true,
      includePricingTiers: false,
    });

    return create.mock.calls
      .map(([{ data }]) => data)
      .filter(row => SEASONAL.includes(row.name))
      .map(({ name, isActive, isOnline }) => ({ name, isActive, isOnline }));
  }

  it('are the same in every month', async () => {
    const october = await seasonalRows('2026-10-15T12:00:00Z');
    const november = await seasonalRows('2026-11-15T12:00:00Z');

    expect(october.map(row => row.name)).toEqual(SEASONAL);
    expect(november).toEqual(october);
  });

  it('are created switched off, for the owner to turn on in season', async () => {
    const rows = await seasonalRows('2026-11-15T12:00:00Z');

    expect(rows.every(row => !row.isActive && !row.isOnline)).toBe(true);
  });
});
