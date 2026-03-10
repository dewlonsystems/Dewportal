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

      // ✅ Check explicit success flag from server action
      if (result.success === false || result.error) {
        setError(result.error || 'Login failed');
        setLoading(false);
        return result;
      }

      // ✅ Only proceed if backend explicitly confirmed success
      if (result.success === true && result.data?.user) {
        const apiUser = result.data.user;
        const fullUser: User = {
          id: apiUser.id,
          username: apiUser.username,
          email: apiUser.email,
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

    } catch (err) {
      errorLog('useAuth: Login failed', err);
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  }, [setLoading, setError, setUser, setAuthenticated, setStoreMustChangePassword]);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  const logout = useCallback(async (): Promise<void> => {
    try {
      debugLog('useAuth: Logout');
      await logoutAction();
      // ✅ Clear store immediately instead of waiting for AuthProvider
      setUser(null);
      setAuthenticated(false);
      setStoreMustChangePassword(false);
    } catch (err) {
      errorLog('useAuth: Logout failed', err);
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

      // ✅ Check explicit success flag
      if (result.success === false || result.error) {
        setError(result.error || 'Password change failed');
        setLoading(false);
        return result;
      }

      // ✅ Only update store on explicit success
      if (result.success === true) {
        useAuthStore.getState().setMustChangePassword(false);
      }
      
      setLoading(false);
      return result;

    } catch (err) {
      errorLog('useAuth: Force password change failed', err);
      const message = err instanceof Error ? err.message : 'Password change failed';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
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

      // ✅ Check explicit success flag
      if (result.success === false || result.error) {
        setError(result.error || 'Password change failed');
        setLoading(false);
        return result;
      }

      setLoading(false);
      return result;

    } catch (err) {
      errorLog('useAuth: Change password failed', err);
      const message = err instanceof Error ? err.message : 'Password change failed';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
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

      // ✅ Check explicit success flag
      if (result.success === false || result.error) {
        setIsVerifying(false);
        return result;
      }

      setIsVerifying(false);
      return result;

    } catch (err) {
      errorLog('useAuth: Session verification failed', err);
      setIsVerifying(false);
      return { success: false, error: 'Session verification failed' };
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