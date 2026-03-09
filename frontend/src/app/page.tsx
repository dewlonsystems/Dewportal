// =============================================================================
// DEWPORTAL FRONTEND - HOME PAGE
// =============================================================================
// Redirects to login or dashboard based on authentication status.
// =============================================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';
import { DASHBOARD_ROUTES, AUTH_ROUTES } from '@/constants/routes';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(AUTH_ROUTES.LOGIN);
      } else if (mustChangePassword) {
        router.push(AUTH_ROUTES.FORCE_PASSWORD_CHANGE);
      } else {
        router.push(DASHBOARD_ROUTES.DASHBOARD);
      }
    }
  }, [isAuthenticated, isLoading, mustChangePassword, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-text-muted">Loading...</p>
      </div>
    </div>
  );
}