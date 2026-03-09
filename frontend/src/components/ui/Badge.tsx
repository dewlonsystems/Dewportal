// =============================================================================
// DEWPORTAL FRONTEND - BADGE COMPONENT
// =============================================================================
// Status badge component for displaying states and labels.
// =============================================================================

'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  dot?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = 'default', size = 'md', dot = false, children, ...props },
    ref
  ) => {
    const baseStyles = cn(
      'inline-flex items-center rounded-full font-medium',
      {
        'px-2.5 py-0.5 text-xs': size === 'sm',
        'px-3 py-1 text-sm': size === 'md',
        'bg-success/10 text-success': variant === 'success',
        'bg-warning/10 text-warning': variant === 'warning',
        'bg-error/10 text-error': variant === 'error',
        'bg-primary/10 text-primary': variant === 'info',
        'bg-secondary/10 text-secondary': variant === 'default',
      },
      className
    );

    return (
      <span ref={ref} className={baseStyles} {...props}>
        {dot && (
          <span
            className={cn(
              'w-2 h-2 rounded-full mr-1.5',
              {
                'bg-success': variant === 'success',
                'bg-warning': variant === 'warning',
                'bg-error': variant === 'error',
                'bg-primary': variant === 'info',
                'bg-secondary': variant === 'default',
              }
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Badge;