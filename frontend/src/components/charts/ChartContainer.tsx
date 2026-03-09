// =============================================================================
// DEWPORTAL FRONTEND - CHART CONTAINER
// =============================================================================
// Wrapper component for all charts with loading and error states.
// =============================================================================

'use client';

import { ReactNode } from 'react';
import { Card, CardHeader, CardContent, Spinner, Alert } from '@/components/ui';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ChartContainerProps {
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ChartContainer({
  title,
  description,
  isLoading = false,
  error = null,
  children,
  className,
  headerAction,
}: ChartContainerProps) {
  if (isLoading) {
    return (
      <Card className={cn('h-80 flex items-center justify-center', className)}>
        <Spinner size="lg" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert variant="error" title="Chart Error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || description || headerAction) && (
        <CardHeader title={title} description={description} action={headerAction} />
      )}
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default ChartContainer;