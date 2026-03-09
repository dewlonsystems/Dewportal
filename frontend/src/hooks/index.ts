// =============================================================================
// DEWPORTAL FRONTEND - HOOKS EXPORT
// =============================================================================
// Central export for all custom hooks.
// Import from this file to use hooks throughout the application.
// =============================================================================

// Authentication
export { useAuth } from './useAuth';
export type { UseAuthReturn } from './useAuth';

// WebSocket
export { useWebSocket } from './useWebSocket';
export type { UseWebSocketReturn } from './useWebSocket';

// Notifications
export { useNotifications } from './useNotifications';
export type { UseNotificationsReturn } from './useNotifications';

// Transactions
export { useTransactions } from './useTransactions';
export type { UseTransactionsReturn } from './useTransactions';

// Dashboard
export { useDashboard } from './useDashboard';
export type { UseDashboardReturn } from './useDashboard';

export { useAudit } from './useAudit';
export type { UseAuditReturn } from './useAudit';