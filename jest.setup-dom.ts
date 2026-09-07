// Jest DOM setup
import '@testing-library/jest-dom';

// Availability memoises the reads it makes hundreds of times per request
// (business hours, staff availability, the salon's timezone). The store is
// module-level, so without this a suite inherits whatever the previous one
// cached — which is how a "business closed" assertion started passing back an
// earlier test's opening hours, and only under some timezones, because the
// keys are derived from dates the tests build locally.
//
// Imported from `schedule-cache`, which pulls in no Prisma client, so suites
// that never touch the database are unaffected.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { forgetSchedules } = require('@/lib/services/schedule-cache');

beforeEach(() => {
  forgetSchedules();
});
