/**
 * @jest-environment node
 */
import { CredentialsSignin } from 'next-auth';

// jest.setup.ts stubs next-auth wholesale, and the real package is ESM that
// Jest does not transform. This test needs the real error class — only a
// genuine CredentialsSignin carries `code` through to the client — so it maps
// next-auth to the module next-auth itself re-exports it from.
jest.mock('next-auth', () => jest.requireActual('@auth/core/errors'));
import {
  type CredentialDeps,
  ServiceUnavailable,
  authorizeCredentials,
} from '@/lib/auth/authorize-credentials';

/**
 * A wrong password and a database outage are different failures, and the
 * sign-in form used to report both as "Invalid email or password": authorize
 * caught every error, returned null, and logged nothing. An owner locked out
 * by an outage would reset a password that was never wrong.
 */

const owner = {
  id: 'user-1',
  email: 'owner@example.test',
  name: 'Owner',
  password: 'hashed',
  role: 'OWNER',
  businesses: [{ businessId: 'biz-1', role: 'OWNER' }],
};

function deps(overrides: Partial<CredentialDeps> = {}): CredentialDeps {
  return {
    findUserByEmail: jest.fn().mockResolvedValue(owner),
    verifyPassword: jest.fn().mockResolvedValue(true),
    logError: jest.fn(),
    ...overrides,
  };
}

const valid = { email: owner.email, password: 'correct-horse' };

describe('authorizeCredentials', () => {
  it('returns the user, without the password, for correct credentials', async () => {
    await expect(authorizeCredentials(valid, deps())).resolves.toEqual({
      id: 'user-1',
      email: owner.email,
      name: 'Owner',
      role: 'OWNER',
      businessId: 'biz-1',
    });
  });

  it('returns null for a wrong password', async () => {
    const d = deps({ verifyPassword: jest.fn().mockResolvedValue(false) });
    await expect(authorizeCredentials(valid, d)).resolves.toBeNull();
    expect(d.logError).not.toHaveBeenCalled();
  });

  it('returns null for an unknown email', async () => {
    const d = deps({ findUserByEmail: jest.fn().mockResolvedValue(null) });
    await expect(authorizeCredentials(valid, d)).resolves.toBeNull();
  });

  it('returns null for malformed input, without touching the database', async () => {
    const d = deps();
    await expect(
      authorizeCredentials({ email: 'not-an-email', password: 'x' }, d)
    ).resolves.toBeNull();
    expect(d.findUserByEmail).not.toHaveBeenCalled();
  });

  it('reports a database failure as unavailable, not as bad credentials', async () => {
    const outage = new Error("Can't reach database server at localhost:5432");
    const d = deps({ findUserByEmail: jest.fn().mockRejectedValue(outage) });

    const attempt = authorizeCredentials(valid, d);

    await expect(attempt).rejects.toBeInstanceOf(ServiceUnavailable);
    await expect(attempt).rejects.toBeInstanceOf(CredentialsSignin);
    await expect(attempt).rejects.toMatchObject({
      code: 'service_unavailable',
    });
    // The cause is recorded where someone can find it.
    expect(d.logError).toHaveBeenCalledWith(
      expect.stringContaining('sign-in'),
      outage
    );
  });

  it('never puts the underlying error in the code, which reaches the URL', async () => {
    const d = deps({
      findUserByEmail: jest
        .fn()
        .mockRejectedValue(
          new Error('password authentication failed for user "lumina"')
        ),
    });
    await expect(authorizeCredentials(valid, d)).rejects.toMatchObject({
      code: 'service_unavailable',
    });
  });
});
