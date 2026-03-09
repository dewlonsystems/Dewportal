// =============================================================================
// DEWPORTAL FRONTEND - ALERT COMPONENT
// =============================================================================
// Alert/Toast component for notifications and messages.
// =============================================================================

'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'info',
      title,
      dismissible = false,
      onDismiss,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'rounded-lg border p-4 space-y-2',
      {
        'bg-primary/10 border-primary/20 text-primary': variant === 'info',
        'bg-success/10 border-success/20 text-success': variant === 'success',
        'bg-warning/10 border-warning/20 text-warning': variant === 'warning',
        'bg-error/10 border-error/20 text-error': variant === 'error',
      },
      className
    );

    const iconStyles = {
      info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    return (
      <div ref={ref} className={baseStyles} role="alert" {...props}>
        <div className="flex items-start gap-3">
          {icon || iconStyles[variant]}
          
          <div className="flex-1 space-y-1">
            {title && (
              <p className="font-medium">{title}</p>
            )}
            <div className="text-sm">{children}</div>
          </div>

          {dismissible && (
            <button
              onClick={onDismiss}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss alert"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Alert;