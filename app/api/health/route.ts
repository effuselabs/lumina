import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();

  try {
    // Basic health check response.
    //
    // `runtime` and `commit` are reported so that "which Node is this actually
    // running?" and "is this the code I just pushed?" are answerable from the
    // deployed URL, without digging through build logs. Railway exposes the
    // deployed commit as RAILWAY_GIT_COMMIT_SHA.
    const health = {
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

    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Database health check failed:', error);
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
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

      // Check if memory usage is too high (over 512MB heap)
      if (memoryUsageMB.heapUsed > 512) {
        health.checks.memory = 'warning';
        health.status = 'degraded';
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Memory health check failed:', error);
      health.checks.memory = 'unhealthy';
      health.status = 'degraded';
    }

    // Response time
    const responseTime = Date.now() - startTime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (health as any).responseTime = `${responseTime}ms`;

    // Determine HTTP status code
    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

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
