// Mock for @/lib/utils to fix Jest path alias issues
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock other utility functions as needed
export const mockUtilFunction = jest.fn();
