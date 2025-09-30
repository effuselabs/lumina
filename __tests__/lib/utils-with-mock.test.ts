// Test to verify mock system is working for path aliases
import { cn } from '@/lib/utils';

// Mock the module
jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('Utils with Mock', () => {
  it('should use mocked cn function', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
    expect(cn).toHaveBeenCalledWith('class1', 'class2');
  });
});
