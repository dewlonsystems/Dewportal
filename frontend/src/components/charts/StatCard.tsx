// =============================================================================
// DEWPORTAL FRONTEND - STAT CARD
// =============================================================================
// Summary statistic card for dashboard metrics.
// =============================================================================

'use client';

import { ReactNode } from 'react';
import { Card, CardContent, Badge, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  isLoading?: boolean;
  variant?: 'default' | 'currency' | 'percentage' | 'count';
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  isLoading = false,
  variant = 'default',
  trend = 'neutral',
  className,
}: StatCardProps) {
  const formatValue = () => {
    if (isLoading) return '---';
    
    switch (variant) {
      case 'currency':
        return formatCurrency(typeof value === 'string' ? parseFloat(value) : value);
      case 'percentage':
        return `${typeof value === 'string' ? parseFloat(value) : value}%`;
      case 'count':
        return new Intl.NumberFormat().format(typeof value === 'string' ? parseInt(value) : value);
      default:
        return String(value);
    }
  };

  const trendColors = {
    up: 'text-success',
    down: 'text-error',
    neutral: 'text-text-muted',
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-muted">{title}</p>
            
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <p className="text-2xl font-bold text-text">{formatValue()}</p>
            )}

            {change !== undefined && (
              <div className="flex items-center gap-1">
                <span className={cn('flex items-center text-sm', trendColors[trend])}>
                  {trendIcons[trend]}
                  {change >= 0 ? '+' : ''}{change}%
                </span>
                {changeLabel && (
                  <span className="text-sm text-text-muted">{changeLabel}</span>
                )}
              </div>
            )}
          </div>

          {icon && (
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default StatCard;