// =============================================================================
// DEWPORTAL FRONTEND - NOTIFICATION STORE
// =============================================================================
// Zustand store for managing notification state.
// Separate from WebSocket store for better organization.
// =============================================================================

import { create } from 'zustand';
import { Notification, NotificationSeverity } from '@/types';
import { debugLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (notificationId: number) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: number) => void;
  clearDismissed: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Create Store (No initialState - actions defined inline)
// -----------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State (Data only)
  // ---------------------------------------------------------------------------

  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // ---------------------------------------------------------------------------
  // Notification Actions
  // ---------------------------------------------------------------------------

  setNotifications: (notifications) => {
    debugLog('Notification Store: Setting notifications', { 
      count: notifications.length,
    });

    const unreadCount = notifications.filter((n) => !n.is_read && !n.is_dismissed).length;

    set({
      notifications,
      unreadCount,
    });
  },

  addNotification: (notification) => {
    debugLog('Notification Store: Adding notification', {
      id: notification.id,
      title: notification.title,
    });

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount: !notification.is_read ? state.unreadCount + 1 : state.unreadCount,
    }));
  },

  removeNotification: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: state.notifications.find((n) => n.id === notificationId && !n.is_read)
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
  },

  markAsRead: (notificationId) => {
    debugLog('Notification Store: Marking notification as read', { notificationId });

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    debugLog('Notification Store: Marking all notifications as read');

    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  dismissNotification: (notificationId) => {
    debugLog('Notification Store: Dismissing notification', { notificationId });

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, is_dismissed: true, dismissed_at: new Date().toISOString() }
          : n
      ),
    }));
  },

  clearDismissed: () => {
    debugLog('Notification Store: Clearing dismissed notifications');

    set((state) => ({
      notifications: state.notifications.filter((n) => !n.is_dismissed),
    }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    debugLog('Notification Store: Resetting to initial state');
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });
  },
}));

// -----------------------------------------------------------------------------
// Selectors
// -----------------------------------------------------------------------------

export const selectNotifications = (state: NotificationState) => state.notifications;
export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectIsLoading = (state: NotificationState) => state.isLoading;
export const selectNotificationError = (state: NotificationState) => state.error;
export const selectUnreadNotifications = (state: NotificationState) =>
  state.notifications.filter((n) => !n.is_read && !n.is_dismissed);

export const selectNotificationsBySeverity = (severity: NotificationSeverity) =>
  (state: NotificationState) =>
    state.notifications.filter((n) => n.severity === severity && !n.is_dismissed);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default useNotificationStore;