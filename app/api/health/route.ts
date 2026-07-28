import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * The host:port DATABASE_URL points at, with credentials stripped.
 *
 * Enough to tell a Railway-internal host (`postgres.railway.internal`) from a
 * public proxy host (`*.proxy.rlwy.net`) or a stale localhost, which is the
 * usual cause of a database that is reachable at deploy time but not at
 * runtime. Never returns the password.
 */
function describeDatabaseHost(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return 'DATABASE_URL is not set';

  try {
    const url = new URL(raw);
    return `${url.hostname}:${url.port || '5432'}${url.pathname}`;
  } catch {
    return 'DATABASE_URL is set but is not a valid URL';
  }
}

/**
 * Prisma's error code, if one is available.
 *
 * Prisma exposes this inconsistently: PrismaClientKnownRequestError carries
 * `.code`, PrismaClientInitializationError declares `.errorCode` but leaves it
 * undefined for runtime connection failures, and the P-code sometimes appears
 * only in the message text. This checks all three and falls back to the error
 * class name, which is itself informative.
 */
function describePrismaErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown';

  const e = error as { code?: unknown; errorCode?: unknown; message?: unknown };

  if (typeof e.code === 'string' && e.code) return e.code;
  if (typeof e.errorCode === 'string' && e.errorCode) return e.errorCode;

  const fromMessage = String(e.message ?? '').match(/\bP\d{4}\b/);
  if (fromMessage) return fromMessage[0];

  return error.constructor?.name ?? 'unknown';
}

/**
 * A single readable line explaining the failure.
 *
 * Prisma prefixes messages with an "Invalid `prisma.x()` invocation" preamble
 * and blank lines; the useful sentence is further down. Credentials are
 * stripped defensively — Prisma does not normally include them, but this
 * response is publicly reachable.
 */
function describePrismaReason(error: unknown): string {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const line = raw
    .split('\n')
    .map(l => l.trim())
    .find(l => l && !l.startsWith('Invalid `prisma.'));

  return (line ?? 'Unknown database error')
    .replace(/\/\/[^@\s]*@/g, '//***@')
    .slice(0, 200);
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Basic health check response.
    //
    // `runtime` and `commit` are reported so that "which Node is this actually
    // running?" and "is this the code I just pushed?" are answerable from the
    // deployed URL, without digging through build logs. Railway exposes the
    // deployed commit as RAILWAY_GIT_COMMIT_SHA.
    const health: {
      status: string;
      timestamp: string;
      environment: string;
      version: string;
      runtime: string;
      commit: string;
      uptime: number;
      checks: { database: string; memory: string };
      databaseError?: { code: string; reason: string; host: string };
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      runtime: process.version,
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown').slice(0, 7),
      uptime: process.uptime(),
      checks: {
        database: 'unknown',
        memory: 'unknown',
      },
    };

    // Database connectivity check.
    //
    // On failure this reports Prisma's error code and the host it tried to
    // reach, because "unhealthy" alone sends you digging through deploy logs.
    // The codes point in materially different directions:
    //   P1001 - cannot reach the server (wrong host/port, or not running)
    //   P1000 - authentication failed (wrong credentials)
    //   P1003 - the named database does not exist
    // Only the host is exposed, never the full DATABASE_URL, which carries
    // credentials.
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Database health check failed:', error);
      health.checks.database = 'unhealthy';

      // Not "degraded" — without a database this instance cannot serve a
      // booking page, authenticate anyone, or read a calendar. It is
      // unhealthy, and the status code below reflects that so the platform
      // refuses to route to it.
      health.status = 'unhealthy';

      health.databaseError = {
        code: describePrismaErrorCode(error),
        reason: describePrismaReason(error),
        host: describeDatabaseHost(),
      };
    }

    // Memory usage check
    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };

      health.checks.memory = 'healthy';

      // Add memory info in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (health as any).memory = memoryUsageMB;
      }

      // Check if memory usage is too high (over 512MB heap).
      // Only ever downgrade from 'healthy': memory pressure must not mask an
      // already-failed database, which is the more serious condition.
      if (memoryUsageMB.heapUsed > 512) {
        health.checks.memory = 'warning';
        if (health.status === 'healthy') health.status = 'degraded';
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Memory health check failed:', error);
      health.checks.memory = 'unhealthy';
      if (health.status === 'healthy') health.status = 'degraded';
    }

    // Response time
    const responseTime = Date.now() - startTime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (health as any).responseTime = `${responseTime}ms`;

    // Determine HTTP status code.
    //
    // 'unhealthy' (currently: the database is unreachable) returns 503 so that
    // Railway's healthcheck REFUSES TO PROMOTE the release and staging stays on
    // the last good one. This previously returned 200 for both 'healthy' and
    // 'degraded', which is how a deploy that could not reach its database was
    // promoted anyway — the gate existed but could never fire.
    //
    // 'degraded' (memory pressure) stays 200 on purpose: the app still serves
    // requests correctly, so taking it out of rotation would cause an outage
    // rather than prevent one.
    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: `${Date.now() - startTime}ms`,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}

// Support HEAD requests for simple health checks
export async function HEAD() {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
