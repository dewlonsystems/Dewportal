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

  const { setUser, setAuthenticated, setLoading, setError, clearError: clearStoreError, setMustChangePassword: setStoreMustChangePassword } = useAuthStore();

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

      // ✅ FIX: Populate store immediately after successful login
      // Prevents UI flicker before AuthProvider re-verifies session
      // Uses same safe mapping pattern as AuthProvider.tsx
      if (result.data?.user) {
        const apiUser = result.data.user;
        const fullUser: User = {
          id: apiUser.id,
          username: apiUser.username,
          email: apiUser.email,
          // ✅ Safe access using Partial<User> assertion (matches AuthProvider pattern)
          first_name: (apiUser as Partial<User>).first_name || apiUser.username,
          last_name: (apiUser as Partial<User>).last_name || '',
          role: apiUser.role,
          is_active: true,
          is_locked: false,
          must_change_password: (apiUser as Partial<User>).must_change_password || false,
          created_at: (apiUser as Partial<User>).created_at || new Date().toISOString(),
          updated_at: (apiUser as Partial<User>).updated_at || new Date().toISOString(),
        };
        
        setUser(fullUser);
        setAuthenticated(true);
        if (fullUser.must_change_password) {
          setStoreMustChangePassword(true);
        }
      }

      setLoading(false);
      return result;

    } catch (error) {
      errorLog('useAuth: Login failed', error);
      setError(error instanceof Error ? error.message : 'Invalid credentials');
      setLoading(false);
      return { error: 'Invalid credentials' };
    }
  }, [setLoading, setError, setUser, setAuthenticated, setStoreMustChangePassword]);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  const logout = useCallback(async (): Promise<void> => {
    try {
      debugLog('useAuth: Logout');
      await logoutAction();
      // ✅ FIX: Clear store immediately instead of waiting for AuthProvider
      setUser(null);
      setAuthenticated(false);
      setStoreMustChangePassword(false);
    } catch (error) {
      errorLog('useAuth: Logout failed', error);
    }
  }, [setUser, setAuthenticated, setStoreMustChangePassword]);

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