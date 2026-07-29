import { publicBookingSanitizer } from '@/lib/security/public-booking-sanitizer';

/**
 * The "suspicious email" check runs on the final step of the public booking
 * flow. A false positive there is not a minor annoyance — the client has picked
 * a service, picked a slot, filled in the form, pressed Confirm, and is told
 * "Please check your input and try again" about an address that is perfectly
 * valid. They have no way to act on that, so they leave.
 *
 * The original rules matched `test|spam|fake|temp|throwaway` anywhere in the
 * string and rejected any local part of letters-then-digits, which between them
 * reject a large share of ordinary personal addresses. These cases pin the
 * behaviour so that class of rule cannot come back.
 */

function violationsFor(email: string): string[] {
  const { violations } = publicBookingSanitizer.sanitizeClientData({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email,
    phone: '5551234567',
  });
  return violations;
}

function isRejected(email: string): boolean {
  return violationsFor(email).some(v => v.includes('suspicious or temporary'));
}

describe('public booking email sanitizer', () => {
  describe('accepts ordinary client addresses', () => {
    const legitimate = [
      // Letters followed by digits — birth years, house numbers, disambiguators.
      'sarah1990@gmail.com',
      'john2@outlook.com',
      'mary85@yahoo.com',
      // Substrings that happen to contain a blocked word.
      'stempel@gmail.com', // "temp"
      'contested@gmail.com', // "test"
      'protest@hotmail.com',
      'tempest.williams@gmail.com',
      'testa.maria@libero.it', // Testa is a common Italian surname
      // Short local parts are legal and real.
      'jo@example.org',
      'al@example.org',
      // Plus addressing is legal and widely used.
      'ada+salon@gmail.com',
      // Plain, boring addresses.
      'ada.lovelace@gmail.com',
      'a.lovelace@some-salon-client.co.uk',
    ];

    it.each(legitimate)('accepts %s', email => {
      expect(isRejected(email)).toBe(false);
    });
  });

  describe('still rejects disposable mailbox providers', () => {
    const disposable = [
      'someone@mailinator.com',
      'someone@10minutemail.com',
      'someone@guerrillamail.com',
      'someone@tempmail.com',
      'someone@throwawaymail.com',
      'someone@yopmail.com',
      // Subdomains of a blocked provider.
      'someone@mail.mailinator.com',
    ];

    it.each(disposable)('rejects %s', email => {
      expect(isRejected(email)).toBe(true);
    });
  });

  it('does not reject a legitimate domain that merely contains a blocked provider name', () => {
    // The check must match the domain, not any substring of it.
    expect(isRejected('owner@mailinator-reviews.example.com')).toBe(false);
  });

  it('rejects structurally invalid addresses', () => {
    expect(violationsFor('not-an-email').join(' ')).toContain(
      'Invalid email format'
    );
  });
});
