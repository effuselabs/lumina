import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toBeDisabled(): R;
      toHaveLength: {
        greaterThan(expected: number): R;
      } & ((expected: number) => R);
      toHaveNoViolations(): R;
      toBeOneOf(expected: any[]): R;
    }
  }
}

export {};
