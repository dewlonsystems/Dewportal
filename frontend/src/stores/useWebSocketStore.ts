// =============================================================================
// DEWPORTAL FRONTEND - WEBSOCKET STORE
// =============================================================================
// Zustand store for managing WebSocket connection state.
// Handles real-time notifications, transaction updates, and live data.
// =============================================================================

import { create } from 'zustand';
import { WebSocketMessage, WebSocketConnection, Notification, Transaction } from '@/types';
import { debugLog, errorLog, warnLog } from '@/lib/utils';
import { WS_CONFIG } from '@/constants/config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WebSocketState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  lastHeartbeat: number | null;

  // WebSocket instance (stored as ref, not serialized)
  ws: WebSocket | null;

  // Connection info
  connection: WebSocketConnection | null;

  // Queued messages (for when disconnected)
  messageQueue: WebSocketMessage[];

  // Real-time data caches
  notifications: Notification[];
  unreadCount: number;
  recentTransactions: Transaction[];

  // Event handlers
  onConnect: (() => void) | null;
  onDisconnect: (() => void) | null;
  onMessage: ((message: WebSocketMessage) => void) | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  setConnection: (connection: WebSocketConnection | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  updateLastHeartbeat: () => void;
  queueMessage: (message: WebSocketMessage) => void;
  clearMessageQueue: () => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: number) => void;
  markAllNotificationsRead: () => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  setOnConnect: (handler: (() => void) | null) => void;
  setOnDisconnect: (handler: (() => void) | null) => void;
  setOnMessage: (handler: ((message: WebSocketMessage) => void) | null) => void;
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Create Store (No initialState - actions defined inline)
// -----------------------------------------------------------------------------

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State (Data only)
  // ---------------------------------------------------------------------------

  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnectAttempts: 0,
  lastHeartbeat: null,
  ws: null,
  connection: null,
  messageQueue: [],
  notifications: [],
  unreadCount: 0,
  recentTransactions: [],
  onConnect: null,
  onDisconnect: null,
  onMessage: null,

  // ---------------------------------------------------------------------------
  // Connection State Actions
  // ---------------------------------------------------------------------------

  setConnected: (connected) => {
    debugLog('WebSocket Store: Setting connected', { connected });
    set({ 
      isConnected: connected,
      isConnecting: !connected,
      connectionError: connected ? null : get().connectionError,
    });

    if (connected) {
      get().onConnect?.();
    }
  },

  setConnecting: (connecting) => {
    set({ isConnecting: connecting });
  },

  setConnectionError: (error) => {
    if (error) {
      errorLog('WebSocket Store: Connection error', error);
    }
    set({ connectionError: error });
  },

  // ---------------------------------------------------------------------------
  // WebSocket Instance Actions
  // ---------------------------------------------------------------------------

  setWebSocket: (ws) => {
    debugLog('WebSocket Store: Setting WebSocket instance', { 
      hasInstance: !!ws,
    });
    set({ ws });
  },

  setConnection: (connection) => {
    set({ connection });
  },

  // ---------------------------------------------------------------------------
  // Reconnection Actions
  // ---------------------------------------------------------------------------

  incrementReconnectAttempts: () => {
    const attempts = get().reconnectAttempts + 1;
    debugLog('WebSocket Store: Reconnect attempt', { attempts });
    set({ reconnectAttempts: attempts });
  },

  resetReconnectAttempts: () => {
    set({ reconnectAttempts: 0 });
  },

  updateLastHeartbeat: () => {
    set({ lastHeartbeat: Date.now() });
  },

  // ---------------------------------------------------------------------------
  // Message Queue Actions
  // ---------------------------------------------------------------------------

  queueMessage: (message) => {
    debugLog('WebSocket Store: Queuing message', { type: message.type });
    set((state) => ({
      messageQueue: [...state.messageQueue, message],
    }));
  },

  clearMessageQueue: () => {
    set({ messageQueue: [] });
  },

  // ---------------------------------------------------------------------------
  // Notification Actions
  // ---------------------------------------------------------------------------

  addNotification: (notification) => {
    debugLog('WebSocket Store: Adding notification', {
      id: notification.id,
      type: notification.notification_type,
      title: notification.title,
    });

    set((state) => {
      const newNotifications = [notification, ...state.notifications].slice(0, 50);
      const newUnreadCount = !notification.is_read ? state.unreadCount + 1 : state.unreadCount;

      return {
        notifications: newNotifications,
        unreadCount: newUnreadCount,
      };
    });
  },

  markNotificationRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  // ---------------------------------------------------------------------------
  // Transaction Actions
  // ---------------------------------------------------------------------------

  addTransaction: (transaction) => {
    debugLog('WebSocket Store: Adding transaction', {
      reference: transaction.reference,
      status: transaction.status,
    });

    set((state) => ({
      recentTransactions: [transaction, ...state.recentTransactions].slice(0, 20),
    }));
  },

  updateTransaction: (transaction) => {
    debugLog('WebSocket Store: Updating transaction', {
      reference: transaction.reference,
      status: transaction.status,
    });

    set((state) => ({
      recentTransactions: state.recentTransactions.map((t) =>
        t.id === transaction.id ? transaction : t
      ),
    }));
  },

  // ---------------------------------------------------------------------------
  // Event Handler Actions
  // ---------------------------------------------------------------------------

  setOnConnect: (handler) => {
    set({ onConnect: handler });
  },

  setOnDisconnect: (handler) => {
    set({ onDisconnect: handler });
  },

  setOnMessage: (handler) => {
    set({ onMessage: handler });
  },

  // ---------------------------------------------------------------------------
  // Reset Action
  // ---------------------------------------------------------------------------

  reset: () => {
    debugLog('WebSocket Store: Resetting to initial state');
    
    const ws = get().ws;
    if (ws) {
      ws.close();
    }

    set({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      reconnectAttempts: 0,
      lastHeartbeat: null,
      ws: null,
      connection: null,
      messageQueue: [],
      notifications: [],
      unreadCount: 0,
      recentTransactions: [],
      onConnect: null,
      onDisconnect: null,
      onMessage: null,
    });
  },
}));

// -----------------------------------------------------------------------------
// Selectors
// -----------------------------------------------------------------------------

export const selectIsConnected = (state: WebSocketState) => state.isConnected;
export const selectIsConnecting = (state: WebSocketState) => state.isConnecting;
export const selectConnectionError = (state: WebSocketState) => state.connectionError;
export const selectNotifications = (state: WebSocketState) => state.notifications;
export const selectUnreadCount = (state: WebSocketState) => state.unreadCount;
export const selectRecentTransactions = (state: WebSocketState) => state.recentTransactions;
export const selectReconnectAttempts = (state: WebSocketState) => state.reconnectAttempts;

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

export function isConnected(): boolean {
  return useWebSocketStore.getState().isConnected;
}

export function getUnreadCount(): number {
  return useWebSocketStore.getState().unreadCount;
}

export function getNotifications(): Notification[] {
  return useWebSocketStore.getState().notifications;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default useWebSocketStore;