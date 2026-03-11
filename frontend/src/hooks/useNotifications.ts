// =============================================================================
// DEWPORTAL FRONTEND - NOTIFICATIONS HOOK
// =============================================================================
// Custom hook for notification management.
// Provides notification data and actions for UI components.
// Now fully wired to the backend via server actions.
// =============================================================================

'use client';

import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  useNotificationStore,
  selectNotifications,
  selectUnreadCount,
  selectIsLoading,
  selectNotificationError,
  selectUnreadNotifications,
} from '@/stores/useNotificationStore';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitialized,
} from '@/stores/useAuthStore';
import { Notification, NotificationSeverity, ApiResponse } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
  markAllNotificationsReadAction,
  dismissNotificationAction,
} from '@/server-actions/notifications';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadNotifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  markAsRead: (notificationId: number) => Promise<ApiResponse>;
  markAsUnread: (notificationId: number) => Promise<ApiResponse>;
  markAllAsRead: () => Promise<ApiResponse>;
  dismiss: (notificationId: number) => Promise<void>;
  clearDismissed: () => void;
  getNotificationsBySeverity: (severity: NotificationSeverity) => Notification[];
  getNotificationsByType: (type: string) => Notification[];
  refresh: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useNotifications(): UseNotificationsReturn {
  const notifications = useNotificationStore(selectNotifications);

  const unreadNotifications = useNotificationStore(
    useShallow((state) => selectUnreadNotifications(state))
  );

  const unreadCount  = useNotificationStore(selectUnreadCount);
  const isLoading    = useNotificationStore(selectIsLoading);
  const error        = useNotificationStore(selectNotificationError);

  // ✅ Guard: only fetch once auth is ready
  const isInitialized   = useAuthStore(selectIsInitialized);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  const {
    markAsRead:          storeMarkAsRead,
    markAllAsRead:       storeMarkAllAsRead,
    dismissNotification: storeDismiss,
    clearDismissed,
    setNotifications,
    setLoading,
    setError,
  } = useNotificationStore();

  // ---------------------------------------------------------------------------
  // Initial Load — fetch existing notifications from the API on mount
  // ---------------------------------------------------------------------------

  const loadNotifications = useCallback(async () => {
    // Skip if already has data (e.g. populated via WebSocket)
    if (useNotificationStore.getState().notifications.length > 0) {
      debugLog('useNotifications: Skipping fetch — store already populated');
      return;
    }

    try {
      debugLog('useNotifications: Loading notifications from API');
      setLoading(true);
      setError(null);

      const response = await fetchNotificationsAction({ page_size: 50 });

      if (response.success && response.data) {
        setNotifications(response.data.results);
        debugLog('useNotifications: Loaded notifications', {
          count: response.data.results.length,
        });
      } else {
        setError(response.error || 'Failed to load notifications');
      }
    } catch (err) {
      errorLog('useNotifications: Load failed', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setLoading, setError]);

  // ✅ FIX: Wait for auth to initialize and confirm user is authenticated
  //    before fetching. Previously this fired immediately on mount, hitting
  //    the server action before sessionStorage rehydration completed —
  //    causing a silent 401 and empty notification panel.
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      loadNotifications();
    }
  }, [isInitialized, isAuthenticated, loadNotifications]);

  // ---------------------------------------------------------------------------
  // Refresh — force re-fetch from API (e.g. after reconnect)
  // ---------------------------------------------------------------------------

  const refresh = useCallback(async () => {
    try {
      debugLog('useNotifications: Refreshing notifications');
      setLoading(true);
      setError(null);

      const response = await fetchNotificationsAction({ page_size: 50 });

      if (response.success && response.data) {
        setNotifications(response.data.results);
      } else {
        setError(response.error || 'Failed to refresh notifications');
      }
    } catch (err) {
      errorLog('useNotifications: Refresh failed', err);
      setError('Failed to refresh notifications');
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setLoading, setError]);

  // ---------------------------------------------------------------------------
  // Mark As Read
  // ---------------------------------------------------------------------------

  const markAsRead = useCallback(async (notificationId: number): Promise<ApiResponse> => {
    try {
      debugLog('useNotifications: Mark as read', { notificationId });

      // Optimistic update — update UI immediately
      storeMarkAsRead(notificationId);

      // Persist to backend
      const response = await markNotificationReadAction(notificationId);

      if (!response.success) {
        errorLog('useNotifications: Mark as read API failed', response.error);
      }

      return response;

    } catch (err) {
      errorLog('useNotifications: Mark as read failed', err);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }, [storeMarkAsRead]);

  // ---------------------------------------------------------------------------
  // Mark As Unread
  // ---------------------------------------------------------------------------

  const markAsUnread = useCallback(async (notificationId: number): Promise<ApiResponse> => {
    try {
      debugLog('useNotifications: Mark as unread', { notificationId });

      // Optimistic update — flip is_read to false locally
      useNotificationStore.setState((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: false, read_at: null }
            : n
        ),
        unreadCount: state.notifications.find(
          (n) => n.id === notificationId && n.is_read
        )
          ? state.unreadCount + 1
          : state.unreadCount,
      }));

      // Persist to backend
      const response = await markNotificationUnreadAction(notificationId);

      if (!response.success) {
        errorLog('useNotifications: Mark as unread API failed', response.error);
      }

      return response;

    } catch (err) {
      errorLog('useNotifications: Mark as unread failed', err);
      return { success: false, error: 'Failed to mark notification as unread' };
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Mark All As Read
  // ---------------------------------------------------------------------------

  const markAllAsRead = useCallback(async (): Promise<ApiResponse> => {
    try {
      debugLog('useNotifications: Mark all as read');

      // Optimistic update
      storeMarkAllAsRead();

      // Persist to backend
      const response = await markAllNotificationsReadAction();

      if (!response.success) {
        errorLog('useNotifications: Mark all as read API failed', response.error);
      }

      return response;

    } catch (err) {
      errorLog('useNotifications: Mark all as read failed', err);
      return { success: false, error: 'Failed to mark all notifications as read' };
    }
  }, [storeMarkAllAsRead]);

  // ---------------------------------------------------------------------------
  // Dismiss
  // ---------------------------------------------------------------------------

  const dismiss = useCallback(async (notificationId: number): Promise<void> => {
    try {
      debugLog('useNotifications: Dismiss', { notificationId });

      // Optimistic update
      storeDismiss(notificationId);

      // Persist to backend
      const response = await dismissNotificationAction(notificationId);

      if (!response.success) {
        errorLog('useNotifications: Dismiss API failed', response.error);
      }

    } catch (err) {
      errorLog('useNotifications: Dismiss failed', err);
    }
  }, [storeDismiss]);

  // ---------------------------------------------------------------------------
  // Filter Helpers
  // ---------------------------------------------------------------------------

  const getNotificationsBySeverity = useCallback(
    (severity: NotificationSeverity): Notification[] =>
      notifications.filter((n) => n.severity === severity && !n.is_dismissed),
    [notifications]
  );

  const getNotificationsByType = useCallback(
    (type: string): Notification[] =>
      notifications.filter((n) => n.notification_type === type && !n.is_dismissed),
    [notifications]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    isLoading,
    error,

    markAsRead,
    markAsUnread,
    markAllAsRead,
    dismiss,
    clearDismissed,
    getNotificationsBySeverity,
    getNotificationsByType,
    refresh,
  };
}

export type { UseNotificationsReturn };
export default useNotifications;