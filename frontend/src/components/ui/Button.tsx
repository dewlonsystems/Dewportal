// =============================================================================
// DEWPORTAL FRONTEND - BUTTON COMPONENT
// =============================================================================
// Reusable button component with multiple variants and sizes.
// =============================================================================

'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center font-medium rounded-md',
      'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'whitespace-nowrap',
      {
        'w-full': fullWidth,
      }
    );

    const variantStyles = {
      primary: cn(
        'bg-primary text-white hover:bg-primary-dark',
        'focus:ring-primary shadow-sm'
      ),
      secondary: cn(
        'bg-secondary text-white hover:bg-secondary/90',
        'focus:ring-secondary shadow-sm'
      ),
      outline: cn(
        'border border-border bg-transparent text-text',
        'hover:bg-background focus:ring-primary'
      ),
      danger: cn(
        'bg-error text-white hover:bg-error/90',
        'focus:ring-error shadow-sm'
      ),
      ghost: cn(
        'bg-transparent text-text hover:bg-background',
        'focus:ring-primary'
      ),
      link: cn(
        'bg-transparent text-primary hover:underline',
        'focus:ring-primary shadow-none'
      ),
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Button;