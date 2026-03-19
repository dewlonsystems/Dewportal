// =============================================================================
// DEWPORTAL FRONTEND - WEBSOCKET PROVIDER
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
import { useWebSocketStore, selectShouldConnect } from '@/stores/useWebSocketStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { WS_BASE_URL, WS_ENDPOINTS } from '@/lib/api/endpoints';
import { WS_CONFIG } from '@/constants/config';
import { debugLog, errorLog } from '@/lib/utils';
import { WebSocketMessage, Notification, Transaction } from '@/types';
import { getAccessTokenForWSAction } from '@/server-actions/auth';

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps): ReactElement {
  const wsRef                  = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

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
    clearConnectTrigger, // ✅ NEW
  } = useWebSocketStore();

  const { addNotification: addNotificationToStore } = useNotificationStore();

  // ── Subscribe to only what we need ────────────────────────────────────────
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized   = useAuthStore((state) => state.isInitialized);
  const user            = useAuthStore((state) => state.user);
  const shouldConnect   = useWebSocketStore(selectShouldConnect); // ✅ NEW

  // ---------------------------------------------------------------------------
  // Connect
  // ---------------------------------------------------------------------------

  const connect = useCallback(async () => {
    // When triggered by login (shouldConnect), skip the isInitialized check
    // because the user just authenticated — we know the session is valid.
    // For all other cases (e.g. page load), wait for auth to be initialized.
    const triggeredByLogin = useWebSocketStore.getState().shouldConnect;

    if (!triggeredByLogin && !isInitialized) {
      debugLog('WebSocket: Skipping connection (auth not initialized yet)');
      return;
    }

    if (!isAuthenticated || !user) {
      debugLog('WebSocket: Skipping connection (not authenticated)');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      debugLog('WebSocket: Already connected');
      return;
    }

    if (useWebSocketStore.getState().isConnecting) {
      debugLog('WebSocket: Already connecting');
      return;
    }

    try {
      setConnecting(true);
      setConnectionError(null);

      // Fetch token via server action — reads httpOnly cookie server-side
      const { token } = await getAccessTokenForWSAction();

      if (!token) {
        throw new Error('No access token available');
      }

      const wsUrl = `${WS_BASE_URL}${WS_ENDPOINTS.NOTIFICATIONS(token)}`;
      debugLog('WebSocket: Connecting');

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        debugLog('WebSocket: Connection established');
        setConnected(true);
        setConnectionError(null);
        resetReconnectAttempts();

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }

        useWebSocketStore.getState().onConnect?.();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          debugLog('WebSocket: Message received', { type: message.type });
          updateLastHeartbeat();

          switch (message.type) {
            case 'notification':
              if (message.data) {
                const notification = message.data as Notification;
                addNotification(notification);
                addNotificationToStore(notification);
              }
              break;

            case 'payment_status_update':
            case 'transaction_update':
              if (message.data) {
                const transaction = message.data as Transaction;
                if (transaction.id) updateTransaction(transaction);
                else addTransaction(transaction);
              }
              break;

            case 'pong':
              debugLog('WebSocket: Heartbeat pong received');
              break;

            case 'error':
              errorLog('WebSocket: Server error message', message.message);
              setConnectionError(message.message || 'Unknown WebSocket error');
              break;

            default:
              debugLog('WebSocket: Unhandled message type', { type: message.type });
          }

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
        useWebSocketStore.getState().onDisconnect?.();

        // Reconnect unless it was a clean intentional close
        if (!event.wasClean || event.code !== 1000) {
          const attempts = reconnectAttempts;

          if (attempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            errorLog('WebSocket: Max reconnection attempts reached');
            setConnectionError('Unable to connect. Please refresh the page.');
            return;
          }

          const delay = Math.min(
            WS_CONFIG.RECONNECT_INTERVAL * Math.pow(2, attempts),
            30000
          );

          debugLog('WebSocket: Scheduling reconnect', { attempt: attempts + 1, delay });
          incrementReconnectAttempts();

          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };

      ws.onerror = () => {
        // onerror always fires before onclose — just log, let onclose handle reconnect
        errorLog('WebSocket: Socket error event');
      };

      wsRef.current = ws;
      setWebSocket(ws);

    } catch (error) {
      errorLog('WebSocket: Connection failed', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setConnecting(false);

      const attempts = reconnectAttempts;
      if (attempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          WS_CONFIG.RECONNECT_INTERVAL * Math.pow(2, attempts),
          30000
        );
        incrementReconnectAttempts();
        reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
      }
    }
  }, [
    isAuthenticated,
    isInitialized,
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
  // Disconnect
  // ---------------------------------------------------------------------------

  const disconnect = useCallback(() => {
    debugLog('WebSocket: Disconnecting');

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setConnected(false);
    setWebSocket(null);
  }, [setConnected, setWebSocket]);

  // ---------------------------------------------------------------------------
  // Heartbeat
  // ---------------------------------------------------------------------------

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Effect: Connect on page load when auth state is ready
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isInitialized && isAuthenticated && user) {
      connect();
    } else if (!isAuthenticated) {
      disconnect();
    }

    return () => { disconnect(); };
  }, [isInitialized, isAuthenticated, user, connect, disconnect]);

  // ---------------------------------------------------------------------------
  // ✅ NEW Effect: Connect immediately when LoginForm triggers shouldConnect.
  // This fires as soon as login() succeeds — before the dashboard even mounts,
  // so the WebSocket is already open by the time the user sees the dashboard.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!shouldConnect) return;

    debugLog('WebSocket: Post-login connect triggered');
    clearConnectTrigger(); // clear the flag first to avoid double-firing
    connect();
  }, [shouldConnect, connect, clearConnectTrigger]);

  // ---------------------------------------------------------------------------
  // Effect: Heartbeat
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isConnected) {
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

  return <>{children}</>;
}

export default WebSocketProvider;
