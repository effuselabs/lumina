import { publicBookingAbuseDetector } from '@/lib/security/public-booking-rate-limiter';
import type { NextRequest } from 'next/server';

/**
 * The abuse detector sits in front of every public booking endpoint. A false
 * positive returns 403 "Your request appears suspicious. Please contact us
 * directly" — a dead end for a client who has done nothing wrong.
 *
 * Two of its three rules were misfiring:
 *
 *   - The "rapid requests" rule compared `now` against `lastSeen` *after*
 *     assigning `lastSeen = now`, so the difference was always 0 and the rule
 *     reduced to "this is not your first request". Every returning visitor was
 *     flagged. It only stayed hidden because the booking flow used to make
 *     exactly one abuse-checked request per client; adding a second one
 *     surfaced it immediately.
 *
 *   - The hourly ceiling was 20 requests per IP+user-agent. One client
 *     completing one booking makes most of that, and the identifier is
 *     IP-based, so a salon's own wifi, an office, or a mobile carrier's CGNAT
 *     would lock out everyone behind it for an hour.
 */

let clientCounter = 0;

/** A request that looks like it came from a distinct visitor. */
function requestFrom(
  ip: string,
  userAgent = 'Mozilla/5.0 (iPhone)'
): NextRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': ip, 'user-agent': userAgent }),
    ip,
  } as unknown as NextRequest;
}

function freshClient(): NextRequest {
  clientCounter += 1;
  return requestFrom(
    `203.0.113.${clientCounter % 250}`,
    `agent-${clientCounter}`
  );
}

describe('public booking abuse detector', () => {
  describe('ordinary booking traffic is not suspicious', () => {
    it('allows the handful of back-to-back requests one booking makes', () => {
      const visitor = freshClient();

      // csrf-token, then book — issued within milliseconds of each other, which
      // is exactly what the confirmation step does.
      expect(publicBookingAbuseDetector.detectSuspiciousActivity(visitor)).toBe(
        false
      );
      expect(publicBookingAbuseDetector.detectSuspiciousActivity(visitor)).toBe(
        false
      );
      expect(publicBookingAbuseDetector.detectSuspiciousActivity(visitor)).toBe(
        false
      );
    });

    it('allows a visitor who browses several dates before booking', () => {
      const visitor = freshClient();

      for (let i = 0; i < 25; i++) {
        const flagged =
          publicBookingAbuseDetector.detectSuspiciousActivity(visitor);
        // Named so a failure says which request tripped it.
        expect({ request: i + 1, flagged }).toEqual({
          request: i + 1,
          flagged: false,
        });
      }
    });

    it('accepts real client details', () => {
      const visitor = freshClient();

      const realPeople = [
        { firstName: 'Jo', lastName: 'Ng', email: 'jo.ng@gmail.com' },
        { firstName: 'Sarah', lastName: 'Testa', email: 'sarah1990@gmail.com' },
        { firstName: 'Li', lastName: 'Chen', email: 'li.chen@outlook.com' },
        {
          firstName: 'Temperance',
          lastName: "O'Brien",
          email: 'stempel@gmail.com',
        },
      ];

      for (const person of realPeople) {
        const who = `${person.firstName} ${person.lastName} <${person.email}>`;
        const flagged = publicBookingAbuseDetector.detectSuspiciousActivity(
          visitor,
          person
        );
        expect({ who, flagged }).toEqual({ who, flagged: false });
      }
    });
  });

  describe('genuine abuse is still caught', () => {
    it('flags a sustained flood from one client', () => {
      const attacker = freshClient();

      let flagged = false;
      for (let i = 0; i < 200; i++) {
        if (publicBookingAbuseDetector.detectSuspiciousActivity(attacker)) {
          flagged = true;
          break;
        }
      }

      expect(flagged).toBe(true);
    });

    it('flags a disposable mailbox', () => {
      expect(
        publicBookingAbuseDetector.detectSuspiciousActivity(freshClient(), {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'someone@mailinator.com',
        })
      ).toBe(true);
    });

    it('flags input that is not a name at all', () => {
      expect(
        publicBookingAbuseDetector.detectSuspiciousActivity(freshClient(), {
          firstName: '<script>alert(1)</script>',
          lastName: 'Lovelace',
          email: 'ada@gmail.com',
        })
      ).toBe(true);
    });

    it('flags an implausible number of services', () => {
      expect(
        publicBookingAbuseDetector.detectSuspiciousActivity(freshClient(), {
          services: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        })
      ).toBe(true);
    });
  });

  it('keeps clients independent of one another', () => {
    const noisy = freshClient();
    for (let i = 0; i < 200; i++) {
      publicBookingAbuseDetector.detectSuspiciousActivity(noisy);
    }

    // A different visitor must not inherit the first one's reputation.
    expect(
      publicBookingAbuseDetector.detectSuspiciousActivity(freshClient())
    ).toBe(false);
  });
});
