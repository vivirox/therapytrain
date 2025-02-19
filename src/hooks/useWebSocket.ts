import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from "./useAuth";

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'stalled';

interface UseWebSocketReturn {
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent | null;
  connectionStatus: ConnectionStatus;
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const { user, getToken } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const heartbeatTimeout = useRef<NodeJS.Timeout>();
  const stallTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const lastMessageTime = useRef<number>(Date.now());
  
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const heartbeatInterval = 15000; // 15 seconds
  const stallThreshold = 45000; // 45 seconds without messages
  
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (heartbeatTimeout.current) {
      clearTimeout(heartbeatTimeout.current);
    }
    if (stallTimeout.current) {
      clearTimeout(stallTimeout.current);
    }
  }, []);

  const checkStall = useCallback(() => {
    const timeSinceLastMessage = Date.now() - lastMessageTime.current;
    if (timeSinceLastMessage > stallThreshold && connectionStatus === 'connected') {
      setConnectionStatus('stalled');
      ws.current?.close();
    }
  }, [connectionStatus]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeout.current) {
      clearTimeout(heartbeatTimeout.current);
    }
    
    heartbeatTimeout.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
        stallTimeout.current = setTimeout(checkStall, stallThreshold);
      }
    }, heartbeatInterval);
  }, [checkStall]);

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
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        lastMessageTime.current = Date.now();
        startHeartbeat();
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        clearTimeouts();
        scheduleReconnect();
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.current?.close();
      };

      ws.current.onmessage = (event) => {
        setLastMessage(event);
        lastMessageTime.current = Date.now();
        
        // Reset stall detection on any message
        if (stallTimeout.current) {
          clearTimeout(stallTimeout.current);
          stallTimeout.current = setTimeout(checkStall, stallThreshold);
        }

        // Handle pong messages
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            lastMessageTime.current = Date.now();
          }
        } catch (e) {
          // Ignore parse errors for non-JSON messages
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      scheduleReconnect();
    }
  }, [url, getToken, startHeartbeat, checkStall]);

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

    setConnectionStatus('reconnecting');
    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
      lastMessageTime.current = Date.now();
    } else {
      console.error('WebSocket is not connected');
      if (connectionStatus === 'connected') {
        setConnectionStatus('stalled');
        scheduleReconnect();
      }
    }
  }, [connectionStatus, scheduleReconnect]);

  // Connect on mount or when URL/user changes
  useEffect(() => {
    if (user) {
      connect();
    }
    return () => {
      clearTimeouts();
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect, user, clearTimeouts]);

  return {
    sendMessage,
    lastMessage,
    connectionStatus,
  };
}; 