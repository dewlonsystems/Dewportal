// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD LAYOUT COMPONENT
// =============================================================================
// Main layout wrapper for all dashboard pages.
// Includes header, sidebar, and content area.
// =============================================================================

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Alert } from '@/components/ui';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function DashboardLayout({
  children,
  title,
  description,
  action,
}: DashboardLayoutProps) {
  const { connectionError } = useWebSocket();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [wsErrorDismissed, setWsErrorDismissed] = useState(false);

  // ---------------------------------------------------------------------------
  // Reset WS error banner when connection is restored
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!connectionError) {
      setWsErrorDismissed(false);
    }
  }, [connectionError]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (Desktop) */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-[280px] flex flex-col min-h-screen">

        {/* Header — fixed, sits at top right of sidebar */}
        <Header
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* WebSocket Connection Error Banner */}
        {connectionError && !wsErrorDismissed && (
          <div className="fixed top-16 left-[280px] right-0 z-50 px-4 lg:px-6 pt-2">
            <Alert
              variant="warning"
              dismissible
              onDismiss={() => setWsErrorDismissed(true)}
            >
              <span className="text-sm">
                Real-time connection lost. Data may not be up to date.
              </span>
            </Alert>
          </div>
        )}

        {/* Page Content — mt-16 clears the fixed header height (64px) */}
        <main className={cn(
          'flex-1 p-4 lg:p-6 mt-16',
          connectionError && !wsErrorDismissed && 'mt-24',
        )}>
          {/* Page Header */}
          {(title || description || action) && (
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  {title && (
                    <h1 className="text-2xl font-bold text-primary">{title}</h1>
                  )}
                  {description && (
                    <p className="text-sm text-text-muted">{description}</p>
                  )}
                </div>
                {action && (
                  <div className="shrink-0">{action}</div>
                )}
              </div>
            </div>
          )}

          {/* Page Body */}
          <div className={cn(
            'w-full',
            !title && !description && !action && 'mt-2',
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default DashboardLayout;