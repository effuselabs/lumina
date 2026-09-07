'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const formFieldVariants = cva('space-y-2', {
  variants: {
    size: {
      sm: 'space-y-1.5',
      default: 'space-y-2',
      lg: 'space-y-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface FormFieldProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldVariants> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  'aria-describedby'?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      size,
      label,
      error,
      hint,
      required,
      children,
      htmlFor,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const fieldId = React.useId();
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;

    // Combine all describedby IDs
    const describedBy =
      [ariaDescribedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div
        ref={ref}
        className={cn(formFieldVariants({ size, className }))}
        {...props}
      >
        {label && (
          <Label
            htmlFor={htmlFor || fieldId}
            className={cn(
              'text-sm font-medium leading-none',
              'text-neutral-900 dark:text-neutral-100',
              error && 'text-error-accessible',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              required && 'required'
            )}
          >
            {label}
            {required && (
              <span
                className="text-error-accessible ml-1"
                aria-label="required field"
                role="img"
                aria-hidden="false"
              >
                *
              </span>
            )}
          </Label>
        )}

        <div className="relative">
          {React.cloneElement(children as React.ReactElement, {
            id: htmlFor || fieldId,
            'aria-describedby': describedBy,
            'aria-invalid': !!error,
            error: !!error,
          })}
        </div>

        {hint && !error && (
          <p
            id={hintId}
            className={cn(
              'text-xs leading-relaxed',
              'text-neutral-600 dark:text-neutral-400'
            )}
            role="note"
          >
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className={cn(
              'text-xs font-medium leading-relaxed',
              'text-error-accessible'
            )}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <span className="sr-only">Error: </span>
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

export { FormField, formFieldVariants };
