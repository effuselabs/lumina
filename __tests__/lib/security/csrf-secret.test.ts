/**
 * @jest-environment node
 */
import { createHmac } from 'crypto';

/**
 * CSRFProtection signed its tokens with `process.env.CSRF_SECRET ||
 * 'default-csrf-secret'`, read once when the module loaded. CSRF_SECRET is set
 * nowhere, so every token was signed with a constant published in this
 * repository: anyone could mint one. It now resolves its secret on first use,
 * falls back to NEXTAUTH_SECRET as the public booking CSRF does, and refuses
 * to run in production with neither.
 */

const ENV = { ...process.env };

// The module starts cleanup intervals when it loads; fake timers keep them
// from holding the test process open.
jest.useFakeTimers();

async function load() {
  jest.resetModules();
  return (await import('@/lib/security/rate-limiter')).CSRFProtection;
}

const forge = (secret: string, sessionId: string) => {
  const timestamp = Date.now().toString();
  const hash = createHmac('sha256', secret)
    .update(`${sessionId}:${timestamp}`)
    .digest('hex');
  return `${timestamp}.${hash}`;
};

describe('CSRFProtection secret', () => {
  afterEach(() => {
    process.env = { ...ENV };
  });

  it('rejects a token signed with the old built-in default', async () => {
    delete process.env.CSRF_SECRET;
    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    const CSRFProtection = await load();

    expect(
      CSRFProtection.validateToken(
        forge('default-csrf-secret', 'session-1'),
        'session-1'
      )
    ).toBe(false);
  });

  it('falls back to NEXTAUTH_SECRET', async () => {
    delete process.env.CSRF_SECRET;
    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    const CSRFProtection = await load();

    const token = CSRFProtection.generateToken('session-1');

    expect(CSRFProtection.validateToken(token, 'session-1')).toBe(true);
    expect(
      CSRFProtection.validateToken(
        forge('a-real-secret', 'session-1'),
        'session-1'
      )
    ).toBe(true);
  });

  it('prefers CSRF_SECRET when it is set', async () => {
    process.env.CSRF_SECRET = 'csrf-only';
    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    const CSRFProtection = await load();

    expect(
      CSRFProtection.validateToken(forge('csrf-only', 'session-1'), 'session-1')
    ).toBe(true);
  });

  it('refuses to sign in production with no secret configured', async () => {
    delete process.env.CSRF_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const CSRFProtection = await load();

    expect(() => CSRFProtection.generateToken('session-1')).toThrow(
      /CSRF_SECRET/
    );
  });

  it('reads no secret when the module is imported', async () => {
    delete process.env.CSRF_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    (process.env as Record<string, string>).NODE_ENV = 'production';

    await expect(load()).resolves.toBeDefined();
  });
});
