// =============================================================================
// DEWPORTAL FRONTEND - WEBSOCKET PROVIDER
// =============================================================================
// Provides WebSocket connection context to the entire application.
// Manages connection lifecycle, authentication, heartbeat, and reconnection.
// =============================================================================

'use client';

import {
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type ReactElement,
} from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWebSocketStore } from '@/stores/useWebSocketStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { WS_BASE_URL, WS_ENDPOINTS } from '@/lib/api/endpoints';
import { WS_CONFIG } from '@/constants/config';
import { debugLog, errorLog, warnLog } from '@/lib/utils';
import { WebSocketMessage, Notification, Transaction } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WebSocketProviderProps {
  children: ReactNode;
}

// -----------------------------------------------------------------------------
// Helper: Get Access Token
// -----------------------------------------------------------------------------

async function getAccessToken(): Promise<string | null> {
  const state = useAuthStore.getState();
  return state.accessToken;
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

export function WebSocketProvider({ children }: WebSocketProviderProps): ReactElement {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { 
    isConnected, 
    setConnected, 
    setConnecting, 
    setConnectionError, 
    setWebSocket, 
    incrementReconnectAttempts, 
    resetReconnectAttempts, 
    updateLastHeartbeat, 
    addNotification, 
    addTransaction, 
    updateTransaction,
    reconnectAttempts,
  } = useWebSocketStore();
  
  const { addNotification: addNotificationToStore } = useNotificationStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // ---------------------------------------------------------------------------
  // Connect to WebSocket (defined first to avoid circular dependency)
  // ---------------------------------------------------------------------------

  const connect = useCallback(async () => {
    // Don't connect if not authenticated
    if (!isAuthenticated || !user) {
      debugLog('WebSocket: Skipping connection (not authenticated)');
      return;
    }

    // Don't connect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      debugLog('WebSocket: Already connected');
      return;
    }

    // Don't connect if already connecting
    if (useWebSocketStore.getState().isConnecting) {
      debugLog('WebSocket: Already connecting');
      return;
    }

    try {
      setConnecting(true);
      setConnectionError(null);

      // Get access token for authentication
      const token = await getAccessToken();

      if (!token) {
        throw new Error('No access token available');
      }

      // Build WebSocket URL with token
      const wsUrl = `${WS_BASE_URL}${WS_ENDPOINTS.NOTIFICATIONS(token)}`;

      debugLog('WebSocket: Connecting', { url: wsUrl });

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);

      // Set up event handlers
      ws.onopen = () => {
        debugLog('WebSocket: Connection established');
        setConnected(true);
        setConnectionError(null);
        resetReconnectAttempts();

        // Send initial heartbeat
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }

        // Call global connect handler if set
        useWebSocketStore.getState().onConnect?.();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          debugLog('WebSocket: Message received', {
            type: message.type,
            hasData: !!message.data,
          });

          // Update last heartbeat
          updateLastHeartbeat();

          // Handle different message types
          switch (message.type) {
            case 'notification':
              if (message.data) {
                const notification = message.data as Notification;
                addNotification(notification);
                addNotificationToStore(notification);
              }
              break;

            case 'transaction_update':
              if (message.data) {
                const transaction = message.data as Transaction;
                if (transaction.id) {
                  updateTransaction(transaction);
                } else {
                  addTransaction(transaction);
                }
              }
              break;

            case 'pong':
              debugLog('WebSocket: Heartbeat response received');
              break;

            case 'error':
              errorLog('WebSocket: Error message received', message.message);
              setConnectionError(message.message || 'Unknown WebSocket error');
              break;

            default:
              debugLog('WebSocket: Message type', { type: message.type });
          }

          // Call global message handler if set
          useWebSocketStore.getState().onMessage?.(message);

        } catch (error) {
          errorLog('WebSocket: Failed to parse message', error);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        debugLog('WebSocket: Connection closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        setConnected(false);
        setWebSocket(null);

        // Call global disconnect handler if set
        useWebSocketStore.getState().onDisconnect?.();

        // Attempt reconnection if not a clean close or if code indicates error
        if (!event.wasClean || event.code !== 1000) {
          // Schedule reconnect (inline to avoid circular dependency)
          const attempts = reconnectAttempts;

          if (attempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            errorLog('WebSocket: Max reconnection attempts reached');
            setConnectionError('Unable to connect to server. Please refresh the page.');
            return;
          }

          const delay = Math.min(
            WS_CONFIG.RECONNECT_INTERVAL * Math.pow(2, attempts),
            30000
          );

          debugLog('WebSocket: Scheduling reconnection', {
            attempt: attempts + 1,
            delay,
          });

          incrementReconnectAttempts();

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        errorLog('WebSocket: Connection error');
        setConnectionError('WebSocket connection error');
      };

      // Store WebSocket instance
      wsRef.current = ws;
      setWebSocket(ws);

    } catch (error) {
      errorLog('WebSocket: Connection failed', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setConnecting(false);
      
      // Schedule reconnect on error
      const attempts = reconnectAttempts;
      if (attempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          WS_CONFIG.RECONNECT_INTERVAL * Math.pow(2, attempts),
          30000
        );
        incrementReconnectAttempts();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [
    isAuthenticated,
    user,
    setConnecting,
    setConnectionError,
    setWebSocket,
    setConnected,
    resetReconnectAttempts,
    updateLastHeartbeat,
    addNotification,
    addTransaction,
    updateTransaction,
    addNotificationToStore,
    reconnectAttempts,
    incrementReconnectAttempts,
  ]);

  // ---------------------------------------------------------------------------
  // Disconnect WebSocket
  // ---------------------------------------------------------------------------

  const disconnect = useCallback(() => {
    debugLog('WebSocket: Disconnecting');

    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setConnected(false);
    setWebSocket(null);
  }, [setConnected, setWebSocket]);

  // ---------------------------------------------------------------------------
  // Send Heartbeat
  // ---------------------------------------------------------------------------

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      debugLog('WebSocket: Sending heartbeat');
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Effect: Connect on Auth Change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, connect, disconnect]);

  // ---------------------------------------------------------------------------
  // Effect: Heartbeat Interval
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isConnected) {
      debugLog('WebSocket: Starting heartbeat interval', {
        interval: WS_CONFIG.HEARTBEAT_INTERVAL,
      });

      heartbeatIntervalRef.current = setInterval(
        sendHeartbeat,
        WS_CONFIG.HEARTBEAT_INTERVAL
      );
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isConnected, sendHeartbeat]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  debugLog('WebSocketProvider: Rendered', { isConnected });

  return <>{children}</>;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default WebSocketProvider;