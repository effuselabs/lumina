/**
 * Prisma's generated method types are not assignable to `jest.Mock`, so
 * `mockPrisma.service.findUnique.mockResolvedValue(...)` fails to type-check
 * even though it works at runtime. This is the cast that fixes it.
 *
 * ```ts
 * asMock(mockPrisma.service.findUnique).mockResolvedValue({ id: 's1' });
 * ```
 *
 * This file previously exported twenty-five more helpers — `mockFindMany`,
 * `mockCreateOnce`, `mockServiceMethodOnce` and so on — each a one-line
 * wrapper around this same cast, and every one of them unused. They are gone.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asMock<T = any>(method: unknown): jest.Mock<T> {
  return method as jest.Mock<T>;
}
