// =============================================================================
// DEWPORTAL FRONTEND - AUTHENTICATION STORE
// =============================================================================
// Zustand store for managing authentication state.
// Handles user session, tokens, and auth status.
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AuthState {
  // User data
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Tokens (stored in httpOnly cookies, not in state)
  accessToken: string | null;
  refreshToken: string | null;

  // Auth status
  mustChangePassword: boolean;
  lastActivity: number | null;

  // Errors
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setTokens: (access: string | null, refresh: string | null) => void;
  setMustChangePassword: (mustChange: boolean) => void;
  updateLastActivity: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Create Store with Persist (No initialState - actions defined inline)
// -----------------------------------------------------------------------------

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ---------------------------------------------------------------------------
      // Initial State (Data only)
      // ---------------------------------------------------------------------------

      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      accessToken: null,
      refreshToken: null,
      mustChangePassword: false,
      lastActivity: null,
      error: null,

      // ---------------------------------------------------------------------------
      // User Actions
      // ---------------------------------------------------------------------------

      setUser: (user) => {
        debugLog('Auth Store: Setting user', { 
          username: user?.username,
          role: user?.role,
        });
        
        set({ 
          user,
          isAuthenticated: !!user,
        });
      },

      setAuthenticated: (authenticated) => {
        debugLog('Auth Store: Setting authenticated', { authenticated });
        set({ isAuthenticated: authenticated });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setInitialized: (initialized) => {
        debugLog('Auth Store: Setting initialized', { initialized });
        set({ isInitialized: initialized });
      },

      // ---------------------------------------------------------------------------
      // Token Actions
      // ---------------------------------------------------------------------------

      setTokens: (access, refresh) => {
        debugLog('Auth Store: Setting tokens', {
          hasAccess: !!access,
          hasRefresh: !!refresh,
        });
        
        set({
          accessToken: access,
          refreshToken: refresh,
        });
      },

      // ---------------------------------------------------------------------------
      // Password Change
      // ---------------------------------------------------------------------------

      setMustChangePassword: (mustChange) => {
        debugLog('Auth Store: Setting must change password', { mustChange });
        set({ mustChangePassword: mustChange });
      },

      // ---------------------------------------------------------------------------
      // Activity Tracking
      // ---------------------------------------------------------------------------

      updateLastActivity: () => {
        set({ lastActivity: Date.now() });
      },

      // ---------------------------------------------------------------------------
      // Error Handling
      // ---------------------------------------------------------------------------

      setError: (error) => {
        errorLog('Auth Store: Setting error', error);
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // ---------------------------------------------------------------------------
      // Reset
      // ---------------------------------------------------------------------------

      reset: () => {
        debugLog('Auth Store: Resetting to initial state');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: false,
          accessToken: null,
          refreshToken: null,
          mustChangePassword: false,
          lastActivity: null,
          error: null,
        });
      },
    }),
    {
      // Persist configuration
      name: 'dewportal-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist these fields (not actions)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
        lastActivity: state.lastActivity,
        isInitialized: state.isInitialized,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            errorLog('Auth Store: Rehydration failed', error);
          } else {
            debugLog('Auth Store: Rehydration successful');
          }
        };
      },
    }
  )
);

// -----------------------------------------------------------------------------
// Selectors
// -----------------------------------------------------------------------------

export const selectAuthUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
export const selectMustChangePassword = (state: AuthState) => state.mustChangePassword;
export const selectAuthError = (state: AuthState) => state.error;
export const selectUserRole = (state: AuthState) => state.user?.role;
export const selectIsAdmin = (state: AuthState) => state.user?.role === 'admin';
export const selectIsStaff = (state: AuthState) => state.user?.role === 'staff';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

export function hasRole(role: UserRole): boolean {
  const state = useAuthStore.getState();
  return state.user?.role === role;
}

export function isAdmin(): boolean {
  return hasRole('admin');
}

export function isStaff(): boolean {
  return hasRole('staff');
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default useAuthStore;