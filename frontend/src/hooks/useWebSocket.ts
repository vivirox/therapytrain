import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

type ConnectionStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Reconnecting';

interface UseWebSocketReturn {
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent | null;
  connectionStatus: ConnectionStatus;
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Connecting');
  const { user, getToken } = useAuth();
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(async () => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const wsUrl = new URL(url);
      wsUrl.searchParams.set('token', token);
      
      ws.current = new WebSocket(wsUrl.toString());

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('Disconnected');
        scheduleReconnect();
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.current?.close();
      };

      ws.current.onmessage = (event) => {
        setLastMessage(event);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      scheduleReconnect();
    }
  }, [url, getToken]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    const delay = Math.min(
      baseReconnectDelay * Math.pow(2, reconnectAttempts.current),
      30000 // Max 30 seconds
    );

    setConnectionStatus('Reconnecting');
    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.error('WebSocket is not connected');
      // Optionally queue messages to be sent when connection is restored
    }
  }, []);

  // Connect on mount or when URL/user changes
  useEffect(() => {
    if (user) {
      connect();
    }
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect, user]);

  // Implement heartbeat to detect connection issues
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeat);
  }, []);

  return {
    sendMessage,
    lastMessage,
    connectionStatus,
  };
};
