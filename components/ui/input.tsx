import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const inputVariants = cva(
  [
    'flex w-full rounded-md border transition-all duration-200',
    'text-sm font-normal',
    'placeholder:text-neutral-500 dark:placeholder:text-neutral-400',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    // High contrast mode support
    'contrast-more:border-2',
    // Reduced motion support
    'motion-reduce:transition-none',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white dark:bg-neutral-900',
          'text-neutral-900 dark:text-neutral-100',
          'border-neutral-300 dark:border-neutral-700',
          'hover:border-neutral-400 dark:hover:border-neutral-600',
          'focus-visible:border-lumina-gold focus-visible:ring-lumina-gold',
          'disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
          'file:text-neutral-900 dark:file:text-neutral-100',
        ],
        error: [
          'bg-white dark:bg-neutral-900',
          'text-neutral-900 dark:text-neutral-100',
          'border-red-500 dark:border-red-400',
          'hover:border-red-600 dark:hover:border-red-300',
          'focus-visible:border-red-500 focus-visible:ring-red-500 dark:focus-visible:border-red-400 dark:focus-visible:ring-red-400',
          'disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
          'file:text-neutral-900 dark:file:text-neutral-100',
        ],
        success: [
          'bg-white dark:bg-neutral-900',
          'text-neutral-900 dark:text-neutral-100',
          'border-green-500 dark:border-green-400',
          'hover:border-green-600 dark:hover:border-green-300',
          'focus-visible:border-green-500 focus-visible:ring-green-500 dark:focus-visible:border-green-400 dark:focus-visible:ring-green-400',
          'disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
          'file:text-neutral-900 dark:file:text-neutral-100',
        ],
      },
      size: {
        sm: 'h-8 px-2.5 py-1.5 text-xs',
        default: 'h-10 px-3 py-2 text-sm',
        lg: 'h-12 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
  VariantProps<typeof inputVariants> {
  error?: boolean;
  success?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    variant,
    size,
    error,
    success,
    disabled,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    // Determine variant based on state
    const computedVariant = error ? 'error' : success ? 'success' : variant;

    // Generate accessible label if needed
    const accessibleLabel = ariaLabel || props.placeholder;

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant: computedVariant, size, className }))}
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={accessibleLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || error}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
