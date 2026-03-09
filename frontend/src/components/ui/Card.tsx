// =============================================================================
// DEWPORTAL FRONTEND - CARD COMPONENT
// =============================================================================
// Reusable card component for content containers.
// =============================================================================

'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'bg-surface rounded-lg transition-all duration-200',
      {
        'border border-border shadow-sm': variant === 'default',
        'border border-border shadow-none': variant === 'outlined',
        'shadow-md hover:shadow-lg': variant === 'elevated',
        'hover:shadow-md': hoverable,
        'p-3': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg',
        'p-0': padding === 'none',
      },
      className
    );

    return (
      <div ref={ref} className={baseStyles} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// -----------------------------------------------------------------------------
// Card Header
// -----------------------------------------------------------------------------

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between mb-4', className)}
        {...props}
      >
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-text">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-text-muted">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// -----------------------------------------------------------------------------
// Card Content
// -----------------------------------------------------------------------------

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props} />
    );
  }
);

CardContent.displayName = 'CardContent';

// -----------------------------------------------------------------------------
// Card Footer
// -----------------------------------------------------------------------------

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center pt-4 mt-4 border-t border-border',
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Card;