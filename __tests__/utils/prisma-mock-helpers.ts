/**
 * Prisma Mock Helpers
 * 
 * Provides properly typed mock utilities for Prisma client methods in tests.
 * Resolves TypeScript errors with mockResolvedValue/mockRejectedValue on Prisma methods.
 * 
 * Usage:
 * ```typescript
 * import { asMock, mockFindMany } from '@/__tests__/utils/prisma-mock-helpers';
 * 
 * // Option 1: Use helper functions
 * mockFindMany(mockPrisma.user.findMany, [{ id: '1', name: 'Test' }]);
 * 
 * // Option 2: Cast to jest.Mock
 * asMock(mockPrisma.user.findMany).mockResolvedValue([{ id: '1', name: 'Test' }]);
 * ```
 */

import { PrismaClient } from '@prisma/client';

// Type for mocked Prisma client
export type MockPrismaClient = {
  [K in keyof PrismaClient]: PrismaClient[K] extends object
    ? MockPrismaModel<PrismaClient[K]>
    : jest.Mocked<PrismaClient[K]>;
};

// Type for mocked Prisma model
export type MockPrismaModel<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K];
};

/**
 * Type-safe mock for Prisma findMany operations
 */
export function mockFindMany<T>(
  method: any,
  data: T[]
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma findUnique operations
 */
export function mockFindUnique<T>(
  method: any,
  data: T | null
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma findFirst operations
 */
export function mockFindFirst<T>(
  method: any,
  data: T | null
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma create operations
 */
export function mockCreate<T>(
  method: any,
  data: T
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma update operations
 */
export function mockUpdate<T>(
  method: any,
  data: T
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma delete operations
 */
export function mockDelete<T>(
  method: any,
  data: T
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma upsert operations
 */
export function mockUpsert<T>(
  method: any,
  data: T
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma count operations
 */
export function mockCount(
  method: any,
  count: number
): void {
  (method as jest.Mock).mockResolvedValue(count);
}

/**
 * Type-safe mock for rejected promises
 */
export function mockRejected(
  method: any,
  error: Error
): void {
  (method as jest.Mock).mockRejectedValue(error);
}

/**
 * Type-safe mock for Prisma aggregate operations
 */
export function mockAggregate<T>(
  method: any,
  data: T
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Type-safe mock for Prisma groupBy operations
 */
export function mockGroupBy<T>(
  method: any,
  data: T[]
): void {
  (method as jest.Mock).mockResolvedValue(data);
}

/**
 * Helper to create a mock implementation that can be chained
 */
export function mockChainable<T>(
  method: any,
  data: T
): any {
  const mock = jest.fn().mockReturnValue({
    ...data,
    then: (resolve: (value: T) => void) => {
      resolve(data);
      return Promise.resolve(data);
    },
  });
  (method as jest.Mock).mockImplementation(mock);
  return mock;
}

/**
 * Utility to cast Prisma method to jest.Mock for direct mocking
 * Use this when you need full control over the mock
 */
export function asMock<T = any>(method: any): jest.Mock<T> {
  return method as jest.Mock<T>;
}

/**
 * Create a mock Prisma transaction
 */
export function mockTransaction<T>(
  prisma: MockPrismaClient,
  callback: (tx: MockPrismaClient) => Promise<T>
): void {
  (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
    return await fn(prisma);
  });
}

// Export common types for convenience
export type { DeepMockProxy } from 'jest-mock-extended';
