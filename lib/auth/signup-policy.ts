/**
 * Who is allowed to create an account.
 *
 * Registration used to be open to anyone who could reach the sign-up page, and
 * the caller could name their own role — so a stranger could mint themselves an
 * OWNER account on a public deployment. That is the wrong default for a
 * multi-tenant product: every account is a foothold inside the application,
 * and staff already arrive by invitation.
 *
 * It is also the wrong default for people self-hosting Lumina, which is why
 * this is not simply "off". A fresh install has no users and no way to invite
 * one, so the first account must always be creatable. After that, registration
 * is closed unless the operator opens it deliberately.
 */

/** Set to `'true'` to let anyone register. Anything else means closed. */
export const OPEN_SIGNUP_ENV_VAR = 'ALLOW_PUBLIC_SIGNUP';

export type SignupDecision =
  /** A fresh install creating its first account. */
  | { allowed: true; reason: 'bootstrap' }
  /** The operator has opened registration. */
  | { allowed: true; reason: 'open' }
  /** Registration is closed; the caller needs an invitation. */
  | { allowed: false; reason: 'closed' };

export function decideSignup(input: {
  openSignupEnabled: boolean;
  existingUserCount: number;
}): SignupDecision {
  // Bootstrap wins over the flag. A self-hoster who has just run the
  // migrations has no account to sign in with and nobody to invite them, so
  // refusing here would leave the installation unusable.
  if (input.existingUserCount === 0) {
    return { allowed: true, reason: 'bootstrap' };
  }

  if (input.openSignupEnabled) {
    return { allowed: true, reason: 'open' };
  }

  return { allowed: false, reason: 'closed' };
}

/**
 * Read the flag from the environment.
 *
 * Deliberately strict: only the exact string `'true'` opens registration. A
 * typo, an empty string, or a value like `'false'`, `'0'` or `'no'` all leave
 * it closed, because the failure mode of guessing wrong here is an open door.
 */
export function isOpenSignupEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env[OPEN_SIGNUP_ENV_VAR] === 'true';
}
