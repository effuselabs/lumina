import { CredentialsSignin } from 'next-auth';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Sign-in could not be checked: the database, or something else the check
 * depends on, failed. Distinct from wrong credentials so the form can say so.
 *
 * `code` reaches the client — Auth.js puts it in the redirect URL and in
 * `signIn()`'s result — so it names the category, never the underlying error.
 */
export class ServiceUnavailable extends CredentialsSignin {
  override code = 'service_unavailable';
}

interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  role: string;
  businesses: ReadonlyArray<{ businessId: string }>;
}

export interface CredentialDeps {
  findUserByEmail: (email: string) => Promise<StoredUser | null>;
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;
  logError: (message: string, error: unknown) => void;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  businessId: string | undefined;
}

/**
 * The Credentials provider's `authorize`, without the NextAuth wiring.
 *
 * Returns null only for what the visitor got wrong — malformed input, an
 * unknown email, a wrong password. Anything else is an outage, and used to be
 * returned as null too: a stopped database produced "Invalid email or
 * password", and the catch block that should have logged it was empty.
 */
export async function authorizeCredentials(
  credentials: unknown,
  deps: CredentialDeps
): Promise<AuthorizedUser | null> {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  try {
    const user = await deps.findUserByEmail(email);
    if (!user || !user.password) return null;

    const isPasswordValid = await deps.verifyPassword(password, user.password);
    if (!isPasswordValid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businesses[0]?.businessId,
    };
  } catch (error) {
    deps.logError('Credentials sign-in could not be checked', error);
    throw new ServiceUnavailable();
  }
}
