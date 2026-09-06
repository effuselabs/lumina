import {
  REQUIRED_IN_PRODUCTION,
  findMissingConfiguration,
} from '@/lib/health/required-configuration';

/**
 * Staging was promoted "healthy" while missing NEXTAUTH_SECRET and
 * NEXTAUTH_URL: the database was reachable, so the health check passed and
 * Railway routed to a release nobody could sign in to or book on.
 *
 * These tests pin the gate that now prevents that.
 */

function envWithAllSet(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    REQUIRED_IN_PRODUCTION.map(name => [name, `value-for-${name}`])
  ) as NodeJS.ProcessEnv;
}

describe('required production configuration', () => {
  it('reports nothing missing when every variable is set', () => {
    expect(findMissingConfiguration(envWithAllSet())).toEqual([]);
  });

  it.each(REQUIRED_IN_PRODUCTION)('detects a missing %s', name => {
    const env = envWithAllSet();
    delete env[name];

    expect(findMissingConfiguration(env)).toEqual([name]);
  });

  it('treats an empty string as missing', () => {
    const env = { ...envWithAllSet(), NEXTAUTH_SECRET: '' };

    expect(findMissingConfiguration(env)).toContain('NEXTAUTH_SECRET');
  });

  it('treats whitespace as missing', () => {
    // A secret of spaces would otherwise pass the gate and fail at the first
    // booking, which is the exact failure this check exists to stop.
    const env = { ...envWithAllSet(), NEXTAUTH_SECRET: '   ' };

    expect(findMissingConfiguration(env)).toContain('NEXTAUTH_SECRET');
  });

  it('reports every missing variable, not just the first', () => {
    const env = envWithAllSet();
    delete env.NEXTAUTH_SECRET;
    delete env.NEXTAUTH_URL;

    expect(findMissingConfiguration(env).sort()).toEqual([
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
    ]);
  });

  it('returns names, never values, because the health response is public', () => {
    const env = { ...envWithAllSet(), NEXTAUTH_SECRET: '' };

    const missing = findMissingConfiguration(env);

    expect(missing).toEqual(['NEXTAUTH_SECRET']);
    expect(JSON.stringify(missing)).not.toContain('value-for-');
  });

  it('covers the variables whose absence broke staging', () => {
    // Regression guard: if someone trims this list, the deploy that caused
    // this whole investigation would pass the gate again.
    expect(REQUIRED_IN_PRODUCTION).toEqual(
      expect.arrayContaining(['NEXTAUTH_SECRET', 'NEXTAUTH_URL'])
    );
  });
});
