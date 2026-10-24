import { auth } from '@/auth';
import { PLATFORM_ADMIN_ROLE } from '@/lib/auth/platform-admin-role';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export type PlatformAdminAccess =
  { ok: true; userId: string } | { ok: false; response: NextResponse };

/**
 * The guard for application-wide API routes. Like `authorizeBusinessAccess`,
 * it returns a result that must be narrowed before use:
 *
 * ```ts
 * const access = await authorizePlatformAdmin();
 * if (!access.ok) return access.response;
 * ```
 *
 * The role is read from the database rather than the session token, so
 * revoking it takes effect on the next request, not at the next sign-in.
 */
export async function authorizePlatformAdmin(): Promise<PlatformAdminAccess> {
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== PLATFORM_ADMIN_ROLE) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Platform administrators only' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: session.user.id };
}
