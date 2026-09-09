import {
  OPEN_SIGNUP_ENV_VAR,
  decideSignup,
  isOpenSignupEnabled,
} from '@/lib/auth/signup-policy';

describe('signup policy', () => {
  describe('decideSignup', () => {
    it('closes registration by default once an account exists', () => {
      expect(
        decideSignup({ openSignupEnabled: false, existingUserCount: 1 })
      ).toEqual({ allowed: false, reason: 'closed' });
    });

    it('allows the first account on a fresh install', () => {
      // A self-hoster who has just run the migrations has nobody to invite
      // them. Refusing here leaves the installation permanently unusable.
      expect(
        decideSignup({ openSignupEnabled: false, existingUserCount: 0 })
      ).toEqual({ allowed: true, reason: 'bootstrap' });
    });

    it('stops bootstrapping as soon as one account exists', () => {
      const first = decideSignup({
        openSignupEnabled: false,
        existingUserCount: 0,
      });
      const second = decideSignup({
        openSignupEnabled: false,
        existingUserCount: 1,
      });

      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(false);
    });

    it('allows registration when the operator opens it', () => {
      expect(
        decideSignup({ openSignupEnabled: true, existingUserCount: 50 })
      ).toEqual({ allowed: true, reason: 'open' });
    });
  });

  describe('isOpenSignupEnabled', () => {
    it('opens registration only for the exact string "true"', () => {
      expect(isOpenSignupEnabled({ [OPEN_SIGNUP_ENV_VAR]: 'true' })).toBe(true);
    });

    it.each(['false', 'TRUE', 'True', '1', 'yes', 'on', '', ' true '])(
      'leaves registration closed for %p',
      value => {
        // The failure mode of guessing wrong is an open door, so anything
        // that is not exactly 'true' must be read as closed — including
        // casing variants and values that look affirmative.
        expect(isOpenSignupEnabled({ [OPEN_SIGNUP_ENV_VAR]: value })).toBe(
          false
        );
      }
    );

    it('leaves registration closed when the variable is absent', () => {
      expect(isOpenSignupEnabled({})).toBe(false);
    });
  });
});
