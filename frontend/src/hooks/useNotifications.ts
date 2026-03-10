// =============================================================================
// DEWPORTAL FRONTEND - NOTIFICATIONS HOOK
// =============================================================================
// Custom hook for notification management.
// Provides notification data and actions for UI components.
// =============================================================================

'use client';

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow'; // ✅ ADD THIS IMPORT
import { useNotificationStore, selectNotifications, selectUnreadCount, selectIsLoading, selectNotificationError, selectUnreadNotifications } from '@/stores/useNotificationStore';
import { Notification, NotificationSeverity, ApiResponse } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';

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
  markAllAsRead: () => Promise<ApiResponse>;
  dismiss: (notificationId: number) => void;
  clearDismissed: () => void;
  getNotificationsBySeverity: (severity: NotificationSeverity) => Notification[];
  getNotificationsByType: (type: string) => Notification[];
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useNotifications(): UseNotificationsReturn {
  const notifications = useNotificationStore(selectNotifications);
  
  // ✅ FIX: Wrap selector with useShallow to prevent infinite re-renders
  const unreadNotifications = useNotificationStore(
    useShallow((state) => selectUnreadNotifications(state))
  );
  
  const unreadCount = useNotificationStore(selectUnreadCount);
  const isLoading = useNotificationStore(selectIsLoading);
  const error = useNotificationStore(selectNotificationError);

  const { 
    markAsRead: storeMarkAsRead, 
    markAllAsRead: storeMarkAllAsRead, 
    dismissNotification, 
    clearDismissed,
    setNotifications,
    setLoading,
    setError,
  } = useNotificationStore();

  // ---------------------------------------------------------------------------
  // Mark As Read
  // ---------------------------------------------------------------------------

  const markAsRead = useCallback(async (notificationId: number): Promise<ApiResponse> => {
    try {
      debugLog('useNotifications: Mark as read', { notificationId });
      
      // Update local store immediately (optimistic update)
      storeMarkAsRead(notificationId);

      // TODO: Call API to persist read status
      // await markNotificationReadAction(notificationId);

      return {
        success: true,
        status: 200 
      };

    } catch (error) {
      errorLog('useNotifications: Mark as read failed', error);
      return { 
        success: false,
        error: 'Failed to mark notification as read' 
      };
    }
  }, [storeMarkAsRead]);

  // ---------------------------------------------------------------------------
  // Mark All As Read
  // ---------------------------------------------------------------------------

  const markAllAsRead = useCallback(async (): Promise<ApiResponse> => {
    try {
      debugLog('useNotifications: Mark all as read');
      
      // Update local store immediately (optimistic update)
      storeMarkAllAsRead();

      // TODO: Call API to persist read status
      // await markAllNotificationsReadAction();

      return {
        success: true,
        status: 200
      };

    } catch (error) {
      errorLog('useNotifications: Mark all as read failed', error);
      return {
        success: false,
        error: 'Failed to mark all notifications as read' 
      };
    }
  }, [storeMarkAllAsRead]);

  // ---------------------------------------------------------------------------
  // Dismiss
  // ---------------------------------------------------------------------------

  const dismiss = useCallback((notificationId: number) => {
    debugLog('useNotifications: Dismiss notification', { notificationId });
    dismissNotification(notificationId);
  }, [dismissNotification]);

  // ---------------------------------------------------------------------------
  // Clear Dismissed
  // ---------------------------------------------------------------------------

  const clearAllDismissed = useCallback(() => {
    debugLog('useNotifications: Clear dismissed notifications');
    clearDismissed();
  }, [clearDismissed]);

  // ---------------------------------------------------------------------------
  // Get Notifications By Severity
  // ---------------------------------------------------------------------------

  const getNotificationsBySeverity = useCallback((severity: NotificationSeverity): Notification[] => {
    return notifications.filter((n) => n.severity === severity && !n.is_dismissed);
  }, [notifications]);

  // ---------------------------------------------------------------------------
  // Get Notifications By Type
  // ---------------------------------------------------------------------------

  const getNotificationsByType = useCallback((type: string): Notification[] => {
    return notifications.filter((n) => n.notification_type === type && !n.is_dismissed);
  }, [notifications]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    notifications,
    unreadNotifications,
    unreadCount,
    isLoading,
    error,

    // Actions
    markAsRead,
    markAllAsRead,
    dismiss,
    clearDismissed: clearAllDismissed,
    getNotificationsBySeverity,
    getNotificationsByType,
  };
}


export type { UseNotificationsReturn };
// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default useNotifications;