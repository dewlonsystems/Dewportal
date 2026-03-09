// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD LAYOUT COMPONENT
// =============================================================================
// Main layout wrapper for all dashboard pages.
// Includes header, sidebar, and content area.
// =============================================================================

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { Spinner, Alert } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AUTH_ROUTES } from '@/constants/routes';

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
  const router = useRouter();
  const { user, isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const { connectionError } = useWebSocket();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [wsErrorDismissed, setWsErrorDismissed] = useState(false);

  // ---------------------------------------------------------------------------
  // Redirect if not authenticated
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(AUTH_ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  // ---------------------------------------------------------------------------
  // Redirect if must change password
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoading && isAuthenticated && mustChangePassword) {
      router.replace(AUTH_ROUTES.FORCE_PASSWORD_CHANGE);
    }
  }, [isLoading, isAuthenticated, mustChangePassword, router]);

  // ---------------------------------------------------------------------------
  // Reset WS error banner when connection is restored
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!connectionError) {
      setWsErrorDismissed(false);
    }
  }, [connectionError]);

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Not authenticated — render nothing while redirect fires
  // ---------------------------------------------------------------------------

  if (!isAuthenticated || !user) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Must change password — render nothing while redirect fires
  // ---------------------------------------------------------------------------

  if (mustChangePassword) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar (Desktop) */}
      <Sidebar
        isOpen={true}
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