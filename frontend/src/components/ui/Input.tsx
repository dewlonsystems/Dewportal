// =============================================================================
// DEWPORTAL FRONTEND - INPUT COMPONENT
// =============================================================================
// Reusable input component with label, error, and various types.
// =============================================================================

'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = false,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const baseStyles = cn(
      'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text',
      'placeholder:text-text-muted',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-all duration-150',
      {
        'w-full': fullWidth,
        'border-error focus:ring-error': error,
        'pl-10': leftIcon,
        'pr-10': rightIcon,
      },
      className
    );

    return (
      <div className={cn('space-y-1', { 'w-full': fullWidth })}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            className={baseStyles}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-sm text-error" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Input;