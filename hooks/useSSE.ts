import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSSEOptions {
  userId: string;
  threadId: string;
  onMessage?: (data: any) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  retryLimit?: number;
  retryInterval?: number;
}

interface SSEState {
  connected: boolean;
  error: Error | null;
  retryCount: number;
}

export function useSSE({
  userId,
  threadId,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  retryLimit = 5,
  retryInterval = 1000,
}: UseSSEOptions) {
  const [state, setState] = useState<SSEState>({
    connected: false,
    error: null,
    retryCount: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL('/api/chat', window.location.origin);
    url.searchParams.set('userId', userId);
    url.searchParams.set('threadId', threadId);

    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      setState(prev => ({ ...prev, connected: true, error: null }));
      onConnect?.();
    };

    eventSource.onerror = (error) => {
      const errorObj = new Error('SSE connection error');
      setState(prev => ({
        ...prev,
        connected: false,
        error: errorObj,
        retryCount: prev.retryCount + 1,
      }));

      eventSource.close();
      onError?.(errorObj);

      if (state.retryCount < retryLimit) {
        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, retryInterval * Math.pow(2, state.retryCount)); // Exponential backoff
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    // Handle different event types
    eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        console.log('Connected to SSE:', data);
      } catch (error) {
        console.error('Error parsing connected event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setState(prev => ({ ...prev, connected: true }));
      } catch (error) {
        console.error('Error parsing heartbeat event:', error);
      }
    });

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onMessage?.(data);
      } catch (error) {
        console.error('Error parsing message event:', error);
      }
    });

    eventSourceRef.current = eventSource;
  }, [userId, threadId, onMessage, onError, onConnect, retryLimit, retryInterval, state.retryCount]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        onDisconnect?.();
      }
    };
  }, [connect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setState(prev => ({ ...prev, connected: false }));
      onDisconnect?.();
    }
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    setState(prev => ({ ...prev, retryCount: 0 }));
    connect();
  }, [connect]);

  return {
    connected: state.connected,
    error: state.error,
    disconnect,
    reconnect,
  };
} 