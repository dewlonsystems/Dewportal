// =============================================================================
// DEWPORTAL FRONTEND - WEBSOCKET HOOK
// =============================================================================

'use client';

import { useCallback, useEffect } from 'react';
import { useWebSocketStore, selectIsConnected, selectIsConnecting, selectConnectionError, selectNotifications, selectUnreadCount, selectRecentTransactions } from '@/stores/useWebSocketStore';
import useNotificationStore from '@/stores/useNotificationStore';
import { Notification, Transaction, WebSocketMessage } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseWebSocketReturn {
  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Real-time Data
  notifications: Notification[];
  unreadCount: number;
  recentTransactions: Transaction[];

  // Actions
  markNotificationRead: (notificationId: number) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (notificationId: number) => void;
  sendMessage: (message: WebSocketMessage) => void;
  reconnect: () => void;
  disconnect: () => void;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useWebSocket(): UseWebSocketReturn {
  const isConnected = useWebSocketStore(selectIsConnected);
  const isConnecting = useWebSocketStore(selectIsConnecting);
  const connectionError = useWebSocketStore(selectConnectionError);
  const notifications = useWebSocketStore(selectNotifications);
  const unreadCount = useWebSocketStore(selectUnreadCount);
  const recentTransactions = useWebSocketStore(selectRecentTransactions);

  const { 
    markNotificationRead, 
    markAllNotificationsRead,
    reset 
  } = useWebSocketStore();
  
  // Fix: Get the store instance, not the state
  const notificationStore = useNotificationStore;

  // ---------------------------------------------------------------------------
  // Mark Notification Read
  // ---------------------------------------------------------------------------

  const handleMarkNotificationRead = useCallback((notificationId: number) => {
    debugLog('useWebSocket: Mark notification read', { notificationId });
    markNotificationRead(notificationId);
    notificationStore.getState().markAsRead(notificationId);
  }, [markNotificationRead]);

  // ---------------------------------------------------------------------------
  // Mark All Notifications Read
  // ---------------------------------------------------------------------------

  const handleMarkAllNotificationsRead = useCallback(() => {
    debugLog('useWebSocket: Mark all notifications read');
    markAllNotificationsRead();
    notificationStore.getState().markAllAsRead();
  }, [markAllNotificationsRead]);

  // ---------------------------------------------------------------------------
  // Dismiss Notification
  // ---------------------------------------------------------------------------

  const dismissNotification = useCallback((notificationId: number) => {
    debugLog('useWebSocket: Dismiss notification', { notificationId });
    notificationStore.getState().dismissNotification(notificationId);
  }, []);

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const ws = useWebSocketStore.getState().ws;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      debugLog('useWebSocket: Sending message', { type: message.type });
      ws.send(JSON.stringify(message));
    } else {
      errorLog('useWebSocket: Cannot send message - not connected');
      useWebSocketStore.getState().queueMessage(message);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Reconnect
  // ---------------------------------------------------------------------------

  const reconnect = useCallback(() => {
    debugLog('useWebSocket: Manual reconnect');
    reset();
  }, [reset]);

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------

  const disconnect = useCallback(() => {
    debugLog('useWebSocket: Manual disconnect');
    const ws = useWebSocketStore.getState().ws;
    if (ws) {
      ws.close(1000, 'Client disconnect');
    }
    useWebSocketStore.getState().setConnected(false);
    useWebSocketStore.getState().setWebSocket(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Effect: Log Connection Changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    debugLog('useWebSocket: Connection state changed', {
      isConnected,
      isConnecting,
      hasError: !!connectionError,
    });
  }, [isConnected, isConnecting, connectionError]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Connection State
    isConnected,
    isConnecting,
    connectionError,

    // Real-time Data
    notifications,
    unreadCount,
    recentTransactions,

    // Actions
    markNotificationRead: handleMarkNotificationRead,
    markAllNotificationsRead: handleMarkAllNotificationsRead,
    dismissNotification,
    sendMessage,
    reconnect,
    disconnect,
  };
}

// -----------------------------------------------------------------------------
// Export Type
// -----------------------------------------------------------------------------

export type { UseWebSocketReturn };

// -----------------------------------------------------------------------------
// Export Default
// -----------------------------------------------------------------------------

export default useWebSocket;