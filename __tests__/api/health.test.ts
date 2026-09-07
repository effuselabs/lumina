import { GET, HEAD } from '@/app/api/health/route';

// Mock Prisma
const mockPrisma = {
  $queryRaw: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful database connection by default
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  });

  describe('GET /api/health', () => {
    it('returns healthy status when database is connected', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.database).toBe('healthy');
      expect(data.checks.memory).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBe('test');
    });

    it('returns degraded status when database is disconnected', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200); // Still returns 200 for degraded
      expect(data.status).toBe('degraded');
      expect(data.checks.database).toBe('unhealthy');
    });

    it('includes response time in the response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.responseTime).toBeDefined();
      expect(data.responseTime).toMatch(/\d+ms/);
    });

    it('returns proper cache headers', async () => {
      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });

  describe('HEAD /api/health', () => {
    it('returns 200 when database is healthy', async () => {
      const response = await HEAD();

      expect(response.status).toBe(200);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT 1')])
      );
    });

    it('returns 503 when database is unhealthy', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const response = await HEAD();

      expect(response.status).toBe(503);
    });

    it('returns no body for HEAD requests', async () => {
      const response = await HEAD();
      const text = await response.text();

      expect(text).toBe('');
    });
  });
});
