// =============================================================================
// DEWPORTAL FRONTEND - AUTHENTICATION HOOK
// =============================================================================
// Custom hook for authentication functionality.
// Wraps auth store and server actions for easy use in components.
// =============================================================================

'use client';

import { useCallback, useState } from 'react';
import { useAuthStore, selectIsAuthenticated, selectAuthUser, selectIsLoading, selectMustChangePassword, selectAuthError } from '@/stores/useAuthStore';
import { loginAction, logoutAction, forcePasswordChangeAction, changePasswordAction, verifySessionAction } from '@/server-actions';
import { LoginInput, ForcePasswordChangeInput, PasswordChangeInput, ApiResponse, User } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerifying: boolean;
  mustChangePassword: boolean;
  error: string | null;

  // Actions
  login: (data: LoginInput) => Promise<ApiResponse>;
  logout: () => Promise<void>;
  forcePasswordChange: (data: ForcePasswordChangeInput) => Promise<ApiResponse>;
  changePassword: (data: PasswordChangeInput) => Promise<ApiResponse>;
  verifySession: () => Promise<ApiResponse>;
  clearError: () => void;
  hasRole: (role: 'admin' | 'staff') => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useAuth(): UseAuthReturn {
  const [isVerifying, setIsVerifying] = useState(false);

  const user = useAuthStore(selectAuthUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isLoading = useAuthStore(selectIsLoading);
  const mustChangePassword = useAuthStore(selectMustChangePassword);
  const error = useAuthStore(selectAuthError);

  const { setUser, setAuthenticated, setLoading, setError, clearError: clearStoreError } = useAuthStore();

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  const login = useCallback(async (data: LoginInput): Promise<ApiResponse> => {
    try {
      debugLog('useAuth: Login attempt', { username: data.username });
      setLoading(true);
      clearError();

      const result = await loginAction(data);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return result;
      }

      // User will be set by AuthProvider after session verification
      setLoading(false);
      return result;

    } catch (error) {
      errorLog('useAuth: Login failed', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      setLoading(false);
      return { error: 'Login failed' };
    }
  }, [setLoading, setError]);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  const logout = useCallback(async (): Promise<void> => {
    try {
      debugLog('useAuth: Logout');
      await logoutAction();
      // AuthProvider will handle clearing state
    } catch (error) {
      errorLog('useAuth: Logout failed', error);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Force Password Change
  // ---------------------------------------------------------------------------

  const forcePasswordChange = useCallback(async (data: ForcePasswordChangeInput): Promise<ApiResponse> => {
    try {
      debugLog('useAuth: Force password change');
      setLoading(true);
      clearError();

      const result = await forcePasswordChangeAction(data);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return result;
      }

      // Update store
      useAuthStore.getState().setMustChangePassword(false);
      setLoading(false);
      return result;

    } catch (error) {
      errorLog('useAuth: Force password change failed', error);
      setError(error instanceof Error ? error.message : 'Password change failed');
      setLoading(false);
      return { error: 'Password change failed' };
    }
  }, [setLoading, setError]);

  // ---------------------------------------------------------------------------
  // Change Password (Regular)
  // ---------------------------------------------------------------------------

  const changePassword = useCallback(async (data: PasswordChangeInput): Promise<ApiResponse> => {
    try {
      debugLog('useAuth: Change password');
      setLoading(true);
      clearError();

      const result = await changePasswordAction(data);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return result;
      }

      setLoading(false);
      return result;

    } catch (error) {
      errorLog('useAuth: Change password failed', error);
      setError(error instanceof Error ? error.message : 'Password change failed');
      setLoading(false);
      return { error: 'Password change failed' };
    }
  }, [setLoading, setError]);

  // ---------------------------------------------------------------------------
  // Verify Session
  // ---------------------------------------------------------------------------

  const verifySession = useCallback(async (): Promise<ApiResponse> => {
    try {
      debugLog('useAuth: Verify session');
      setIsVerifying(true);

      const result = await verifySessionAction();

      if (result.error) {
        setIsVerifying(false);
        return result;
      }

      setIsVerifying(false);
      return result;

    } catch (error) {
      errorLog('useAuth: Session verification failed', error);
      setIsVerifying(false);
      return { error: 'Session verification failed' };
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Clear Error
  // ---------------------------------------------------------------------------

  const clearError = useCallback(() => {
    clearStoreError();
  }, [clearStoreError]);

  // ---------------------------------------------------------------------------
  // Role Checks
  // ---------------------------------------------------------------------------

  const hasRole = useCallback((role: 'admin' | 'staff'): boolean => {
    return user?.role === role;
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user?.role === 'admin';
  }, [user]);

  const isStaff = useCallback((): boolean => {
    return user?.role === 'staff';
  }, [user]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    isVerifying,
    mustChangePassword,
    error,

    // Actions
    login,
    logout,
    forcePasswordChange,
    changePassword,
    verifySession,
    clearError,
    hasRole,
    isAdmin,
    isStaff,
  };
}

export type { UseAuthReturn };

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default useAuth;