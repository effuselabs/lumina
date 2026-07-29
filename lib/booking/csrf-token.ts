/**
 * Client-side helper for the public booking CSRF token.
 *
 * `POST /api/public/booking/[businessId]/book` uses the double-submit cookie
 * pattern: the request must carry the same token in the `x-csrf-token` header
 * and the `csrf-token` cookie. The cookie is scoped to `/api/public/booking`,
 * so the booking page cannot read it back out of `document.cookie` — the token
 * has to come from the issuing response's `X-CSRF-Token` header.
 */

const CSRF_HEADER = 'x-csrf-token';

export class CSRFTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSRFTokenError';
  }
}

/**
 * Fetch a fresh CSRF token, which also sets the matching cookie on this
 * browser. Call it immediately before the booking POST rather than caching it:
 * tokens expire after an hour, and a client can sit on the confirmation step
 * for a long time.
 */
export async function fetchPublicBookingCSRFToken(
  businessId: string
): Promise<string> {
  const response = await fetch(`/api/public/booking/${businessId}/csrf-token`, {
    method: 'GET',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new CSRFTokenError(
      `Could not obtain a booking security token (HTTP ${response.status})`
    );
  }

  const token = response.headers.get('X-CSRF-Token');

  if (!token) {
    throw new CSRFTokenError(
      'Booking security token missing from the server response'
    );
  }

  return token;
}

/**
 * Header pair to merge into the booking request.
 */
export function csrfHeader(token: string): Record<string, string> {
  return { [CSRF_HEADER]: token };
}
