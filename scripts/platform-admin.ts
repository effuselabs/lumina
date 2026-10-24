/**
 * Grant, revoke or list platform administrators (#72).
 *
 * A platform administrator runs a whole deployment, one salon or many. The
 * role opens only the endpoints that report on the system itself (system
 * alerts, the email queue's health); it gives no access to a salon's data.
 *
 * It is granted here, by whoever can run commands against the database,
 * because nothing in the application can be trusted to: email addresses are
 * never verified, so whoever registered an address first would own it.
 *
 * Usage (the account must already exist; sign up first):
 *   npm run admin:grant -- you@example.com
 *   npm run admin:revoke -- you@example.com
 *   npm run admin:list
 *
 * Against a deployed database, run it where the app runs (on Railway,
 * `railway ssh` into the service), or with that database's DATABASE_URL set.
 */

import { PrismaClient } from '@prisma/client';
import { PLATFORM_ADMIN_ROLE } from '../lib/auth/platform-admin-role';

type Db = Pick<PrismaClient, 'user' | 'businessUser'>;

async function findUser(db: Db, email: string) {
  const users = await db.user.findMany({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { id: true, email: true, role: true },
  });
  if (users.length === 0) {
    throw new Error(`No account for ${email}. Sign up first, then grant.`);
  }
  if (users.length > 1) {
    throw new Error(
      `${users.length} accounts match ${email} ignoring case: ${users
        .map(user => user.email)
        .join(', ')}. Give the exact address.`
    );
  }
  return users[0];
}

export async function grantPlatformAdmin(db: Db, email: string) {
  const user = await findUser(db, email);
  if (user.role === PLATFORM_ADMIN_ROLE) {
    return `${user.email} is already a platform administrator.`;
  }
  await db.user.update({
    where: { id: user.id },
    data: { role: PLATFORM_ADMIN_ROLE },
  });
  return `${user.email} is now a platform administrator.`;
}

/** Back to the role registration or an invitation would have given them. */
export async function revokePlatformAdmin(db: Db, email: string) {
  const user = await findUser(db, email);
  if (user.role !== PLATFORM_ADMIN_ROLE) {
    return `${user.email} is not a platform administrator.`;
  }
  const owns = await db.businessUser.count({
    where: { userId: user.id, role: 'OWNER' },
  });
  await db.user.update({
    where: { id: user.id },
    data: { role: owns > 0 ? 'OWNER' : 'STAFF' },
  });
  return `${user.email} is no longer a platform administrator.`;
}

export async function listPlatformAdmins(db: Db) {
  const admins = await db.user.findMany({
    where: { role: PLATFORM_ADMIN_ROLE },
    select: { email: true },
    orderBy: { email: 'asc' },
  });
  return admins.length === 0
    ? 'There are no platform administrators.'
    : admins.map(admin => admin.email).join('\n');
}

async function main() {
  const [command, email] = process.argv.slice(2);
  const prisma = new PrismaClient();
  try {
    if (command === 'list') {
      console.log(await listPlatformAdmins(prisma));
    } else if ((command === 'grant' || command === 'revoke') && email) {
      const run =
        command === 'grant' ? grantPlatformAdmin : revokePlatformAdmin;
      console.log(await run(prisma, email));
    } else {
      console.error(
        'Usage: platform-admin.ts grant <email> | revoke <email> | list'
      );
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
