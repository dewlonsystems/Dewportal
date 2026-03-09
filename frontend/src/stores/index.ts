// =============================================================================
// DEWPORTAL FRONTEND - ZUSTAND STORES EXPORT
// =============================================================================
// Central export for all Zustand stores.
// Import from this file to use stores throughout the application.
// =============================================================================

// -----------------------------------------------------------------------------
// Auth Store
// -----------------------------------------------------------------------------

export {
  useAuthStore,
  selectAuthUser,
  selectIsAuthenticated,
  selectIsLoading as selectAuthIsLoading,
  selectIsInitialized,
  selectMustChangePassword,
  selectAuthError,
  selectUserRole,
  selectIsAdmin,
  selectIsStaff,
  hasRole,
  isAdmin,
  isStaff,
} from './useAuthStore';

export type { AuthState } from './useAuthStore';

// -----------------------------------------------------------------------------
// WebSocket Store
// -----------------------------------------------------------------------------

export {
  useWebSocketStore,
  selectIsConnected,
  selectIsConnecting,
  selectConnectionError,
  selectNotifications as selectWebSocketNotifications,
  selectUnreadCount as selectWebSocketUnreadCount,
  selectRecentTransactions,
  selectReconnectAttempts,
  isConnected,
  getUnreadCount as getWebSocketUnreadCount,
  getNotifications as getWebSocketNotifications,
} from './useWebSocketStore';

export type { WebSocketState } from './useWebSocketStore';

// -----------------------------------------------------------------------------
// Notification Store
// -----------------------------------------------------------------------------

export {
  useNotificationStore,
  selectNotifications as selectNotificationStoreNotifications,
  selectUnreadCount as selectNotificationStoreUnreadCount,
  selectIsLoading as selectNotificationStoreIsLoading,
  selectNotificationError,
  selectUnreadNotifications,
  selectNotificationsBySeverity,
} from './useNotificationStore';

export type { NotificationState } from './useNotificationStore';