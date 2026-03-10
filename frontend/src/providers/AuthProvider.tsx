// =============================================================================
// DEWPORTAL FRONTEND - AUTHENTICATION PROVIDER
// =============================================================================
// Provides authentication context to the entire application.
// Handles session initialization, token refresh, and user state management.
// =============================================================================

'use client';

import {
  useEffect,
  useCallback,
  type ReactNode,
  type ReactElement,
} from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { verifySessionAction, refreshAccessTokenAction } from '@/server-actions';
import { debugLog, errorLog } from '@/lib/utils';
import { SESSION_CONFIG } from '@/constants/config';
import { User, SessionVerifyResponse } from '@/types';
import { Spinner } from '@/components/ui';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

// -----------------------------------------------------------------------------
// Helper: Map Session Response to User Type
// -----------------------------------------------------------------------------

function mapSessionToUser(sessionUser: SessionVerifyResponse['user']): User {
  return {
    id: sessionUser.id,
    username: sessionUser.username,
    email: sessionUser.email,
    first_name: (sessionUser as Partial<User>).first_name || sessionUser.username,
    last_name: (sessionUser as Partial<User>).last_name || sessionUser.username,
    role: sessionUser.role,
    is_active: true,
    is_locked: false,
    must_change_password: (sessionUser as Partial<User>).must_change_password || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const {
    setUser,
    setAuthenticated,
    setInitialized,
    setMustChangePassword,
    updateLastActivity,
    isInitialized,
  } = useAuthStore();

  // ---------------------------------------------------------------------------
  // Initialize Session
  // ---------------------------------------------------------------------------

  const initializeSession = useCallback(async () => {
    try {
      debugLog('AuthProvider: Initializing session');

      const sessionResult = await verifySessionAction();

      if (sessionResult.error || !sessionResult.data) {
        debugLog('AuthProvider: Session invalid');
        setUser(null);
        setAuthenticated(false);
        setInitialized(true);
        return;
      }

      const fullUser = mapSessionToUser(sessionResult.data.user);

      setUser(fullUser);
      setAuthenticated(true);
      setMustChangePassword(fullUser.must_change_password);
      setInitialized(true);
      updateLastActivity();

      debugLog('AuthProvider: Session initialized', {
        username: fullUser.username,
        role: fullUser.role,
        mustChangePassword: fullUser.must_change_password,
      });

    } catch (error) {
      errorLog('AuthProvider: Session initialization failed', error);
      setUser(null);
      setAuthenticated(false);
      setInitialized(true);
    }
  }, [setUser, setAuthenticated, setInitialized, setMustChangePassword, updateLastActivity]);

  // ---------------------------------------------------------------------------
  // Auto Refresh Token
  // ---------------------------------------------------------------------------

  const refreshToken = useCallback(async () => {
    try {
      debugLog('AuthProvider: Refreshing token');

      const result = await refreshAccessTokenAction();

      if (result.error) {
        errorLog('AuthProvider: Token refresh failed', result.error);
        return;
      }

      debugLog('AuthProvider: Token refreshed successfully');
      updateLastActivity();

    } catch (error) {
      errorLog('AuthProvider: Token refresh error', error);
    }
  }, [updateLastActivity]);

  // ---------------------------------------------------------------------------
  // Activity Tracking
  // ---------------------------------------------------------------------------

  const handleUserActivity = useCallback(() => {
    updateLastActivity();
  }, [updateLastActivity]);

  // ---------------------------------------------------------------------------
  // Effect: Initialize Session on Mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
    }
  }, [isInitialized, initializeSession]);

  // ---------------------------------------------------------------------------
  // Effect: Auto Refresh Token
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated) return;

    const refreshInterval = setInterval(
      refreshToken,
      SESSION_CONFIG.REFRESH_THRESHOLD
    );

    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshToken]);

  // ---------------------------------------------------------------------------
  // Effect: Track User Activity
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => handleUserActivity();

    events.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [handleUserActivity]);

  // ---------------------------------------------------------------------------
  // ✅ FIX: Block rendering until session is verified
  // ---------------------------------------------------------------------------

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f4ef]">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  debugLog('AuthProvider: Rendered', { isInitialized });

  return <>{children}</>;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default AuthProvider;