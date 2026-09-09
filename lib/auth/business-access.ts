import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { BusinessRole } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * The membership check for API routes.
 *
 * `requireBusinessAccess` in `lib/auth.ts` cannot be used here: it calls
 * `redirect()`, which is a page-navigation helper. In a route handler that
 * becomes a 307 to an HTML sign-in page, so a `fetch` caller expecting JSON
 * gets a redirect instead of a 403. That mismatch is why no route ever used
 * it, and why the check ended up hand-rolled four different ways instead —
 * inline `businessUser.findFirst`, a local `verifyBusinessAccess`,
 * `businessContextSecurity.validateBusinessContext`, and in a number of routes
 * not at all.
 *
 * This returns a result rather than throwing, and the result must be narrowed
 * before the caller can reach the business id — so forgetting to handle the
 * failure is a type error rather than a data leak:
 *
 * ```ts
 * const access = await authorizeBusinessAccess(businessId);
 * if (!access.ok) return access.response;
 * // access.businessId is now a business this user belongs to
 * ```
 */
export type BusinessAccess =
  | {
      ok: true;
      userId: string;
      /** Verified: the session user is a member of this business. */
      businessId: string;
      role: BusinessRole;
    }
  | { ok: false; response: NextResponse };

export async function authorizeBusinessAccess(
  businessId: string | null | undefined,
  options: { allowedRoles?: BusinessRole[] } = {}
): Promise<BusinessAccess> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (!businessId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'A businessId is required' },
        { status: 400 }
      ),
    };
  }

  const membership = await prisma.businessUser.findUnique({
    where: { businessId_userId: { businessId, userId: session.user.id } },
    select: { role: true },
  });

  /*
   * The same 403 whether the business does not exist or the caller simply is
   * not in it. Distinguishing them turns this endpoint into an oracle for
   * which business ids are real.
   */
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      ),
    };
  }

  if (options.allowedRoles && !options.allowedRoles.includes(membership.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Insufficient permissions for this business' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    businessId,
    role: membership.role,
  };
}
