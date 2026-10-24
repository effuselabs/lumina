import type { UserRole } from '@prisma/client';

/**
 * The role that marks a platform administrator (#72): someone who runs a
 * whole deployment — one salon or many — rather than working in one salon.
 * It is not a salon role, and it grants no access to any salon's data; it
 * opens only the endpoints that report on the system itself
 * (`authorizePlatformAdmin`).
 *
 * It is granted from the command line (`npm run admin:grant`), never through
 * the application: nothing in Lumina verifies an email address, so an
 * allow-list of addresses would make admin whoever registered a listed one
 * first. Registration always creates an OWNER (`app/api/auth/register`).
 *
 * Its own module so the command-line script can share it without importing
 * NextAuth.
 */
export const PLATFORM_ADMIN_ROLE = 'SUPER_ADMIN' satisfies UserRole;
