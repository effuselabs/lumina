import { PublicBookingAuditEvent } from '@/lib/security/public-booking-audit';
import {
  createSecurePublicBookingResponse,
  securePublicBookingGET,
} from '@/lib/security/public-booking-security-middleware';
import { NextRequest } from 'next/server';

/**
 * GET /api/public/booking/[businessId]/csrf-token
 *
 * Issues the CSRF token the booking POST requires.
 *
 * `POST .../book` runs behind double-submit CSRF protection, but the token was
 * only ever minted on that route's own 201 response — so obtaining a token
 * required a successful booking, and a successful booking required a token.
 * Every booking from the UI failed with 403 CSRF_TOKEN_INVALID. This endpoint
 * breaks the cycle.
 *
 * The response sets the `csrf-token` cookie and echoes the same value in the
 * `X-CSRF-Token` header. The cookie is scoped to `/api/public/booking`, so a
 * page at `/book/[businessId]` cannot read it from `document.cookie`; callers
 * take the value from the header and send it back as `x-csrf-token`.
 *
 * Read-only and unauthenticated by design — this route serves the public
 * booking page, which is listed under `PUBLIC_ROUTE_PREFIXES` in
 * `middleware.ts`. It exposes no business data: the token is an opaque signed
 * value, and the request is still rate-limited and business-validated.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const securityResult = await securePublicBookingGET(
    request,
    params.businessId,
    PublicBookingAuditEvent.BUSINESS_INFO_ACCESSED
  );

  if (!securityResult.success) {
    return securityResult.response;
  }

  return createSecurePublicBookingResponse({ issued: true }, request, {
    addCSRFToken: true,
  });
}
